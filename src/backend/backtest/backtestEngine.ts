import { BaseStrategy } from '../strategies/base.ts';

export interface BacktestConfig {
  symbol: string;
  startBalance: number;
  feeRate: number; // e.g. 0.0001 for 1bps
  slippage: number; // e.g. 0.0001
  latencyMs: number;
}

export class BacktestEngine {
  private balance: number;
  private currentSize: number = 0;
  private avgEntry: number = 0;
  private positions: any[] = [];
  private orderHistory: any[] = [];
  private currentPrice: number = 0;
  private config: BacktestConfig;
  private totalFees: number = 0;
  private totalSlippage: number = 0;

  constructor(config: BacktestConfig) {
    this.config = config;
    this.balance = config.startBalance;
  }

  async run(strategy: BaseStrategy, data: any[]) {
    console.log(`Starting backtest for ${this.config.symbol}...`);
    let lastFundingTime = data[0]?.timestamp || 0;
    
    // Inject mock client into strategy
    // @ts-ignore - necessary for runtime injection in engine
    strategy.client = {
      getMarketPrice: async () => {
        // Simulate network latency for price fetching
        if (this.config.latencyMs > 0) {
          await new Promise(resolve => setTimeout(resolve, this.config.latencyMs / 2));
        }
        return this.currentPrice;
      },
      placeOrder: async (order: any) => {
        // Simulate execution latency
        if (this.config.latencyMs > 0) {
          await new Promise(resolve => setTimeout(resolve, this.config.latencyMs / 2));
        }
        return this.executeOrder(order);
      },
      getAccountState: async () => ({ 
        withdrawable: this.balance.toString(), 
        assetPositions: this.positions,
        crossMarginSummary: { accountValue: this.getEquity().toString() }
      }),
      getOpenOrders: async () => [],
      getUserFills: async () => [],
      cancelOrder: async () => {},
      getCandles: async () => [],
      getMeta: async () => ({}),
      getMetaAndAssetCtxs: async () => ({ meta: {}, assetCtxs: [] }),
      getTradingHistory: async () => []
    } as any;

    const startTime = Date.now();
    for (const tick of data) {
      this.currentPrice = tick.price;
      
      // Simulate Funding (Every 8 hours)
      if (tick.timestamp - lastFundingTime > 8 * 60 * 60 * 1000) {
        this.applyFunding();
        lastFundingTime = tick.timestamp;
      }

      await strategy.tick();
    }
    const duration = Date.now() - startTime;
    console.log(`Backtest completed in ${duration}ms`);

    return this.report();
  }

  private applyFunding() {
    // Standard HL funding happens hourly, but we'll stick to 8h for simplicity or make it hourly
    const hourlyRate = 0.0001 / 8; 
    if (this.currentSize !== 0) {
      const fee = Math.abs(this.currentSize) * this.currentPrice * hourlyRate;
      this.balance -= fee;
      this.totalFees += fee;
    }
  }

  private getEquity() {
    return this.balance + (this.currentSize * this.currentPrice);
  }

  private async executeOrder(order: any) {
    // Add realistic random variance to slippage (0.2x to 2.0x of base slippage)
    // to simulate order book depth and toxicity
    const variance = 0.2 + (Math.random() * 1.8);
    const actualSlippage = this.config.slippage * variance;

    const fillPrice = order.isBuy 
      ? this.currentPrice * (1 + actualSlippage)
      : this.currentPrice * (1 - actualSlippage);
    
    const slippageCost = Math.abs(fillPrice - this.currentPrice) * order.size;
    
    // Fee simulation: taker vs maker (assume taker for market orders)
    const activeFeeRate = this.config.feeRate || 0.00035; // 3.5bps default taker
    const fee = order.size * fillPrice * activeFeeRate;
    const cost = order.size * fillPrice;

    if (order.isBuy) {
      if (this.balance < cost + fee) {
        return { status: 'error', message: 'Insufficient funds (Simulated)' };
      }
      
      const newSize = this.currentSize + order.size;
      this.avgEntry = (this.avgEntry * Math.abs(this.currentSize) + fillPrice * order.size) / Math.abs(newSize);
      this.currentSize = newSize;
      this.balance -= (cost + fee);
    } else {
      // Allow shorting if currentSize is 0 or negative
      const newSize = this.currentSize - order.size;
      this.balance += (cost - fee);
      this.currentSize = newSize;
      if (Math.abs(this.currentSize) < 0.000001) {
        this.currentSize = 0;
        this.avgEntry = 0;
      }
    }

    this.totalFees += fee;
    this.totalSlippage += slippageCost;

    // Update positions array for state reporting
    this.positions = this.currentSize !== 0 ? [{ 
      position: { 
        coin: order.symbol, 
        szi: this.currentSize.toString(), 
        entryPx: this.avgEntry.toString(),
        unrealizedPnl: (this.currentPrice - this.avgEntry) * this.currentSize
      } 
    }] : [];

    this.orderHistory.push({ 
      ...order, 
      fillPrice, 
      fee, 
      slippage: slippageCost, 
      timestamp: Date.now() 
    });

    return { 
      status: 'ok', 
      response: { 
        type: 'order',
        data: { 
          status: 'filled',
          oid: Math.random().toString(36).substring(7) 
        } 
      } 
    };
  }

  private report() {
    const finalEquity = this.getEquity();
    const pnl = finalEquity - this.config.startBalance;
    const pnlPct = (pnl / this.config.startBalance) * 100;

    return {
      finalEquity,
      pnl,
      pnlPct,
      trades: this.orderHistory.length,
      history: this.orderHistory,
      totalFees: this.totalFees,
      totalSlippage: this.totalSlippage
    };
  }
}
