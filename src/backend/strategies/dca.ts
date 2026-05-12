import { BaseStrategy } from './base.ts';

export class DCAStrategy extends BaseStrategy {
  private lastTradeTime: number = 0;

  async tick() {
    const { intervalMinutes, sizeUsd } = this.config;
    const now = Date.now();
    
    if (now - this.lastTradeTime > intervalMinutes * 60 * 1000) {
      const price = await this.client.getMarketPrice(this.symbol);
      console.log(`[DCA ${this.symbol}] Buying ${sizeUsd} USD worth at ${price}`);
      
      const order = {
        symbol: this.symbol,
        isBuy: true,
        price,
        size: sizeUsd / price,
        reduceOnly: false
      };

      const result = await this.client.placeOrder(order);
      if (result.status === 'ok') {
        this.lastTradeTime = now;
        this.logOrder({
          id: Math.random().toString(36).substring(7),
          symbol: this.symbol,
          side: 'BUY',
          price,
          size: order.size
        });
      }
    }
  }
}
