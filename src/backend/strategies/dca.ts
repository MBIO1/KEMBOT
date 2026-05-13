import { BaseStrategy } from './base.ts';

export class DCAStrategy extends BaseStrategy {
  private lastTradeTime: number = 0;

  async tick() {
    if (this.reduceOnly) return;
    
    const { intervalMinutes, sizeUsd } = this.config;
    const now = Date.now();
    
    // Execute if: First time (lastTradeTime = 0) OR interval has passed
    if (this.lastTradeTime === 0 || (now - this.lastTradeTime > intervalMinutes * 60 * 1000)) {
      const price = await this.client.getMarketPrice(this.symbol);
      
      // Dynamic Sizing Logic
      let dynamicSizeUsd = sizeUsd;
      
      // 1. Scalability based on Equity & Available Margin
      try {
        const state = await this.client.getAccountState();
        const accountValue = parseFloat(state.crossMarginSummary?.accountValue || "0");
        const withdrawable = parseFloat(state.withdrawable || "0");
        
        // Aggressive scaling if we have significant withdrawable margin
        const marginFactor = Math.min(3.0, 1 + (withdrawable / 5000)); // Boost size by 100% for every $5k margin, capped at 3x
        dynamicSizeUsd *= marginFactor;

        // Cumulative Equity Boost
        if (accountValue > 10000) {
          const equityBoost = 1 + (Math.floor((accountValue - 10000) / 5000) * 0.15); // +15% per $5k above $10k
          dynamicSizeUsd *= Math.min(2.0, equityBoost);
        }
      } catch (e) {
        console.warn(`[DCA ${this.symbol}] Could not fetch account state for aggressive sizing, using base size.`);
      }

      // 2. Volatility (ATR) Aggression
      // We want to be MORE aggressive when volatility is high but under control, 
      // as it might indicate a major dip/opportunity for DCA.
      const regime = this.riskManager?.getMarketRegime(this.symbol);
      const ratio = regime?.ratio || 0;
      
      if (regime?.regime === 'EXTREME') {
        // Still scale down during extreme terror to preserve margin
        console.warn(`[DCA ${this.symbol}] Extreme volatility (${(ratio * 100).toFixed(4)}%). Defensive sizing (50%).`);
        dynamicSizeUsd *= 0.5;
      } else if (regime?.regime === 'VOLATILE') {
        // Be more aggressive in high volatility as long as it's not EXTREME
        console.log(`[DCA ${this.symbol}] Volatile market. Opportunity detected. Increasing size by 25%.`);
        dynamicSizeUsd *= 1.25;
      } else {
        // Normal or Low volatility
        dynamicSizeUsd *= 1.0;
      }

      console.log(`[DCA ${this.symbol}] Execution Trigger. Price: ${price}. Base: ${sizeUsd} USD -> Aggressive Total: ${dynamicSizeUsd.toFixed(2)} USD.`);
      
      // Calculate size with precision handling
      let size = dynamicSizeUsd / price;
      
      // Round to 4 decimal places as a general heuristic for major Hyperliquid assets
      size = Math.round(size * 10000) / 10000;

      if (size <= 0) {
        console.error(`[DCA ${this.symbol}] Calculated size is 0. Check sizeUsd and price.`);
        return;
      }

      const order = {
        symbol: this.symbol,
        isBuy: true,
        price,
        size,
        reduceOnly: false
      };

      const result = await this.client.placeOrder(order);
      if (result.status === 'ok') {
        this.lastTradeTime = now;
        const hlOrderId = result.response?.data?.oid;
        const initialStatus = result.response?.data?.status === 'filled' ? 'FILLED' : 'NEW';
        
        console.log(`[DCA ${this.symbol}] Order placed: ${size} ${this.symbol} @ ${price}`);
        
        this.logOrder({
          id: Math.random().toString(36).substring(7),
          symbol: this.symbol,
          side: 'BUY',
          price,
          size,
          hl_order_id: hlOrderId,
          status: initialStatus
        });
      } else {
        console.error(`[DCA ${this.symbol}] Execution failed: ${result.message}`);
      }
    }
  }
}
