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
        await this.tick();
      } catch (error) {
        console.error(`Error in strategy ${this.id}:`, error);
      }
      await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second tick
    }
  }

  protected logOrder(order: any) {
    db.prepare('INSERT INTO orders (id, bot_id, symbol, side, price, size, status) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(order.id, this.id, order.symbol, order.side, order.price, order.size, 'NEW');
  }
}
