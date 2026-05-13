import { BaseStrategy } from './base.ts';

export class GridStrategy extends BaseStrategy {
  private lastRefPrice: number = 0;

  async tick() {
    const price = await this.client.getMarketPrice(this.symbol);
    const { upperPrice, lowerPrice, numGrids, sizePerGrid } = this.config;

    if (price > upperPrice || price < lowerPrice) {
      console.log(`[Grid ${this.symbol}] Price ${price} out of range [${lowerPrice}, ${upperPrice}]`);
      return;
    }

    if (this.lastRefPrice === 0) {
      this.lastRefPrice = price;
      console.log(`[Grid ${this.symbol}] Initialized at ${price}`);
      return;
    }

    const gridInterval = (upperPrice - lowerPrice) / numGrids;
    const diff = price - this.lastRefPrice;

    if (Math.abs(diff) >= gridInterval) {
      const isBuy = diff < 0; // Price dropped -> Buy
      console.log(`[Grid ${this.symbol}] Crossing grid boundary. ${isBuy ? 'BUY' : 'SELL'} @ ${price}`);

      const order = {
        symbol: this.symbol,
        isBuy,
        price,
        size: sizePerGrid,
        reduceOnly: false,
      };

      const result = await this.safePlaceOrder(order);
      if (result?.status === 'ok') {
        this.lastRefPrice = price;
        this.logOrder({
          id: Math.random().toString(36).substring(7),
          symbol: this.symbol,
          side: isBuy ? 'BUY' : 'SELL',
          price,
          size: order.size,
        });
      }
    }
  }
}
