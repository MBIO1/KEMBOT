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

  async getInfo(action: any) {
    try {
      const response = await axios.post(appConfig.infoUrl, action, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000
      });
      return response.data;
    } catch (error: any) {
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
    if (!this.walletAddress) {
      console.warn('getAccountState called without walletAddress');
      return { assetPositions: [] };
    }
    return this.getInfo({ type: 'clearinghouseState', user: this.walletAddress });
  }

  async getMarketPrice(symbol: string) {
    try {
      const mids = await this.getInfo({ type: 'allMids' });
      const price = mids[symbol];
      if (!price) {
        throw new Error(`Price for ${symbol} not found in allMids`);
      }
      return parseFloat(price);
    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error);
      // Fallback or retry logic could go here
      throw error;
    }
  }

  // Placeholder for signing logic (EIP-712)
  // For MVP, we'll focus on the structure. 
  // In a real bot, we'd implement the full EIP-712 signing for exchange actions.
  async placeOrder(order: { symbol: string, isBuy: boolean, price: number, size: number, reduceOnly: boolean }) {
    if (appConfig.dryRun) {
      console.log(`[DRY RUN] Placing ${order.isBuy ? 'BUY' : 'SELL'} order for ${order.size} ${order.symbol} at ${order.price}`);
      return { status: 'ok', response: { type: 'order', data: { status: 'filled', oid: Math.random().toString(36).substring(7) } } };
    }
    
    if (!appConfig.liveTrading) {
      throw new Error('Live trading is disabled. Set LIVE_TRADING=true to place real orders.');
    }

    // Mocking the exchange call for now to avoid complexity of EIP-712 implementation in a single turn
    // but the structure is here for the user.
    console.warn('Real order placement requires full EIP-712 implementation.');
    return { status: 'error', message: 'EIP-712 signing not implemented in MVP template' };
  }

  async cancelOrder(symbol: string, oid: string) {
    if (appConfig.dryRun) {
      console.log(`[DRY RUN] Cancelling order ${oid} for ${symbol}`);
      return { status: 'ok' };
    }
    // ... logic for cancellation
  }
}
