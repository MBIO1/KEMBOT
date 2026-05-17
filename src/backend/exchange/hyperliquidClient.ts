import { privateKeyToAccount } from 'viem/accounts';
import axios from 'axios';
import { signL1Action } from '@nktkas/hyperliquid/signing';
import { config as appConfig } from '../config.ts';

/** Matches Hyperliquid Python SDK `float_to_wire` (wire-format price/size strings). */
export function floatToWire(x: number): string {
  const rounded = x.toFixed(8);
  if (Math.abs(Number(rounded) - x) >= 1e-12) {
    throw new Error(`float_to_wire causes rounding: ${x}`);
  }
  let s = rounded;
  if (s === '-0.00000000') s = '0.00000000';
  if (!s.includes('.')) return s;
  const neg = s.startsWith('-');
  const abs = neg ? s.slice(1) : s;
  const [intPart, decRaw] = abs.split('.');
  const decTrim = decRaw.replace(/0+$/, '');
  const body = decTrim.length > 0 ? `${intPart}.${decTrim}` : intPart;
  return neg ? `-${body}` : body;
}

export type HyperliquidTif = 'Alo' | 'Ioc' | 'Gtc';

export interface HyperliquidOrder {
  symbol: string;
  isBuy: boolean;
  price: number;
  size: number;
  reduceOnly: boolean;
  /** Limit time-in-force; defaults to Ioc (aggressive) for reduce-only closes, Gtc otherwise. */
  tif?: HyperliquidTif;
}

export class HyperliquidClient {
  private account: ReturnType<typeof privateKeyToAccount> | undefined;
  private walletAddress: string | undefined;
  private perpAssetIndex: Map<string, number> | null = null;

  public tradeHistory: any[] = [];

  constructor() {
    // Initialize account if credentials are available
    this.initializeAccount();
    
    // Seed with sample history for UI testing (will be replaced by real trades)
    if (appConfig.dryRun || !appConfig.liveTrading) {
      this.tradeHistory = [
        { id: '1', timestamp: Date.now() - 3600000 * 24, symbol: 'BTC', side: 'buy', size: 0.15, price: 61500, pnl: 45.2 },
        { id: '2', timestamp: Date.now() - 3600000 * 18, symbol: 'ETH', side: 'sell', size: 2.5, price: 3450, pnl: -12.5 },
        { id: '3', timestamp: Date.now() - 3600000 * 5, symbol: 'SOL', side: 'buy', size: 15.0, price: 145, pnl: 120.4 },
        { id: '4', timestamp: Date.now() - 3600000 * 2, symbol: 'BTC', side: 'buy', size: 0.05, price: 62100, pnl: 5.1 },
      ];
    }
  }

  /**
   * Initialize account from environment variables
   */
  private initializeAccount() {
    if (!appConfig.privateKey) {
      console.warn('⚠️  HYPERLIQUID_PRIVATE_KEY not set. Live trading disabled.');
      return;
    }

    if (!appConfig.walletAddress) {
      console.warn('⚠️  HYPERLIQUID_WALLET_ADDRESS not set. Live trading disabled.');
      return;
    }

    try {
      this.account = privateKeyToAccount(appConfig.privateKey as `0x${string}`);
      this.walletAddress = appConfig.walletAddress;
      console.log(`✅ Account initialized: ${this.walletAddress}`);
      console.log(`   Network: ${appConfig.testnet ? 'TESTNET' : 'MAINNET'}`);
      console.log(`   Live Trading: ${appConfig.liveTrading ? 'ENABLED' : 'DISABLED'}`);
      console.log(`   Dry Run: ${appConfig.dryRun ? 'ENABLED' : 'DISABLED'}`);
    } catch (error) {
      console.error('❌ Failed to initialize account:', error);
      this.account = undefined;
      this.walletAddress = undefined;
    }
  }

  /**
   * Get metadata from Hyperliquid
   */
  async getMeta(): Promise<any> {
    return this.getInfo({ type: 'meta' });
  }

  /**
   * Get metadata and asset contexts
   */
  async getMetaAndAssetCtxs(): Promise<any> {
    return this.getInfo({ type: 'metaAndAssetCtxs' });
  }

  /**
   * Get all mid prices (BID + ASK / 2)
   */
  async getAllMids(): Promise<Record<string, string>> {
    return this.getInfo({ type: 'allMids' });
  }

  /** Perpetual asset index in `meta.universe` (required for exchange order/cancel wire fields). */
  async resolvePerpAssetIndex(coin: string): Promise<number> {
    if (this.perpAssetIndex?.has(coin)) {
      return this.perpAssetIndex.get(coin)!;
    }
    const meta = await this.getMeta();
    const universe = Array.isArray(meta?.universe) ? meta.universe : [];
    const map = new Map<string, number>();
    universe.forEach((asset: { name?: string }, index: number) => {
      if (typeof asset?.name === 'string') {
        map.set(asset.name, index);
      }
    });
    this.perpAssetIndex = map;
    const idx = map.get(coin);
    if (idx === undefined) {
      throw new Error(`Unknown perp coin "${coin}" — not found in meta.universe`);
    }
    return idx;
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
    return this.getInfo({ type: 'openOrders', user: this.walletAddress });
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
    const endTime = Date.now();
    const startTime = endTime - Math.max(1, days) * 24 * 60 * 60 * 1000;
    try {
      const data = await this.getInfo({
        type: 'candleSnapshot',
        req: {
          coin: symbol,
          interval: '1h',
          startTime,
          endTime,
        },
      });
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    } catch (error) {
      console.error(`candleSnapshot failed for ${symbol}:`, error);
    }
    return [];
  }

  /**
   * Private: Make a REST call to Hyperliquid info endpoint
   */
  private async getInfo(action: Record<string, unknown>): Promise<any> {
    try {
      const response = await axios.post(appConfig.infoUrl, action, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
      });
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: unknown }; message?: string };
      if (err.response) {
        console.error('HL Info Error Details:', err.response.data);
      }
      console.error('HL Info Error:', err.message);
      throw error;
    }
  }

  /**
   * Private: Get vault address hex if configured
   */
  private vaultAddressHex(): `0x${string}` | undefined {
    const vaultAddress = appConfig.vaultAddress;
    if (!vaultAddress) return undefined;
    
    let hexAddress = vaultAddress;
    if (!hexAddress.startsWith('0x')) {
      hexAddress = '0x' + hexAddress;
    }
    
    return hexAddress as `0x${string}`;
  }

  private defaultTif(order: HyperliquidOrder): HyperliquidTif {
    /** Ioc matches typical bot behavior (cross at limit); set `tif: 'Gtc'` to rest on the book. */
    return order.tif ?? 'Ioc';
  }

  private async postExchange(action: Record<string, unknown>, nonce: number) {
    if (!this.account) {
      throw new Error('Private key is required to sign exchange actions. Set HYPERLIQUID_PRIVATE_KEY.');
    }

    const signature = await signL1Action({
      wallet: this.account,
      action,
      nonce,
      isTestnet: appConfig.testnet,
      vaultAddress: this.vaultAddressHex(),
      expiresAfter: appConfig.expiresAfterMs,
    });

    const body: Record<string, unknown> = {
      action,
      nonce,
      signature,
    };
    const vault = this.vaultAddressHex();
    if (vault && action.type !== 'usdClassTransfer' && action.type !== 'sendAsset') {
      body.vaultAddress = vault;
    }
    if (appConfig.expiresAfterMs !== undefined) {
      body.expiresAfter = appConfig.expiresAfterMs;
    }

    try {
      const response = await axios.post(appConfig.exchangeUrl, body, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 20000,
      });
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: unknown }; message?: string };
      if (err.response) {
        console.error('HL Exchange Error Details:', err.response.data);
      }
      console.error('HL Exchange Error:', err.message);
      throw error;
    }
  }

  async placeOrder(order: HyperliquidOrder) {
    if (appConfig.dryRun) {
      console.log(`[DRY RUN] Placing ${order.isBuy ? 'BUY' : 'SELL'} ${order.symbol} ${order.size} @ ${order.price}`);
      return { status: 'ok', response: { type: 'order', data: { statuses: [{ resting: { oid: 0 } }] } } };
    }

    if (!appConfig.liveTrading) {
      throw new Error('Live trading is disabled. Set LIVE_TRADING=true to place real orders.');
    }

    if (!this.account || !this.walletAddress) {
      throw new Error('Private key and wallet address are required for live trading.');
    }

    const nonce = Date.now();
    const asset = await this.resolvePerpAssetIndex(order.symbol);
    const tif = this.defaultTif(order);

    const orderWire = {
      a: asset,
      b: order.isBuy,
      p: floatToWire(order.price),
      s: floatToWire(order.size),
      r: order.reduceOnly,
      t: { limit: { tif } },
    };

    const action = {
      type: 'order',
      orders: [orderWire],
      grouping: 'na',
    };

    return this.postExchange(action, nonce);
  }

  /** Cancel a single resting order (asset index + oid per Hyperliquid exchange API). */
  async cancelOrder(coin: string, oid: number) {
    if (appConfig.dryRun) {
      console.log(`[DRY RUN] Cancelling order ${coin} oid=${oid}`);
      return { status: 'ok', response: { type: 'cancel', data: { statuses: ['success'] } } };
    }

    if (!appConfig.liveTrading) {
      throw new Error('Live trading is disabled. Set LIVE_TRADING=true to cancel real orders.');
    }

    if (!this.account || !this.walletAddress) {
      throw new Error('Private key and wallet address are required for live trading.');
    }

    const asset = await this.resolvePerpAssetIndex(coin);
    const nonce = Date.now();
    const action = {
      type: 'cancel',
      cancels: [{ a: asset, o: oid }],
    };

    return this.postExchange(action, nonce);
  }

  async cancelOpenOrders() {
    const openOrders = await this.getOpenOrders();
    if (!Array.isArray(openOrders) || openOrders.length === 0) {
      return [];
    }

    if (appConfig.dryRun) {
      console.log(`[DRY RUN] Cancelling ${openOrders.length} open orders`);
      return [{ status: 'ok' }];
    }

    if (!appConfig.liveTrading) {
      throw new Error('Live trading is disabled. Set LIVE_TRADING=true to cancel real orders.');
    }

    if (!this.account || !this.walletAddress) {
      throw new Error('Private key and wallet address are required for live trading.');
    }

    const cancels = await Promise.all(
      openOrders.map(async (row: { coin: string; oid: number }) => ({
        a: await this.resolvePerpAssetIndex(row.coin),
        o: row.oid,
      })),
    );

    const nonce = Date.now();
    const action = { type: 'cancel', cancels };
    const result = await this.postExchange(action, nonce);
    return [result];
  }

  async closeAllPositions() {
    const state = await this.getAccountState();
    const positions = state.assetPositions || [];

    return Promise.all(
      positions.map(async (position: { position: { szi: string; coin: string } }) => {
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
          tif: 'Ioc',
        });
      }),
    );
  }

  getAccountEquity(state: {
    marginSummary?: { accountValue?: string };
    crossMarginSummary?: { accountValue?: string };
    collateralEquity?: string;
    totalAccountValue?: string;
    equity?: string;
  }) {
    const fromMargin =
      parseFloat(state.marginSummary?.accountValue || '') ||
      parseFloat(state.crossMarginSummary?.accountValue || '');
    if (fromMargin > 0) return fromMargin;
    return (
      parseFloat(state.collateralEquity || state.totalAccountValue || state.equity || '0') || 0
    );
  }
}
