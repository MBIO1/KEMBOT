import { config } from '../config.ts';
import { HyperliquidClient } from '../exchange/hyperliquidClient.ts';
import { RiskEngine } from '../risk/riskEngine.ts';
import type { HyperliquidWsHub } from '../realtime/hyperliquidWsHub.ts';
import type { TopPairSignal } from './hyperliquidSignalService.ts';
import { HyperliquidSignalService } from './hyperliquidSignalService.ts';

export type HyperSystemRow = {
  symbol: string;
  mid?: number;
  trendScore: number;
  signal: TopPairSignal['signal'];
  momentumPct: number;
  hyperLong: boolean;
  hyperShort: boolean;
  historyPoints: number;
};

export const hyperSystemState: {
  wsConnected: boolean;
  trackedSymbols: string[];
  lastMidsUpdatedAt: number;
  rows: HyperSystemRow[];
  recentActions: { t: number; message: string }[];
  tradingEnabled: boolean;
} = {
  wsConnected: false,
  trackedSymbols: [],
  lastMidsUpdatedAt: 0,
  rows: [],
  recentActions: [],
  tradingEnabled: false,
};

function logAction(message: string) {
  console.log(`[HyperSystem] ${message}`);
  hyperSystemState.recentActions.unshift({ t: Date.now(), message });
  hyperSystemState.recentActions.splice(40, 50);
}

/**
 * Tracks the top 5–10 Hyperliquid pairs, ingests mids + 1m candles over WS (same engine path as the official app),
 * blends cached REST trend with live momentum, and optionally places Ioc orders on **hyperstrong** alignment.
 */
export class HyperSignalTrader {
  private client: HyperliquidClient;
  private signals: HyperliquidSignalService;
  private hub: HyperliquidWsHub;
  private riskEngine: RiskEngine;
  private tracked: string[] = [];
  private midSamples = new Map<string, { t: number; px: number }[]>();
  private lastEntry = new Map<string, number>();
  private debounce: ReturnType<typeof setTimeout> | null = null;
  private pairRefresh: ReturnType<typeof setInterval> | null = null;
  private unsubMids: (() => void) | null = null;
  private unsubCandle: (() => void) | null = null;
  private unsubStatus: (() => void) | null = null;

  constructor(client: HyperliquidClient, signals: HyperliquidSignalService, hub: HyperliquidWsHub) {
    this.client = client;
    this.signals = signals;
    this.hub = hub;
    this.riskEngine = new RiskEngine({
      maxLeverage: 3,
      maxPositionSize: 5000,
      maxDailyLoss: 100,
      maxOpenOrders: 20,
      maxExposurePerCoin: 0.6,
    });
  }

  start() {
    hyperSystemState.tradingEnabled = config.signalTradingEnabled;
    this.unsubStatus = this.hub.onStatus((up) => {
      hyperSystemState.wsConnected = up;
    });
    this.unsubMids = this.hub.onMids(() => {
      if (this.debounce) clearTimeout(this.debounce);
      this.debounce = setTimeout(() => {
        this.debounce = null;
        void this.evaluate('mids');
      }, config.hyperMidsDebounceMs);
    });
    this.unsubCandle = this.hub.onCandle((coin) => {
      void this.evaluate(`candle:${coin}`);
    });

    void this.refreshTrackedPairs();
    this.pairRefresh = setInterval(() => void this.refreshTrackedPairs(), config.hyperPairRefreshMs);
  }

  stop() {
    if (this.debounce) clearTimeout(this.debounce);
    this.debounce = null;
    if (this.pairRefresh) clearInterval(this.pairRefresh);
    this.pairRefresh = null;
    this.unsubMids?.();
    this.unsubMids = null;
    this.unsubCandle?.();
    this.unsubCandle = null;
    this.unsubStatus?.();
    this.unsubStatus = null;
  }

  private async refreshTrackedPairs() {
    try {
      const top = await this.signals.getTopTradedPairs();
      this.tracked = top.map((p) => p.symbol);
      hyperSystemState.trackedSymbols = [...this.tracked];
      this.hub.setTrackedCoins(this.tracked);
    } catch (e) {
      logAction(`pair refresh failed: ${(e as Error).message}`);
    }
  }

  private pushMidSample(symbol: string, px: number, ts: number) {
    const window = config.hyperMomentumWindowMs;
    let arr = this.midSamples.get(symbol) ?? [];
    arr.push({ t: ts, px });
    const cutoff = ts - window;
    arr = arr.filter((x) => x.t >= cutoff);
    while (arr.length > 200) arr.shift();
    this.midSamples.set(symbol, arr);
  }

  private momentumPct(symbol: string): number {
    const arr = this.midSamples.get(symbol);
    if (!arr || arr.length < 2) return 0;
    const first = arr[0].px;
    const last = arr[arr.length - 1].px;
    if (!first) return 0;
    return ((last - first) / first) * 100;
  }

  private isHyperLong(trend: TopPairSignal['signal'], score: number, mom: number): boolean {
    if (trend !== 'LONG') return false;
    if (score < config.hyperStrongScoreMin) return false;
    if (mom < config.hyperMomentumMinPct) return false;
    return true;
  }

  private isHyperShort(trend: TopPairSignal['signal'], score: number, mom: number): boolean {
    if (trend !== 'SHORT') return false;
    if (score > -config.hyperStrongScoreMin) return false;
    if (mom > -config.hyperMomentumMinPct) return false;
    return true;
  }

  private async evaluate(_reason: string) {
    const mids = this.hub.getLatestMids();
    const ts = Date.now();
    hyperSystemState.lastMidsUpdatedAt = this.hub.getLastMidsAt();

    const rows: HyperSystemRow[] = await Promise.all(
      this.tracked.map(async (symbol) => {
        const midStr = mids[symbol];
        const mid = midStr !== undefined ? parseFloat(midStr) : undefined;
        if (mid !== undefined && Number.isFinite(mid)) {
          this.pushMidSample(symbol, mid, ts);
        }

        let trendScore = 0;
        let signal: TopPairSignal['signal'] = 'NEUTRAL';
        let historyPoints = 0;
        try {
          const snap = await this.signals.getTrendSnapshot(symbol);
          trendScore = snap.score;
          signal = snap.signal;
          historyPoints = snap.historyPoints;
        } catch {
          /* keep defaults */
        }

        const momentumPct = this.momentumPct(symbol);
        const hyperLong = this.isHyperLong(signal, trendScore, momentumPct);
        const hyperShort = this.isHyperShort(signal, trendScore, momentumPct);

        return {
          symbol,
          mid,
          trendScore,
          signal,
          momentumPct,
          hyperLong,
          hyperShort,
          historyPoints,
        };
      }),
    );

    rows.sort((a, b) => Math.abs(b.trendScore) - Math.abs(a.trendScore));
    hyperSystemState.rows = rows;

    if (config.signalTradingEnabled) {
      for (const row of rows) {
        if (row.mid !== undefined) {
          await this.maybeExecute(row.symbol, row.mid, row.hyperLong, row.hyperShort);
        }
      }
    }
  }

  private async maybeExecute(symbol: string, mid: number, hyperLong: boolean, hyperShort: boolean) {
    if (!hyperLong && !hyperShort) return;
    if (RiskEngine.isGlobalKillSwitchActive()) return;

    const t = Date.now();
    const last = this.lastEntry.get(symbol) ?? 0;
    if (t - last < config.hyperCooldownMs) return;

    const state = await this.client.getAccountState();
    const positions = state.assetPositions || [];
    const pos = positions.find((p: { position?: { coin?: string } }) => p.position?.coin === symbol);
    const szi = pos ? parseFloat((pos as { position: { szi: string } }).position.szi) : 0;
    if (Math.abs(szi) > 1e-8) {
      return;
    }

    const isBuy = hyperLong;

    const notional = config.hyperOrderNotionalUsd;
    const size = notional / mid;
    const order = { symbol, isBuy, price: mid, size, reduceOnly: false, tif: 'Ioc' as const };

    const accountValue = this.client.getAccountEquity(state);
    const openOrders = await this.client.getOpenOrders();
    const openCount = Array.isArray(openOrders) ? openOrders.length : 0;

    const risk = await this.riskEngine.validateOrder(order, positions, accountValue, openCount);
    if (!risk.allowed) {
      logAction(`skip ${symbol}: ${risk.reason}`);
      return;
    }

    try {
      const res = await this.client.placeOrder(order);
      this.lastEntry.set(symbol, t);
      logAction(
        `${isBuy ? 'LONG' : 'SHORT'} ${symbol} ~$${notional.toFixed(0)} @${mid} → ${JSON.stringify(res).slice(0, 200)}`,
      );
    } catch (e) {
      logAction(`order failed ${symbol}: ${(e as Error).message}`);
    }
  }
}
