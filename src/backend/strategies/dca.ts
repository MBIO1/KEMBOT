import { BaseStrategy } from './BaseStrategy';
import { HyperliquidClient } from '../exchange/hyperliquidClient';

export class DCAStrategy extends BaseStrategy {
  private config: any;

  constructor(client: HyperliquidClient, symbol: string) {
    super(client, symbol);
  }

  start(config: any) {
    this.config = config;
    this.status = 'RUNNING';
    console.log(`[DCA ${this.symbol}] Started with config`, config);
  }

  stop() {
    this.status = 'STOPPED';
    console.log(`[DCA ${this.symbol}] Stopped`);
  }

  async tick(currentPrice: number) {
    if (this.status !== 'RUNNING') return;
    
    const now = Date.now();
    // Simplified interval logic
    const intervalMs = 60 * 1000; // 1 min for demo instead of real interval
    
    if (now - this.lastTradeTime > intervalMs) {
      const notionalUsd = Number(this.config.amount || 100);
      const size = notionalUsd / currentPrice;
      const order = { symbol: this.symbol, isBuy: true, price: currentPrice, size, reduceOnly: false as const, tif: 'Ioc' as const };
      const result = await this.client.placeOrder(order);
      if (result.status === 'ok') {
        this.lastTradeTime = now;
        const firstStatus = result.response?.data?.statuses?.[0] ?? {};
        const hlOrderId = firstStatus.resting?.oid ?? firstStatus.filled?.oid;
        const initialStatus = firstStatus.filled !== undefined ? 'FILLED' : 'NEW';

        console.log(`[DCA ${this.symbol}] Order placed: ${notionalUsd} USD @ ${currentPrice}`);
        if (hlOrderId) {
            this.activeOrders.push(hlOrderId.toString());
        }
      }
    }
  }
}
