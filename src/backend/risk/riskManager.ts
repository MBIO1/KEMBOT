import { HyperliquidClient } from '../exchange/hyperliquidClient.ts';

export class RiskManager {
  private client: HyperliquidClient;
  private maxDrawdown = 0.05; // 5%
  private initialEquity: number = 0;
  private currentEquity: number = 0;
  private isBreakerTriggered = false;
  private priceHistory: Map<string, number[]> = new Map();

  // New Risk Limits
  private leverageLimit = 5.0;
  private maxPositionSizeUsd = 10000;
  private dailyLossLimitUsd = 500;

  constructor(client: HyperliquidClient, maxDrawdown: number = 0.05) {
    this.client = client;
    this.maxDrawdown = maxDrawdown;
  }

  getStatus() {
    const drawdownAmount = this.initialEquity > 0 ? Math.max(0, this.initialEquity - this.currentEquity) : 0;
    const drawdownPercent = this.initialEquity > 0 ? (drawdownAmount / this.initialEquity) : 0;

    return {
      triggered: this.isBreakerTriggered,
      maxDrawdown: this.maxDrawdown,
      initialEquity: this.initialEquity,
      currentEquity: this.currentEquity,
      currentDrawdown: drawdownPercent,
      drawdownAmount: drawdownAmount,
      limits: {
        leverage: this.leverageLimit,
        maxPositionSizeUsd: this.maxPositionSizeUsd,
        dailyLossLimitUsd: this.dailyLossLimitUsd
      }
    };
  }

  async checkDrawdown() {
    if (this.isBreakerTriggered) return true;

    try {
      const state = await this.client.getAccountState();
      this.currentEquity = parseFloat(state.crossMarginSummary?.accountValue || state.withdrawable || "0");

      if (this.initialEquity === 0 && this.currentEquity > 0) {
        this.initialEquity = this.currentEquity;
        return false;
      }
      
      if (this.initialEquity === 0) return false;

      const drawdown = (this.initialEquity - this.currentEquity) / this.initialEquity;
      if (drawdown >= this.maxDrawdown) {
        console.error(`!!! CIRCUIT BREAKER TRIGGERED !!! Drawdown: ${(drawdown * 100).toFixed(2)}%`);
        this.isBreakerTriggered = true;
        return true;
      }
    } catch (error) {
      console.error('Risk check failed:', error);
    }
    return false;
  }

  updatePrice(symbol: string, price: number) {
    let history = this.priceHistory.get(symbol) || [];
    history.push(price);
    if (history.length > 100) history.shift();
    this.priceHistory.set(symbol, history);
  }

  getATR(symbol: string) {
    const history = this.priceHistory.get(symbol) || [];
    if (history.length < 20) return 0;

    // Use a standard ATR calculation: average of TR
    // TR = max(high - low, abs(high - prevClose), abs(low - prevClose))
    // Since we only have midPrice history, we approximate TR as |price - prevPrice|
    let trSum = 0;
    for (let i = 1; i < history.length; i++) {
      trSum += Math.abs(history[i] - history[i-1]);
    }
    return trSum / (history.length - 1);
  }

  /**
   * Volatility Regime Filter
   * Disables expansionary strategies (like Grid) during extreme volatility
   */
  getMarketRegime(symbol: string): { regime: 'NORMAL' | 'TRENDING' | 'VOLATILE' | 'EXTREME', ratio: number } {
    const price = this.priceHistory.get(symbol)?.slice(-1)[0] || 0;
    if (price === 0) return { regime: 'NORMAL', ratio: 0 };
    
    const atr = this.getATR(symbol);
    const ratio = atr / price;
    
    // Thresholds (ratio of ATR to Price)
    // 0.01 = 1% move per tick average. Crypto is volatile.
    if (ratio > 0.05) return { regime: 'EXTREME', ratio };
    if (ratio > 0.02) return { regime: 'VOLATILE', ratio };
    if (ratio > 0.01) return { regime: 'TRENDING', ratio };
    return { regime: 'NORMAL', ratio };
  }

  isVolatilityHigh(symbol: string, thresholdRatio?: number) {
    const { regime, ratio } = this.getMarketRegime(symbol);
    
    // Default threshold is 1% change per tick average
    const effectiveThreshold = thresholdRatio || 0.01; 
    
    const isHigh = ratio > effectiveThreshold || regime === 'EXTREME';
    if (isHigh) {
      console.log(`[Risk] Market Regime ${regime} on ${symbol}: ${(ratio * 100).toFixed(4)}%`);
    }
    return isHigh;
  }

  resetBreaker() {
    this.isBreakerTriggered = false;
    this.initialEquity = 0;
  }
}
