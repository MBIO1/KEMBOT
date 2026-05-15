import { HyperliquidClient } from '../exchange/hyperliquidClient.ts';
import { config } from '../config.ts';

export interface TopPairSignal {
  symbol: string;
  volume: number;
  price: number;
  dayChange: number;
  signal: 'LONG' | 'SHORT' | 'NEUTRAL';
  score: number;
  historyPoints: number;
}

interface TradedPair {
  symbol: string;
  volume: number;
  price: number;
  dayChange: number;
}

export class HyperliquidSignalService {
  private client: HyperliquidClient;
  private topPairsCount: number;
  private lookbackDays: number;
  private trendCache = new Map<
    string,
    { at: number; snapshot: { symbol: string; score: number; signal: TopPairSignal['signal']; historyPoints: number } }
  >();

  constructor(client?: HyperliquidClient) {
    this.client = client ?? new HyperliquidClient();
    this.topPairsCount = config.topTradingPairs;
    this.lookbackDays = config.signalLookbackDays;
  }

  private parseNumber(value: any): number {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  }

  private async getTradingUniverse() {
    const data = await this.client.getMetaAndAssetCtxs();
    const universe = Array.isArray(data?.[0]?.universe) ? data[0].universe : [];
    const ctxs = Array.isArray(data?.[1]) ? data[1] : [];

    return universe.map((asset: any, index: number) => {
      const ctx = ctxs[index] || {};
      return {
        symbol: asset.name,
        volume: this.parseNumber(ctx.dayNtlVlm || ctx.volume || ctx.dailyVolume || 0),
        price: this.parseNumber(ctx.midPrice || ctx.price || 0),
        dayChange: this.parseNumber(ctx.dayNtlVlm) && this.parseNumber(ctx.prevDayPrice)
          ? ((this.parseNumber(ctx.midPrice) - this.parseNumber(ctx.prevDayPrice)) / Math.max(1, this.parseNumber(ctx.prevDayPrice))) * 100
          : 0,
        winRate: this.parseNumber(ctx.winRate || ctx.successRate || ctx.fillRate || 0),
      };
    });
  }

  public async getTopTradedPairs(): Promise<TradedPair[]> {
    const universe = await this.getTradingUniverse();
    return universe
      .filter((asset: any) => asset.volume > 0 && typeof asset.symbol === 'string')
      .sort((a: any, b: any) => b.volume - a.volume)
      .slice(0, this.topPairsCount)
      .map((entry: any) => ({
        symbol: entry.symbol,
        volume: entry.volume,
        price: entry.price,
        dayChange: entry.dayChange,
      }));
  }

  public async getTradingHistory(symbol: string, days: number = this.lookbackDays) {
    return this.client.getTradingHistory(symbol, days);
  }

  public computeTrendScore(history: any[]) {
    const prices = history
      .map((entry) =>
        this.parseNumber(entry.close ?? entry.c ?? entry.price ?? entry.midPrice ?? entry.closePrice),
      )
      .filter((value) => value > 0);

    if (prices.length < 2) {
      return 0;
    }

    const first = prices[0];
    const last = prices[prices.length - 1];
    const percentReturn = first > 0 ? ((last - first) / first) * 100 : 0;

    const volatility = prices.reduce((sum, price) => sum + Math.pow(price - last, 2), 0) / prices.length;
    const volatilityScore = Math.sqrt(volatility || 0);

    return percentReturn - volatilityScore * 0.5;
  }

  public async computeSignal(symbol: string) {
    const history = await this.getTradingHistory(symbol);
    const score = this.computeTrendScore(history);
    let signal: TopPairSignal['signal'] = 'NEUTRAL';

    if (score >= 2) {
      signal = 'LONG';
    } else if (score <= -2) {
      signal = 'SHORT';
    }

    return {
      symbol,
      score,
      signal,
      historyPoints: history.length,
    };
  }

  public async getTopSignals() {
    const topPairs = await this.getTopTradedPairs();
    const scored = await Promise.all(topPairs.map(async (pair: TradedPair) => {
      const signal = await this.getTrendSnapshot(pair.symbol);
      return {
        ...pair,
        score: signal.score,
        signal: signal.signal,
        historyPoints: signal.historyPoints,
      } as TopPairSignal;
    }));

    return scored.sort((a, b) => b.score - a.score);
  }

  public async isSymbolAllowed(symbol: string) {
    const top = await this.getTopTradedPairs();
    return top.some((pair: TradedPair) => pair.symbol === symbol);
  }

  /** Cached `computeSignal` to avoid hammering REST while WS pushes mids every tick. */
  public async getTrendSnapshot(symbol: string, ttlMs: number = config.hyperTrendCacheMs) {
    const now = Date.now();
    const hit = this.trendCache.get(symbol);
    if (hit && now - hit.at < ttlMs) {
      return hit.snapshot;
    }
    const snapshot = await this.computeSignal(symbol);
    this.trendCache.set(symbol, { at: now, snapshot });
    return snapshot;
  }

  public invalidateTrendCache(symbol?: string) {
    if (symbol) this.trendCache.delete(symbol);
    else this.trendCache.clear();
  }
}
