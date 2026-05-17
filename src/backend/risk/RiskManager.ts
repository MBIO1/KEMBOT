import { config } from '../config';

export interface RiskConfig {
  maxPositionSizeUsd: number;
  maxTotalExposureUsd: number;
  maxLeverageAllowed: number;
  dailyLossLimitUsd: number;
  minBalanceAlertUsd: number;
  maxSlippagePercent: number;
  orderRateLimitMs: number;
}

export interface PositionData {
  symbol: string;
  size: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  leverage: number;
  liquidationPrice: number;
}

export interface AccountState {
  totalEquity: number;
  availableBalance: number;
  usedMargin: number;
  totalLiquidationRisk: number;
  positions: PositionData[];
  dailyRealizedPnL: number;
}

/**
 * RiskManager enforces all position limits, balance checks, and safety constraints
 * before allowing orders to execute on Hyperliquid mainnet.
 */
export class RiskManager {
  private riskConfig: RiskConfig;
  private lastOrderTime: number = 0;
  private dailyTradedAmount: number = 0;
  private dailyStartTime: number = Date.now();

  constructor(config?: Partial<RiskConfig>) {
    this.riskConfig = {
      maxPositionSizeUsd: config?.maxPositionSizeUsd ?? 2000,
      maxTotalExposureUsd: config?.maxTotalExposureUsd ?? 10000,
      maxLeverageAllowed: config?.maxLeverageAllowed ?? 2,
      dailyLossLimitUsd: config?.dailyLossLimitUsd ?? 500,
      minBalanceAlertUsd: config?.minBalanceAlertUsd ?? 100,
      maxSlippagePercent: config?.maxSlippagePercent ?? 0.5,
      orderRateLimitMs: config?.orderRateLimitMs ?? 1000,
    };
  }

  /**
   * Primary validation before any order placement.
   * Checks balance, position limits, leverage, slippage, and rate limits.
   */
  async validateOrder(
    orderSize: number,
    orderPrice: number,
    currentMarketPrice: number,
    accountState: AccountState,
    symbol: string,
    isReduceOnly: boolean = false
  ): Promise<{ valid: boolean; reason?: string }> {
    // Check 1: Rate limiting
    const timeSinceLastOrder = Date.now() - this.lastOrderTime;
    if (timeSinceLastOrder < this.riskConfig.orderRateLimitMs) {
      return {
        valid: false,
        reason: `Rate limit: wait ${this.riskConfig.orderRateLimitMs - timeSinceLastOrder}ms before next order`
      };
    }

    // Check 2: Sufficient balance
    const orderCostUsd = orderSize * orderPrice;
    const maxAllowed = accountState.availableBalance * this.riskConfig.maxLeverageAllowed;
    if (orderCostUsd > maxAllowed) {
      return {
        valid: false,
        reason: `Insufficient balance: need ${orderCostUsd.toFixed(2)} USD, have ${maxAllowed.toFixed(2)} USD available`
      };
    }

    // Check 3: Daily loss limit
    if (accountState.dailyRealizedPnL < -this.riskConfig.dailyLossLimitUsd) {
      return {
        valid: false,
        reason: `Daily loss limit exceeded: ${accountState.dailyRealizedPnL.toFixed(2)} USD lost today`
      };
    }

    // Check 4: Position size limit (only for entry orders)
    if (!isReduceOnly) {
      const existingPosition = accountState.positions.find(p => p.symbol === symbol);
      const existingSize = existingPosition?.size ?? 0;
      const totalSize = Math.abs(existingSize) + orderSize;
      const totalSizeUsd = totalSize * orderPrice;

      if (totalSizeUsd > this.riskConfig.maxPositionSizeUsd) {
        return {
          valid: false,
          reason: `Position size limit: ${totalSizeUsd.toFixed(2)} USD > ${this.riskConfig.maxPositionSizeUsd} USD max`
        };
      }

      // Check 5: Total exposure limit
      const totalExposure = accountState.positions.reduce((sum, p) => {
        return sum + (Math.abs(p.size) * p.currentPrice);
      }, 0) + orderCostUsd;

      if (totalExposure > this.riskConfig.maxTotalExposureUsd) {
        return {
          valid: false,
          reason: `Total exposure limit: ${totalExposure.toFixed(2)} USD > ${this.riskConfig.maxTotalExposureUsd} USD max`
        };
      }

      // Check 6: Leverage limit
      const impliedLeverage = totalExposure / accountState.availableBalance;
      if (impliedLeverage > this.riskConfig.maxLeverageAllowed) {
        return {
          valid: false,
          reason: `Leverage limit: ${impliedLeverage.toFixed(2)}x > ${this.riskConfig.maxLeverageAllowed}x max`
        };
      }
    }

    // Check 7: Slippage protection
    const slippagePercent = Math.abs(orderPrice - currentMarketPrice) / currentMarketPrice * 100;
    if (slippagePercent > this.riskConfig.maxSlippagePercent) {
      return {
        valid: false,
        reason: `Excessive slippage: ${slippagePercent.toFixed(2)}% > ${this.riskConfig.maxSlippagePercent}% max`
      };
    }

    // Check 8: Minimum balance alert
    if (accountState.availableBalance < this.riskConfig.minBalanceAlertUsd) {
      console.warn(`⚠️ Low balance alert: ${accountState.availableBalance.toFixed(2)} USD < ${this.riskConfig.minBalanceAlertUsd} USD minimum`);
    }

    // All checks passed
    this.lastOrderTime = Date.now();
    return { valid: true };
  }

  /**
   * Check if account is in danger of liquidation
   */
  checkLiquidationRisk(accountState: AccountState): { atRisk: boolean; positions: string[] } {
    const atRiskPositions: string[] = [];

    accountState.positions.forEach(pos => {
      const distanceToLiq = Math.abs(pos.liquidationPrice - pos.currentPrice) / pos.currentPrice * 100;
      if (distanceToLiq < 10) { // Within 10% of liquidation
        atRiskPositions.push(`${pos.symbol}: ${distanceToLiq.toFixed(2)}% to liquidation`);
      }
    });

    return {
      atRisk: atRiskPositions.length > 0,
      positions: atRiskPositions
    };
  }

  /**
   * Track daily P&L for loss limit enforcement
   */
  recordDailyPnL(realizedPnL: number) {
    const now = Date.now();
    // Reset daily counter if it's been > 24 hours
    if (now - this.dailyStartTime > 24 * 60 * 60 * 1000) {
      this.dailyStartTime = now;
      this.dailyTradedAmount = 0;
    }
    this.dailyTradedAmount += realizedPnL;
  }

  getCurrentConfig(): RiskConfig {
    return { ...this.riskConfig };
  }

  updateConfig(newConfig: Partial<RiskConfig>) {
    this.riskConfig = { ...this.riskConfig, ...newConfig };
    console.log('✅ Risk configuration updated:', this.riskConfig);
  }
}
