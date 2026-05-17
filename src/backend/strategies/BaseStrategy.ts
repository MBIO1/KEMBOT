import { HyperliquidClient } from "../exchange/hyperliquidClient";
import { RiskManager } from "../risk/RiskManager";

export abstract class BaseStrategy {
  protected client: HyperliquidClient;
  protected riskManager: RiskManager;
  public symbol: string;
  public status: 'RUNNING' | 'STOPPED' = 'STOPPED';
  public lastTradeTime: number = 0;
  public activeOrders: string[] = [];

  constructor(client: HyperliquidClient, symbol: string, riskManager: RiskManager) {
    this.client = client;
    this.riskManager = riskManager;
    this.symbol = symbol;
  }

  abstract start(config: any): void;
  abstract stop(): void;
  abstract tick(currentPrice: number): Promise<void>;

  /**
   * Helper to check if an order would violate risk limits
   */
  protected async validateOrderWithRisk(
    size: number,
    price: number,
    currentMarketPrice: number
  ): Promise<{ valid: boolean; reason?: string }> {
    try {
      const accountState = await this.client.getAccountState();
      const equity = this.client.getAccountEquity(accountState);

      // Build minimal account state for risk validation
      const minimalAccountState = {
        totalEquity: equity,
        availableBalance: equity,
        usedMargin: 0,
        totalLiquidationRisk: 0,
        positions: [],
        dailyRealizedPnL: 0
      };

      return await this.riskManager.validateOrder(
        size,
        price,
        currentMarketPrice,
        minimalAccountState,
        this.symbol,
        false
      );
    } catch (error) {
      return {
        valid: false,
        reason: `Risk validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}
