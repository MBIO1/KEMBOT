import { HyperliquidClient } from "../exchange/hyperliquidClient";

export abstract class BaseStrategy {
  protected client: HyperliquidClient;
  public symbol: string;
  public status: 'RUNNING' | 'STOPPED' = 'STOPPED';
  public lastTradeTime: number = 0;
  public activeOrders: string[] = [];

  constructor(client: HyperliquidClient, symbol: string) {
    this.client = client;
    this.symbol = symbol;
  }

  abstract start(config: any): void;
  abstract stop(): void;
  abstract tick(currentPrice: number): Promise<void>;
}
