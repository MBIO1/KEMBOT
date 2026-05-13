import { HyperliquidClient } from '../exchange/hyperliquidClient.ts';
import { RiskEngine } from '../risk/riskEngine.ts';
import { RiskManager } from '../risk/riskManager.ts';
import db from '../db/session.ts';

export abstract class BaseStrategy {
  protected id: string;
  protected symbol: string;
  protected config: any;
  protected client: HyperliquidClient;
  protected riskEngine: RiskEngine;
  protected riskManager?: RiskManager;
  protected isRunning: boolean = false;
  protected reduceOnly: boolean = false;
  protected consecutiveErrors: number = 0;
  protected readonly MAX_CONSECUTIVE_ERRORS: number = 10;
  protected readonly BASE_TICK_MS: number = 1000;

  constructor(id: string, symbol: string, config: any, riskManager?: RiskManager) {
    this.id = id;
    this.symbol = symbol;
    this.config = config;
    this.riskManager = riskManager;
    this.client = new HyperliquidClient();
    this.riskEngine = new RiskEngine({
      maxLeverage: 3,
      maxPositionSize: 1000,
      maxDailyLoss: 100,
      maxOpenOrders: 5,
      maxExposurePerCoin: 0.5
    });
  }

  abstract tick(): Promise<void>;

  async checkExits(currentPrice: number) {
    if (!this.config.tp && !this.config.sl) return;

    try {
      const state = await this.client.getAccountState();
      const position = state.assetPositions?.find((p: any) => p.position.coin === this.symbol);
      
      if (position) {
        const entryPrice = parseFloat(position.position.entryPx);
        const isLong = parseFloat(position.position.szi) > 0;
        
        // Safety: skip if prices are invalid
        if (entryPrice <= 0 || currentPrice <= 0) return;

        const pnlPct = isLong 
          ? ((currentPrice - entryPrice) / entryPrice) * 100
          : ((entryPrice - currentPrice) / entryPrice) * 100;

        const tp = this.config.tp ? parseFloat(this.config.tp) : null;
        const sl = this.config.sl ? parseFloat(this.config.sl) : null;

        if (tp && pnlPct >= tp) {
          console.log(`[${this.id}] TP Triggered: ${pnlPct.toFixed(2)}% > ${tp}%`);
          await this.closePosition(position);
          await this.stop();
        } else if (sl && pnlPct <= -sl) {
          console.log(`[${this.id}] SL Triggered: ${pnlPct.toFixed(2)}% < -${sl}%`);
          await this.closePosition(position);
          await this.stop();
        }
      }
    } catch (error) {
      console.error(`Exit check failed for ${this.id}:`, error);
    }
  }

  async closePosition(position: any) {
    const size = Math.abs(parseFloat(position.position.szi));
    const isBuy = parseFloat(position.position.szi) < 0;
    
    console.log(`Closing position for ${this.symbol}: ${size} @ MARKET`);
    
    await this.client.placeOrder({
      symbol: this.symbol,
      isBuy,
      price: await this.client.getMarketPrice(this.symbol),
      size,
      reduceOnly: true
    });
  }

  async start() {
    this.isRunning = true;
    console.log(`Starting strategy ${this.id} on ${this.symbol}`);
    this.runLoop();
  }

  async stop() {
    this.isRunning = false;
    console.log(`Stopping strategy ${this.id}`);
    if (this.id !== 'backtest') {
      db.prepare('UPDATE bots SET status = ? WHERE id = ?').run('STOPPED', this.id);
    }
  }

  setReduceOnly(enabled: boolean) {
    this.reduceOnly = enabled;
    console.log(`[${this.id}] Reduce-only mode: ${enabled}`);
  }

  private async runLoop() {
    this.consecutiveErrors = 0;
    
    while (this.isRunning) {
      try {
        const price = await this.client.getMarketPrice(this.symbol);
        
        if (this.riskManager) {
          this.riskManager.updatePrice(this.symbol, price);
        }
        
        await this.checkExits(price);
        await this.tick();
        
        // Reset consecutive errors on success
        if (this.consecutiveErrors > 0) {
          console.log(`[${this.id}] Recovered after ${this.consecutiveErrors} errors.`);
          this.consecutiveErrors = 0;
        }
      } catch (error: any) {
        this.consecutiveErrors++;
        const isRateLimit = error.response?.status === 429;
        const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
        
        let waitTime = this.BASE_TICK_MS;
        
        if (isRateLimit) {
          console.warn(`[${this.id}] Rate limit hit (429). Backing off...`);
          waitTime = Math.min(5000 * Math.pow(2, this.consecutiveErrors - 1), 60000);
        } else if (isTimeout) {
          console.warn(`[${this.id}] Request timeout. Retry attempt ${this.consecutiveErrors}/${this.MAX_CONSECUTIVE_ERRORS}`);
          waitTime = 2000;
        } else {
          console.error(`[${this.id}] Strategy error (${this.consecutiveErrors}/${this.MAX_CONSECUTIVE_ERRORS}):`, error.message || error);
          // Standard backoff for unknown errors
          waitTime = Math.min(1000 * Math.pow(1.5, this.consecutiveErrors - 1), 30000);
        }

        if (this.consecutiveErrors >= this.MAX_CONSECUTIVE_ERRORS) {
          console.error(`[${this.id}] !!! CRITICAL: Maximum consecutive errors reached. Emergency shutdown triggered. !!!`);
          await this.stop();
          break;
        }

        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue; // Skip the standard sleep and try again
      }
      
      await new Promise(resolve => setTimeout(resolve, this.BASE_TICK_MS));
    }
  }

  protected logOrder(order: any) {
    if (this.id === 'backtest') {
      console.log(`[Backtest] Order: ${order.side} ${order.size} ${this.symbol} @ ${order.price}`);
      return;
    }
    const status = order.status || 'NEW';
    db.prepare('INSERT INTO orders (id, bot_id, symbol, side, price, size, status, hl_order_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(order.id, this.id, order.symbol, order.side, order.price, order.size, status, order.hl_order_id);
  }
}
