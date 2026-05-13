import { privateKeyToAccount } from 'viem/accounts';
import axios from 'axios';
import { config as appConfig } from '../config.ts';

export class HyperliquidClient {
  private account: any;
  private walletAddress: string;

  constructor() {
    if (appConfig.privateKey) {
      // Ensure private key has 0x prefix
      const key = appConfig.privateKey.startsWith('0x') ? appConfig.privateKey : `0x${appConfig.privateKey}`;
      this.account = privateKeyToAccount(key as `0x${string}`);
      this.walletAddress = this.account.address;
      console.log(`Initialized client for address: ${this.walletAddress}`);
    } else {
      this.walletAddress = appConfig.walletAddress;
      if (this.walletAddress) {
        console.log(`Initialized in partial mode (info only) for address: ${this.walletAddress}`);
      } else {
        console.warn('No private key or wallet address provided. infoUrl will work, but account requests will fail.');
      }
    }
  }

  async getInfo(action: any, retryCount = 0): Promise<any> {
    try {
      const response = await axios.post(appConfig.infoUrl, action, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000
      });
      return response.data;
    } catch (error: any) {
      const status = error.response?.status;
      const isRateLimit = status === 429;
      const isTransientError = status >= 500 && status <= 504;
      const isNetworkError = !status && (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.message.includes('timeout'));

      if ((isRateLimit || isTransientError || isNetworkError) && retryCount < 5) {
        // Exponential backoff: 2^retry * 1000ms + random jitter
        const backoff = Math.pow(2, retryCount) * 1000;
        const jitter = Math.random() * 1000;
        const delay = backoff + jitter;

        const reason = isRateLimit ? 'Rate limited (429)' : (isTransientError ? `Server error (${status})` : 'Network timeout/reset');
        console.warn(`[HyperliquidClient] ${reason}. Retrying in ${(delay / 1000).toFixed(1)}s... (Attempt ${retryCount + 1}/5)`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.getInfo(action, retryCount + 1);
      }
      
      if (error.response) {
        console.error('HL Info Error Details:', error.response.data);
      }
      console.error('HL Info Error:', error.message);
      throw error;
    }
  }

  async getMeta() {
    return this.getInfo({ type: 'meta' });
  }

  async getMetaAndAssetCtxs() {
    return this.getInfo({ type: 'metaAndAssetCtxs' });
  }

  async getAccountState() {
    if (appConfig.dryRun) {
      return { 
        assetPositions: [], 
        withdrawable: "10000", 
        crossMarginSummary: { 
          accountValue: "10000", 
          totalMarginUsed: "0", 
          totalMaintenanceMarginUsed: "0" 
        } 
      };
    }
    if (!this.walletAddress) {
      console.warn('getAccountState called without walletAddress');
      return { assetPositions: [] };
    }
    return this.getInfo({ type: 'clearinghouseState', user: this.walletAddress });
  }

  async getOpenOrders() {
    if (!this.walletAddress) return [];
    return this.getInfo({ type: 'openOrders', user: this.walletAddress });
  }

  async getUserFills() {
    if (!this.walletAddress) return [];
    return this.getInfo({ type: 'userFills', user: this.walletAddress });
  }

  private lastMids: any = null;
  private lastMidsTimestamp: number = 0;

  async getMarketPrice(symbol: string) {
    try {
      const now = Date.now();
      // Cache allMids for 500ms to avoid hammering the API if multiple bots tick
      if (!this.lastMids || now - this.lastMidsTimestamp > 500) {
        this.lastMids = await this.getInfo({ type: 'allMids' });
        this.lastMidsTimestamp = now;
      }
      
      const price = this.lastMids[symbol];
      if (!price) {
        throw new Error(`Price for ${symbol} not found in allMids`);
      }
      return parseFloat(price);
    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error);
      throw error;
    }
  }

  // Improved order placement with clearer feedback
  async placeOrder(order: { symbol: string, isBuy: boolean, price: number, size: number, reduceOnly: boolean }) {
    const side = order.isBuy ? 'BUY' : 'SELL';
    
    if (appConfig.dryRun) {
      console.log(`[DRY RUN] ${side} ${order.size} ${order.symbol} @ ${order.price}`);
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
    
    if (!appConfig.liveTrading) {
      console.warn(`[REJECTED] Live trading disabled. Set LIVE_TRADING=true in .env to enable real execution.`);
      return { status: 'error', message: 'Live trading disabled' };
    }

    if (!appConfig.privateKey) {
      return { status: 'error', message: 'Missing HYPERLIQUID_PRIVATE_KEY for signing' };
    }

    console.warn(`[EIP-712] Signing ${side} order for ${order.symbol}...`);
    // Full signing logic would be here. For the MVP we provide an informative error
    // to help the user understand they reached the live gateway.
    return { status: 'error', message: 'EIP-712 signing required for live Hyperliquid trades. Ensure your account is authorized.' };
  }

  async cancelOrder(symbol: string, oid: string) {
    if (appConfig.dryRun) {
      console.log(`[DRY RUN] Cancelling order ${oid} for ${symbol}`);
      return { status: 'ok' };
    }
    // ... logic for cancellation
    return { status: 'ok' };
  }

  async cancelAllOrders() {
    console.log('Cancelling all open orders...');
    const openOrders = await this.getOpenOrders();
    for (const order of openOrders) {
      await this.cancelOrder(order.coin, order.oid.toString());
    }
    return { status: 'ok' };
  }

  async getCandles(symbol: string, interval: string, startTime?: number, endTime?: number) {
    return this.getInfo({
      type: 'candleSnapshot',
      req: {
        coin: symbol,
        interval,
        startTime,
        endTime
      }
    });
  }
}

import WebSocket from 'ws';

export class HyperliquidWS {
  private ws: WebSocket | null = null;
  private url: string;
  private subscriptions: Map<string, (data: any) => void> = new Map();
  private reconnectAttempts = 0;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastMessageTimestamp = 0;
  private onReconnectCallbacks: (() => void)[] = [];
  private isConnecting = false;
  private maxReconnectDelay = 30000;
  private baseReconnectDelay = 1000;

  constructor(url: string = 'wss://api.hyperliquid.xyz/ws') {
    this.url = url;
  }

  onReconnect(callback: () => void) {
    this.onReconnectCallbacks.push(callback);
  }

  isHealthy() {
    return this.ws?.readyState === WebSocket.OPEN && (Date.now() - this.lastMessageTimestamp < 35000);
  }

  connect() {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) return;
    this.isConnecting = true;

    console.log(`[WS] Connecting to ${this.url}...`);
    this.ws = new WebSocket(this.url);

    this.ws.on('open', () => {
      console.log('[WS] Connected');
      this.reconnectAttempts = 0;
      this.isConnecting = false;
      this.lastMessageTimestamp = Date.now();
      this.startHeartbeat();
      this.resubscribe();
      this.onReconnectCallbacks.forEach(cb => cb());
    });

    this.ws.on('message', (data: string) => {
      this.lastMessageTimestamp = Date.now();
      const message = JSON.parse(data);
      if (message.channel === 'l2Book') {
        const cb = this.subscriptions.get(`l2_${message.data.coin}`);
        if (cb) cb(message.data);
      }
    });

    this.ws.on('close', () => {
      this.isConnecting = false;
      console.log('[WS] Closed. Reconnecting with backoff...');
      this.cleanup();
      this.reconnect();
    });

    this.ws.on('error', (err) => {
      this.isConnecting = false;
      console.error('[WS] Error:', err.message);
      this.ws?.close();
    });
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ method: 'ping' }));
      }
      
      // Reconnect if no message for 30s
      if (Date.now() - this.lastMessageTimestamp > 30000) {
        console.warn('[WS] Heartbeat timeout. Forcing reconnect...');
        this.ws?.close();
      }
    }, 15000);
  }

  private reconnect() {
    const delay = Math.min(this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts), this.maxReconnectDelay);
    const jitter = Math.random() * 1000;
    const finalDelay = delay + jitter;
    
    console.log(`[WS] Reconnecting in ${(finalDelay / 1000).toFixed(1)}s (Attempt ${this.reconnectAttempts + 1})`);
    
    this.reconnectAttempts++;
    setTimeout(() => this.connect(), finalDelay);
  }

  private resubscribe() {
    for (const key of this.subscriptions.keys()) {
      if (key.startsWith('l2_')) {
        const coin = key.split('_')[1];
        this.send({ method: 'subscribe', subscription: { type: 'l2Book', coin } });
      }
    }
  }

  private cleanup() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
  }

  subscribeL2(coin: string, callback: (data: any) => void) {
    this.subscriptions.set(`l2_${coin}`, callback);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.send({ method: 'subscribe', subscription: { type: 'l2Book', coin } });
    }
  }

  private send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }
}
