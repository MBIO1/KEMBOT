export interface RiskConfig {
  maxLeverage: number;
  maxPositionSize: number; // in USD
  maxDailyLoss: number; // in USD
  maxOpenOrders: number;
  maxExposurePerCoin: number; // Percentage 0-1
}

export class RiskEngine {
  private config: RiskConfig;

  constructor(config: RiskConfig) {
    this.config = config;
  }

  async validateOrder(order: any, currentPositions: any[], accountValue: number): Promise<{ allowed: boolean; reason?: string }> {
    // 1. Check max leverage
    const totalExposure = currentPositions.reduce((acc, p) => acc + Math.abs(parseFloat(p.position.szi) * parseFloat(p.position.entryPx)), 0);
    const newOrderExposure = order.size * order.price;
    const projectedLeverage = (totalExposure + newOrderExposure) / accountValue;

    if (projectedLeverage > this.config.maxLeverage) {
      return { allowed: false, reason: `Max leverage exceeded: ${(projectedLeverage || 0).toFixed(2)} > ${this.config.maxLeverage}` };
    }

    // 2. Check max position size
    if (newOrderExposure > this.config.maxPositionSize) {
      return { allowed: false, reason: `Max position size exceeded: ${newOrderExposure} > ${this.config.maxPositionSize}` };
    }

    // 3. Check coin exposure
    const coinExposure = currentPositions
      .filter(p => p.position.coin === order.symbol)
      .reduce((acc, p) => acc + Math.abs(parseFloat(p.position.szi) * parseFloat(p.position.entryPx)), 0);
    
    if ((coinExposure + newOrderExposure) / accountValue > this.config.maxExposurePerCoin) {
      return { allowed: false, reason: `Max exposure per coin reached for ${order.symbol}` };
    }

    return { allowed: true };
  }
}
