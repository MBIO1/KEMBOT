import { BaseStrategy } from './BaseStrategy';
import { HyperliquidClient } from '../exchange/hyperliquidClient';
import { RiskManager } from '../risk/RiskManager';

export class DCAStrategy extends BaseStrategy {
  private config: any;
  private intervalHandle: NodeJS.Timeout | null = null;

  constructor(client: HyperliquidClient, symbol: string, riskManager: RiskManager) {
    super(client, symbol, riskManager);
  }

  start(config: any) {
    this.config = config;
    this.status = 'RUNNING';
    console.log(`[DCA ${this.symbol}] Started with config:`, config);
    
    // Clear any existing interval
    if (this.intervalHandle) clearInterval(this.intervalHandle);
    
    // Set up regular interval for DCA orders
    const intervalMs = config.intervalMs || 60000; // Default 1 minute
    this.intervalHandle = setInterval(() => {
      this.executeDCAOrder().catch(error => {
        console.error(`[DCA ${this.symbol}] Error executing order:`, error);
      });
    }, intervalMs);
  }

  stop() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
    this.status = 'STOPPED';
    console.log(`[DCA ${this.symbol}] Stopped`);
  }

  async tick(currentPrice: number) {
    if (this.status !== 'RUNNING') return;
    // DCA strategy uses interval-based execution, not tick-based
    // This method is here for compatibility with base class
  }

  /**
   * Execute a DCA buy order
   */
  private async executeDCAOrder() {
    if (this.status !== 'RUNNING') return;

    try {
      const currentPrice = await this.client.getMarketPrice(this.symbol);
      const notionalUsd = Number(this.config.amount || 100);
      const size = notionalUsd / currentPrice;

      // Validate order with risk manager
      const validation = await this.validateOrderWithRisk(
        size,
        currentPrice,
        currentPrice
      );

      if (!validation.valid) {
        console.warn(`[DCA ${this.symbol}] Order blocked: ${validation.reason}`);
        return;
      }

      // Place actual order
      const order = {
        symbol: this.symbol,
        isBuy: true,
        price: currentPrice,
        size,
        reduceOnly: false as const,
        tif: 'Ioc' as const
      };

      const result = await this.client.placeOrder(order);
      
      if (result.status === 'ok' || result.response?.type === 'order') {
        this.lastTradeTime = Date.now();
        
        // Extract order ID if available
        const firstStatus = result.response?.data?.statuses?.[0] ?? {};
        const hlOrderId = firstStatus.resting?.oid ?? firstStatus.filled?.oid;
        
        if (hlOrderId) {
          this.activeOrders.push(hlOrderId.toString());
          console.log(`[DCA ${this.symbol}] ✅ Order placed: ${notionalUsd} USD @ ${currentPrice.toFixed(2)} (OID: ${hlOrderId})`);
        } else {
          console.log(`[DCA ${this.symbol}] ✅ Order placed: ${notionalUsd} USD @ ${currentPrice.toFixed(2)}`);
        }
      } else {
        console.error(`[DCA ${this.symbol}] ❌ Order failed:`, result);
      }
    } catch (error) {
      console.error(`[DCA ${this.symbol}] Error:`, error);
    }
  }
}
