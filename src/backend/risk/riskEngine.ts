export interface RiskConfig {
  maxLeverage: number;
  maxPositionSize: number; // in USD
  maxDailyLoss: number; // in USD
  maxOpenOrders: number;
  maxExposurePerCoin: number; // Percentage 0-1
}

export interface RiskValidationResult {
  allowed: boolean;
  reason?: string;
  killSwitch?: boolean;
}

export class RiskEngine {
  private config: RiskConfig;
  private static globalKillSwitch = false;
  private static globalKillReason = '';

  constructor(config: RiskConfig) {
    this.config = config;
  }

  static enableGlobalKillSwitch(reason?: string) {
    RiskEngine.globalKillSwitch = true;
    RiskEngine.globalKillReason = reason || 'Global kill switch activated';
    console.warn('[RiskEngine] Global kill switch enabled:', RiskEngine.globalKillReason);
  }

  static clearGlobalKillSwitch() {
    RiskEngine.globalKillSwitch = false;
    RiskEngine.globalKillReason = '';
    console.info('[RiskEngine] Global kill switch cleared');
  }

  static isGlobalKillSwitchActive() {
    return RiskEngine.globalKillSwitch;
  }

  validateDailyLoss(currentPositions: any[], accountValue: number): RiskValidationResult {
    if (accountValue <= 0) {
      return { allowed: false, reason: 'Account value is not available for daily loss validation', killSwitch: false };
    }

    const totalUnrealized = currentPositions.reduce((acc, position) => {
      const size = parseFloat(position.position?.szi || '0');
      const entryPx = parseFloat(position.position?.entryPx || '0');
      if (!size || !entryPx) return acc;
      const currentPx = parseFloat(position.position?.markPx || position.position?.midPx || '0');
      if (!currentPx) return acc;
      return acc + size * (currentPx - entryPx) * (size > 0 ? 1 : -1);
    }, 0);

    if (Math.abs(totalUnrealized) > this.config.maxDailyLoss) {
      return {
        allowed: false,
        reason: `Daily loss threshold exceeded: ${Math.abs(totalUnrealized).toFixed(2)} > ${this.config.maxDailyLoss}`,
        killSwitch: true,
      };
    }

    return { allowed: true };
  }

  async validateOrder(order: any, currentPositions: any[], accountValue: number, openOrderCount: number = 0): Promise<RiskValidationResult> {
    if (order.reduceOnly) {
      return { allowed: true };
    }

    if (openOrderCount >= this.config.maxOpenOrders) {
      return { allowed: false, reason: `Open order limit reached: ${openOrderCount} >= ${this.config.maxOpenOrders}` };
    }

    const totalExposure = currentPositions.reduce((acc, p) => 
      acc + Math.abs(parseFloat(p.position.szi) * parseFloat(p.position.entryPx)), 0,
    );
    const newOrderExposure = order.size * order.price;
    const projectedLeverage = accountValue > 0 ? (totalExposure + newOrderExposure) / accountValue : Infinity;

    if (projectedLeverage > this.config.maxLeverage) {
      return { allowed: false, reason: `Max leverage exceeded: ${(projectedLeverage || 0).toFixed(2)} > ${this.config.maxLeverage}` };
    }

    if (newOrderExposure > this.config.maxPositionSize) {
      return { allowed: false, reason: `Max position size exceeded: ${newOrderExposure.toFixed(2)} > ${this.config.maxPositionSize}` };
    }

    const coinExposure = currentPositions
      .filter(p => p.position.coin === order.symbol)
      .reduce((acc, p) => acc + Math.abs(parseFloat(p.position.szi) * parseFloat(p.position.entryPx)), 0);

    if (accountValue > 0 && (coinExposure + newOrderExposure) / accountValue > this.config.maxExposurePerCoin) {
      return { allowed: false, reason: `Max exposure per coin reached for ${order.symbol}` };
    }

    return { allowed: true };
  }

  logRiskEvent(category: string, message: string, severity: string = 'INFO') {
    console.log(`[RiskEngine][${severity}] ${category}: ${message}`);
  }
}
