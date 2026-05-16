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
