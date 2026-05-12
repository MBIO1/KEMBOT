import { HyperliquidClient } from '../exchange/hyperliquidClient.ts';
import { RiskEngine } from '../risk/riskEngine.ts';
import db from '../db/session.ts';

export abstract class BaseStrategy {
  protected id: string;
  protected symbol: string;
  protected config: any;
  protected client: HyperliquidClient;
  protected riskEngine: RiskEngine;
  protected isRunning: boolean = false;

  constructor(id: string, symbol: string, config: any) {
    this.id = id;
    this.symbol = symbol;
    this.config = config;
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

  async checkExits() {
    if (!this.config.tp && !this.config.sl) return;

    try {
      const state = await this.client.getAccountState();
      const position = state.assetPositions?.find((p: any) => p.position.coin === this.symbol);
      
      if (position) {
        const entryPrice = parseFloat(position.position.entryPx);
        const currentPrice = await this.client.getMarketPrice(this.symbol);
        const isLong = parseFloat(position.position.szi) > 0;
        
        const pnlPct = isLong 
          ? ((currentPrice - entryPrice) / entryPrice) * 100
          : ((entryPrice - currentPrice) / entryPrice) * 100;

        if (this.config.tp && pnlPct >= parseFloat(this.config.tp)) {
          console.log(`[${this.id}] TP Triggered: ${pnlPct.toFixed(2)}% > ${this.config.tp}%`);
          await this.closePosition(position);
        } else if (this.config.sl && pnlPct <= -parseFloat(this.config.sl)) {
          console.log(`[${this.id}] SL Triggered: ${pnlPct.toFixed(2)}% < -${this.config.sl}%`);
          await this.closePosition(position);
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
  }

  private async runLoop() {
    while (this.isRunning) {
      try {
        await this.checkExits();
        await this.tick();
      } catch (error) {
        console.error(`Error in strategy ${this.id}:`, error);
      }
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second tick
    }
  }

  protected logOrder(order: any) {
    db.prepare('INSERT INTO orders (id, bot_id, symbol, side, price, size, status) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(order.id, this.id, order.symbol, order.side, order.price, order.size, 'NEW');
  }
}
