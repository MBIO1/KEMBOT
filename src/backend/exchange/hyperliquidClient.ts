import { privateKeyToAccount } from 'viem/accounts';
import { recoverTypedDataAddress } from 'viem';
import axios from 'axios';
import type { TypedData } from 'viem';
import { config as appConfig } from '../config.ts';

export interface HyperliquidOrder {
  symbol: string;
  isBuy: boolean;
  price: number;
  size: number;
  reduceOnly: boolean;
  nonce?: bigint;
  deadline?: number;
}

export class HyperliquidClient {
  private account: any;
  private walletAddress: string | undefined;
  private chainId: number;

  constructor() {
    this.chainId = appConfig.chainId;

    if (appConfig.privateKey) {
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

  public getWalletAddress() {
    return this.walletAddress;
  }

  async getInfo(action: any) {
    try {
      const response = await axios.post(appConfig.infoUrl, action, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000,
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

  async getOpenOrders() {
    if (!this.walletAddress) {
      return [];
    }
    return this.getInfo({ type: 'orders', user: this.walletAddress });
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
      throw error;
    }
  }

  async getTradingHistory(symbol: string, days: number) {
    const types = ['priceHistory', 'ohlc', 'candles', 'history', 'tradeHistory'];
    for (const type of types) {
      try {
        const data = await this.getInfo({ type, symbol, days });
        if (Array.isArray(data) && data.length > 0) {
          return data;
        }
      } catch (error) {
        // Try next available history endpoint.
      }
    }
    return [];
  }

  public getOrderTypedData(order: HyperliquidOrder): TypedData {
    if (!this.walletAddress) {
      throw new Error('Wallet address required to build order payload');
    }

    const deadline = order.deadline || Math.floor(Date.now() / 1000) + appConfig.orderExpirationSeconds;
    const nonce = order.nonce ?? BigInt(Date.now());

    return {
      types: {
        EIP712Domain: [
          { name: 'name', type: 'string' },
          { name: 'version', type: 'string' },
          { name: 'chainId', type: 'uint256' },
        ],
        Order: [
          { name: 'user', type: 'address' },
          { name: 'symbol', type: 'string' },
          { name: 'side', type: 'string' },
          { name: 'price', type: 'string' },
          { name: 'size', type: 'string' },
          { name: 'reduceOnly', type: 'bool' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
          { name: 'testnet', type: 'bool' },
        ],
      },
      domain: {
        name: 'Hyperliquid',
        version: '1',
        chainId: this.chainId,
      },
      primaryType: 'Order',
      message: {
        user: this.walletAddress,
        symbol: order.symbol,
        side: order.isBuy ? 'BUY' : 'SELL',
        price: order.price.toString(),
        size: order.size.toString(),
        reduceOnly: order.reduceOnly,
        nonce: nonce.toString(),
        deadline,
        testnet: appConfig.testnet,
      },
    };
  }

  public async signOrder(order: HyperliquidOrder) {
    if (!this.account) {
      throw new Error('Private key is required to sign orders. Set HYPERLIQUID_PRIVATE_KEY.');
    }

    if (!order.nonce) {
      order.nonce = BigInt(Date.now());
    }
    if (!order.deadline) {
      order.deadline = Math.floor(Date.now() / 1000) + appConfig.orderExpirationSeconds;
    }

    const typedData = this.getOrderTypedData(order);
    return await this.account.signTypedData(typedData);
  }

  public async verifyOrderSignature(order: HyperliquidOrder, signature: string) {
    const typedData = this.getOrderTypedData(order);
    return recoverTypedDataAddress({
      domain: typedData.domain,
      message: typedData.message,
      primaryType: typedData.primaryType,
      types: typedData.types,
      signature,
    });
  }

  async placeOrder(order: HyperliquidOrder) {
    if (appConfig.dryRun) {
      console.log(`[DRY RUN] Placing ${order.isBuy ? 'BUY' : 'SELL'} ${order.symbol} ${order.size} @ ${order.price}`);
      return { status: 'ok', orderId: `dry-${Math.random().toString(36).substring(7)}` };
    }

    if (!appConfig.liveTrading) {
      throw new Error('Live trading is disabled. Set LIVE_TRADING=true to place real orders.');
    }

    if (!this.account || !this.walletAddress) {
      throw new Error('Private key and wallet address are required for live trading.');
    }

    const signature = await this.signOrder(order);
    const payload = {
      type: 'placeOrder',
      order: {
        user: this.walletAddress,
        symbol: order.symbol,
        side: order.isBuy ? 'BUY' : 'SELL',
        price: order.price.toString(),
        size: order.size.toString(),
        reduceOnly: order.reduceOnly,
        nonce: BigInt(Date.now()).toString(),
        deadline: Math.floor(Date.now() / 1000) + appConfig.orderExpirationSeconds,
      },
      signature,
    };

    try {
      const response = await axios.post(appConfig.exchangeUrl, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 20000,
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        console.error('HL Exchange Error Details:', error.response.data);
      }
      console.error('HL Exchange Error:', error.message);
      throw error;
    }
  }

  async cancelOrder(orderId: string) {
    if (appConfig.dryRun) {
      console.log(`[DRY RUN] Cancelling order ${orderId}`);
      return { status: 'ok' };
    }

    if (!appConfig.liveTrading) {
      throw new Error('Live trading is disabled. Set LIVE_TRADING=true to cancel real orders.');
    }

    if (!this.account || !this.walletAddress) {
      throw new Error('Private key and wallet address are required for live trading.');
    }

    const payload = {
      type: 'cancelOrder',
      orderId,
      user: this.walletAddress,
      timestamp: Math.floor(Date.now() / 1000),
    };

    const signature = await this.account.signMessage(JSON.stringify(payload));

    try {
      const response = await axios.post(appConfig.exchangeUrl, { ...payload, signature }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 20000,
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        console.error('HL Cancel Error Details:', error.response.data);
      }
      console.error('HL Cancel Error:', error.message);
      throw error;
    }
  }

  async cancelOpenOrders() {
    const openOrders = await this.getOpenOrders();
    if (!Array.isArray(openOrders)) {
      return [];
    }

    return Promise.all(openOrders.map((order: any) => this.cancelOrder(order.id || order.oid || order.orderId)));
  }

  async closeAllPositions() {
    const state = await this.getAccountState();
    const positions = state.assetPositions || [];

    return Promise.all(positions.map(async (position: any) => {
      const size = Math.abs(parseFloat(position.position.szi) || 0);
      if (size === 0) return null;

      const isBuy = parseFloat(position.position.szi) < 0;
      const price = await this.getMarketPrice(position.position.coin);

      return this.placeOrder({
        symbol: position.position.coin,
        isBuy,
        price,
        size,
        reduceOnly: true,
      });
    }));
  }

  getAccountEquity(state: any) {
    return parseFloat(state.collateralEquity || state.totalAccountValue || state.equity || '0') || 0;
  }
}
