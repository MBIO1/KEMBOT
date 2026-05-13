import { BaseStrategy } from './base.ts';

export class GridStrategy extends BaseStrategy {
  private lastRefPrice: number = 0;
  private activeOrders: string[] = [];

  async stop() {
    console.log(`[Grid ${this.symbol}] Stopping strategy and cleaning up orders...`);
    await this.cancelGridOrders();
    await super.stop();
  }

  private async cancelGridOrders() {
    if (this.activeOrders.length === 0) return;
    
    console.log(`[Grid ${this.symbol}] Cancelling ${this.activeOrders.length} active orders...`);
    for (const oid of this.activeOrders) {
      try {
        await this.client.cancelOrder(this.symbol, oid);
      } catch (error) {
        console.error(`[Grid ${this.symbol}] Failed to cancel order ${oid}:`, error);
      }
    }
    this.activeOrders = [];
  }

  async tick() {
    const price = await this.client.getMarketPrice(this.symbol);
    const atr = this.riskManager?.getATR(this.symbol) || 0;
    const volatilityRatio = atr / price;
    
    // 1. Dynamic Range Detection & Support
    let { upperPrice, lowerPrice, numGrids, sizePerGrid } = this.config;
    
    // If range is not set or invalid, use ATR to establish a smarter range
    if (!upperPrice || !lowerPrice || upperPrice <= lowerPrice) {
      // Use 10x ATR for a tighter but reactive grid range
      const spread = atr * 10; 
      upperPrice = price + (spread / 2);
      lowerPrice = price - (spread / 2);
      console.log(`[Grid ${this.symbol}] Dynamic ATR Range established: [${lowerPrice.toFixed(2)} - ${upperPrice.toFixed(2)}] (ATR: ${atr.toFixed(4)})`);
    }

    if (this.reduceOnly) {
      return;
    }

    // 2. Volatility Filter & Adaptive Scaling
    // We adjust the grid interval based on current ATR vs a baseline
    const baseVolatility = 0.0005; // 5bps per sec expected baseline
    
    // Grid Spacing Aggression:
    // When volatility is high, we widen the gaps to avoid "chopping" through all levels instantly.
    // When low, we tighten to capture small micro-moves.
    const intervalMultiplier = Math.min(4.0, Math.max(0.5, volatilityRatio / baseVolatility));
    
    const baseInterval = (upperPrice - lowerPrice) / (numGrids || 10);
    const gridInterval = baseInterval * intervalMultiplier;

    // Adaptive Size:
    // Scale size up slightly when volatility is low (more confidence in range)
    // Scale size down when volatility is high (risk mitigation)
    const sizeMultiplier = Math.max(0.2, Math.min(1.5, baseVolatility / volatilityRatio));
    const adaptiveSize = (sizePerGrid || 0.1) * sizeMultiplier;

    console.log(`[Grid ${this.symbol}] Tick Analytics: Dist to last ref: ${Math.abs(price - this.lastRefPrice).toFixed(2)}. Current Interval Req: ${gridInterval.toFixed(2)}. Adaptive Size: ${adaptiveSize.toFixed(4)}.`);

    // 3. Significant range exit check (e.g. 15% outside boundaries)
    const gridBreadth = upperPrice - lowerPrice;
    const outOfRangeBuffer = gridBreadth * 0.15;
    if (price > upperPrice + outOfRangeBuffer || price < lowerPrice - outOfRangeBuffer) {
      if (this.activeOrders.length > 0) {
        console.warn(`[Grid ${this.symbol}] Price significantly out of range (${price.toFixed(2)} vs [${lowerPrice}, ${upperPrice}]). Purging stale orders.`);
        await this.cancelGridOrders();
      }
    }

    if (price > upperPrice || price < lowerPrice) {
      console.log(`[Grid ${this.symbol}] Price ${price} out of range [${lowerPrice}, ${upperPrice}]`);
      return;
    }

    if (this.lastRefPrice === 0) {
      this.lastRefPrice = price;
      console.log(`[Grid ${this.symbol}] Initialized at ${price} (Adaptive Interval: ${gridInterval.toFixed(2)})`);
      return;
    }

    const diff = price - this.lastRefPrice;

    if (Math.abs(diff) >= gridInterval) {
      // Calculate how many grid levels were crossed
      const levelsCrossed = Math.floor(Math.abs(diff) / gridInterval);
      const isBuy = diff < 0;
      
      console.log(`[Grid ${this.symbol}] Price moved ${diff.toFixed(2)} (${levelsCrossed} adaptive levels @ ${gridInterval.toFixed(2)}). Executing ${isBuy ? 'BUY' : 'SELL'} sequence.`);

      for (let i = 0; i < levelsCrossed; i++) {
        // Calculate the theoretical grid level price
        const targetPrice = this.lastRefPrice + (isBuy ? -gridInterval * (i + 1) : gridInterval * (i + 1));
        
        const order = {
          symbol: this.symbol,
          isBuy,
          price: targetPrice,
          size: adaptiveSize,
          reduceOnly: false
        };

        const result = await this.client.placeOrder(order);
        if (result.status === 'ok') {
          const hlOrderId = result.response?.data?.oid;
          const initialStatus = result.response?.data?.status === 'filled' ? 'FILLED' : 'NEW';
          
          if (hlOrderId && initialStatus === 'NEW') {
            this.activeOrders.push(hlOrderId.toString());
          }
          
          this.logOrder({
            id: Math.random().toString(36).substring(7),
            symbol: this.symbol,
            side: isBuy ? 'BUY' : 'SELL',
            price: targetPrice,
            size: order.size,
            hl_order_id: hlOrderId,
            status: initialStatus,
            gridLevel: i + 1
          });
        } else {
          console.error(`[Grid ${this.symbol}] Order failed at level ${i + 1}: ${result.message}`);
          break; // Stop if we hit a limit/error
        }
      }

      // Update ref price to the last executed grid level
      this.lastRefPrice = this.lastRefPrice + (isBuy ? -levelsCrossed * gridInterval : levelsCrossed * gridInterval);
    }
  }
}
