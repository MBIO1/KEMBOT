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
      maxExposurePerCoin: 0.5,
    });
  }

  abstract tick(): Promise<void>;

  protected async getOpenOrderCount() {
    const row = db.prepare('SELECT COUNT(*) as count FROM orders WHERE bot_id = ? AND status = ?').get(this.id, 'NEW');
    return (row?.count || 0) as number;
  }

  protected async checkRiskState() {
    const state = await this.client.getAccountState();
    const accountValue = this.client.getAccountEquity(state);
    const positions = state.assetPositions || [];
    const result = this.riskEngine.validateDailyLoss(positions, accountValue);

    if (!result.allowed) {
      this.logRisk(result.reason || 'Risk threshold exceeded', result.killSwitch ? 'CRITICAL' : 'WARNING');
      if (result.killSwitch) {
        await this.stop();
      }
      return false;
    }

    return true;
  }

  protected async safePlaceOrder(order: any) {
    if (RiskEngine.isGlobalKillSwitchActive() && !order.reduceOnly) {
      throw new Error('Global kill switch is active. No new orders can be placed.');
    }

    if (order.reduceOnly) {
      return this.client.placeOrder(order);
    }

    const state = await this.client.getAccountState();
    const accountValue = this.client.getAccountEquity(state);
    const positions = state.assetPositions || [];
    const openOrders = await this.getOpenOrderCount();
    const riskResult = await this.riskEngine.validateOrder(order, positions, accountValue, openOrders);

    if (!riskResult.allowed) {
      this.logRisk(riskResult.reason || 'Order rejected by risk engine', riskResult.killSwitch ? 'CRITICAL' : 'WARNING');
      if (riskResult.killSwitch) {
        await this.stop();
      }
      throw new Error(`Order blocked: ${riskResult.reason}`);
    }

    const result = await this.client.placeOrder(order);
    return result;
  }

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
          console.log(`[${this.id}] TP Triggered: ${pnlPct.toFixed(2)}% >= ${this.config.tp}%`);
          await this.closePosition(position);
        } else if (this.config.sl && pnlPct <= -parseFloat(this.config.sl)) {
          console.log(`[${this.id}] SL Triggered: ${pnlPct.toFixed(2)}% <= -${this.config.sl}%`);
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
      reduceOnly: true,
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
      if (RiskEngine.isGlobalKillSwitchActive()) {
        console.warn(`[${this.id}] Global kill switch active, exiting strategy loop`);
        await this.stop();
        break;
      }

      try {
        const ok = await this.checkRiskState();
        if (!ok) break;
        await this.checkExits();
        await this.tick();
      } catch (error) {
        console.error(`Error in strategy ${this.id}:`, error);
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  protected logOrder(order: any) {
    db.prepare('INSERT INTO orders (id, bot_id, symbol, side, price, size, status) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(order.id, this.id, order.symbol, order.side, order.price, order.size, 'NEW');
  }

  protected logRisk(reason: string, severity: string = 'ERROR') {
    this.riskEngine.logRiskEvent('RISK', `Bot ${this.id}: ${reason}`, severity);
  }
}
