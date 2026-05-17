import axios from 'axios';

export interface Meta {
  universe: {
    name: string;
    szDecimals: number;
    maxLeverage: number;
  }[];
}

export class HyperliquidClient {
  private baseUrl = 'https://api.hyperliquid.xyz/info';

  public tradeHistory: any[] = [];

  constructor() {
    this.tradeHistory = [
      { id: '1', timestamp: Date.now() - 3600000 * 24, symbol: 'BTC', side: 'buy', size: 0.15, price: 61500, pnl: 45.2 },
      { id: '2', timestamp: Date.now() - 3600000 * 18, symbol: 'ETH', side: 'sell', size: 2.5, price: 3450, pnl: -12.5 },
      { id: '3', timestamp: Date.now() - 3600000 * 5, symbol: 'SOL', side: 'buy', size: 15.0, price: 145, pnl: 120.4 },
      { id: '4', timestamp: Date.now() - 3600000 * 2, symbol: 'BTC', side: 'buy', size: 0.05, price: 62100, pnl: 5.1 },
    ];
  }

  async getMeta(): Promise<Meta> {
    try {
      const response = await axios.post(this.baseUrl, { type: 'meta' }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });
      return response.data;
    } catch (error: any) {
      console.error('[HyperliquidClient] Metadata Error:', error.message);
      throw error;
    }
  }

  async getAllMids(): Promise<Record<string, string>> {
     try {
      const response = await axios.post(this.baseUrl, { type: 'allMids' }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  async placeOrder(order: any): Promise<any> {
    console.log('[HyperliquidClient] Simulating order placement:', order);
    const newTrade = {
      id: Math.floor(Math.random() * 1000000).toString(),
      timestamp: Date.now(),
      symbol: order.symbol,
      side: order.size > 0 ? 'buy' : 'sell',
      size: Math.abs(order.size),
      price: order.price,
      pnl: 0 // newly placed mock trade has 0 realized PnL
    };
    this.tradeHistory.unshift(newTrade);

    return {
      status: 'ok',
      response: {
        data: {
          statuses: [
            {
              filled: { oid: Math.floor(Math.random() * 1000000) }
            }
          ]
        }
      }
    };
  }

  async getAccountState(): Promise<any> {
    return {
      assetPositions: [
        { position: { unrealizedPnl: '50.2' } }
      ]
    };
  }

  getAccountEquity(state: any): number {
    return 10500.00;
  }
}
