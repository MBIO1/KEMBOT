import db from '../db/session.ts';

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
  static globalKillSwitch = false;
  private config: RiskConfig;

  constructor(config: RiskConfig) {
    this.config = config;
  }

  static enableGlobalKillSwitch(reason: string) {
    RiskEngine.globalKillSwitch = true;
    const stmt = db.prepare('INSERT INTO risk_events (event_type, description, severity) VALUES (?, ?, ?)');
    stmt.run('KILL_SWITCH', reason, 'CRITICAL');
    console.warn(`Global kill switch enabled: ${reason}`);
  }

  static clearGlobalKillSwitch() {
    RiskEngine.globalKillSwitch = false;
    const stmt = db.prepare('INSERT INTO risk_events (event_type, description, severity) VALUES (?, ?, ?)');
    stmt.run('KILL_SWITCH_RELEASE', 'Global kill switch released', 'INFO');
  }

  static isGlobalKillSwitchActive() {
    return RiskEngine.globalKillSwitch;
  }

  logRiskEvent(eventType: string, description: string, severity: string = 'WARNING') {
    const stmt = db.prepare('INSERT INTO risk_events (event_type, description, severity) VALUES (?, ?, ?)');
    stmt.run(eventType, description, severity);
  }

  calculateUnrealizedLoss(currentPositions: any[]): number {
    return currentPositions.reduce((total, p) => {
      const position = p.position || {};
      const entryPrice = parseFloat(position.entryPx) || 0;
      const size = parseFloat(position.szi) || 0;
      const currentPrice = parseFloat(position.curPx || position.markPx || position.midPrice || position.price || '0');
      const givenUnrealizedPnl = parseFloat(position.unrealizedPnl || '0');

      if (!Number.isFinite(currentPrice) || currentPrice === 0) {
        return total + Math.min(0, givenUnrealizedPnl);
      }

      const pnl = size > 0
        ? (currentPrice - entryPrice) * size
        : (entryPrice - currentPrice) * Math.abs(size);

      return total + pnl;
    }, 0);
  }

  async validateOrder(order: any, currentPositions: any[], accountValue: number, currentOpenOrders: number): Promise<RiskValidationResult> {
    if (RiskEngine.globalKillSwitch) {
      return { allowed: false, reason: 'Global kill switch is active', killSwitch: true };
    }

    const totalExposure = currentPositions.reduce((acc, p) => {
      const entry = parseFloat(p.position.entryPx) || 0;
      const size = Math.abs(parseFloat(p.position.szi) || 0);
      return acc + size * entry;
    }, 0);

    const newOrderExposure = order.size * order.price;
    const projectedLeverage = accountValue > 0 ? (totalExposure + newOrderExposure) / accountValue : Infinity;

    if (projectedLeverage > this.config.maxLeverage) {
      return {
        allowed: false,
        reason: `Max leverage exceeded: ${(projectedLeverage || 0).toFixed(2)} > ${this.config.maxLeverage}`,
      };
    }

    if (newOrderExposure > this.config.maxPositionSize) {
      return {
        allowed: false,
        reason: `Max position size exceeded: ${newOrderExposure.toFixed(2)} > ${this.config.maxPositionSize}`,
      };
    }

    if (currentOpenOrders + 1 > this.config.maxOpenOrders) {
      return {
        allowed: false,
        reason: `Max open orders exceeded: ${currentOpenOrders + 1} > ${this.config.maxOpenOrders}`,
      };
    }

    const coinExposure = currentPositions
      .filter(p => p.position.coin === order.symbol)
      .reduce((acc, p) => acc + Math.abs(parseFloat(p.position.szi) || 0) * (parseFloat(p.position.entryPx) || 0), 0);

    if (accountValue > 0 && (coinExposure + newOrderExposure) / accountValue > this.config.maxExposurePerCoin) {
      return {
        allowed: false,
        reason: `Max exposure per coin reached for ${order.symbol}`,
      };
    }

    return { allowed: true };
  }

  validateDailyLoss(currentPositions: any[], accountValue: number): RiskValidationResult {
    const unrealizedPnl = this.calculateUnrealizedLoss(currentPositions);
    const currentLoss = Math.min(0, unrealizedPnl);

    if (Math.abs(currentLoss) >= this.config.maxDailyLoss) {
      RiskEngine.enableGlobalKillSwitch(
        `Daily loss threshold exceeded: ${Math.abs(currentLoss).toFixed(2)} >= ${this.config.maxDailyLoss}`
      );

      return {
        allowed: false,
        reason: `Daily loss threshold exceeded: ${Math.abs(currentLoss).toFixed(2)} >= ${this.config.maxDailyLoss}`,
        killSwitch: true,
      };
    }

    return { allowed: true };
  }
}
