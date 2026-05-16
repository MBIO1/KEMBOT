import { BaseStrategy } from './BaseStrategy';
import { HyperliquidClient } from '../exchange/hyperliquidClient';

export class GridStrategy extends BaseStrategy {
  private config: any;

  constructor(client: HyperliquidClient, symbol: string) {
    super(client, symbol);
  }

  start(config: any) {
    this.config = config;
    this.status = 'RUNNING';
    console.log(`[Grid ${this.symbol}] Started with config`, config);
  }

  stop() {
    this.status = 'STOPPED';
    console.log(`[Grid ${this.symbol}] Stopped`);
  }

  async tick(currentPrice: number) {
    if (this.status !== 'RUNNING') return;
    
    const now = Date.now();
    const intervalMs = 60 * 1000;
    
    if (now - this.lastTradeTime > intervalMs) {
      const order = { symbol: this.symbol, price: currentPrice, size: this.config.size || 50 };
      const result = await this.client.placeOrder(order);
      if (result.status === 'ok') {
        const firstStatus = result.response?.data?.statuses?.[0] ?? {};
        const hlOrderId = firstStatus.resting?.oid ?? firstStatus.filled?.oid;
        const initialStatus = firstStatus.filled !== undefined ? 'FILLED' : 'NEW';

        if (hlOrderId !== undefined && initialStatus === 'NEW') {
          this.activeOrders.push(hlOrderId.toString());
        }
        this.lastTradeTime = now;
      }
    }
  }
}
