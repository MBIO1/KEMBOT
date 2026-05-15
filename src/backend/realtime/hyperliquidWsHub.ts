import WebSocket from 'ws';
import { config } from '../config.ts';

export type AllMidsPayload = Record<string, string>;

export type CandleWsPayload = {
  t: number;
  T: number;
  s: string;
  i: string;
  o: number;
  c: number;
  h: number;
  l: number;
  v: number;
  n: number;
};

type MidsHandler = (mids: AllMidsPayload, receivedAt: number) => void;
type CandleHandler = (coin: string, candle: CandleWsPayload) => void;
type StatusHandler = (connected: boolean) => void;

/**
 * Server-side Hyperliquid WebSocket client — same feed the app uses (`allMids`),
 * plus optional per-coin 1m `candle` streams for the tracked universe (top volume pairs).
 * @see https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/websocket/subscriptions
 */
export class HyperliquidWsHub {
  private ws: WebSocket | null = null;
  private readonly wsUrl: string;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly midsListeners = new Set<MidsHandler>();
  private readonly candleListeners = new Set<CandleHandler>();
  private readonly statusListeners = new Set<StatusHandler>();
  private latestMids: AllMidsPayload = {};
  private lastMidsAt = 0;
  private tracked = new Set<string>();
  private wantConnect = false;
  private reconnectMs = 1500;

  constructor(wsUrl?: string) {
    this.wsUrl = wsUrl || config.wsUrl;
  }

  start() {
    this.wantConnect = true;
    this.connect();
  }

  stop() {
    this.wantConnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
    this.emitStatus(false);
  }

  getLatestMids(): AllMidsPayload {
    return this.latestMids;
  }

  getMid(coin: string): number | undefined {
    const p = this.latestMids[coin];
    return p !== undefined ? parseFloat(p) : undefined;
  }

  getLastMidsAt(): number {
    return this.lastMidsAt;
  }

  isSocketOpen(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  onMids(h: MidsHandler) {
    this.midsListeners.add(h);
    return () => this.midsListeners.delete(h);
  }

  onCandle(h: CandleHandler) {
    this.candleListeners.add(h);
    return () => this.candleListeners.delete(h);
  }

  onStatus(h: StatusHandler) {
    this.statusListeners.add(h);
    return () => this.statusListeners.delete(h);
  }

  /**
   * Sync 1m candle subscriptions with the current top-N symbol list.
   * Call after the list changes; safe before `start()` (queued until socket opens).
   */
  setTrackedCoins(coins: string[]) {
    const next = new Set(coins);
    const ws = this.ws;
    if (ws && ws.readyState === WebSocket.OPEN) {
      for (const c of this.tracked) {
        if (!next.has(c)) {
          ws.send(
            JSON.stringify({
              method: 'unsubscribe',
              subscription: { type: 'candle', coin: c, interval: '1m' },
            }),
          );
        }
      }
      for (const c of next) {
        if (!this.tracked.has(c)) {
          ws.send(
            JSON.stringify({
              method: 'subscribe',
              subscription: { type: 'candle', coin: c, interval: '1m' },
            }),
          );
        }
      }
    }
    this.tracked = next;
  }

  private emitStatus(connected: boolean) {
    for (const h of this.statusListeners) {
      try {
        h(connected);
      } catch {
        /* ignore */
      }
    }
  }

  private connect() {
    if (!this.wantConnect) return;

    const ws = new WebSocket(this.wsUrl);
    this.ws = ws;

    ws.on('open', () => {
      this.reconnectMs = 1500;
      console.log('[HL WS] connected', this.wsUrl);
      this.emitStatus(true);
      ws.send(JSON.stringify({ method: 'subscribe', subscription: { type: 'allMids' } }));
      for (const c of this.tracked) {
        ws.send(
          JSON.stringify({
            method: 'subscribe',
            subscription: { type: 'candle', coin: c, interval: '1m' },
          }),
        );
      }
    });

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as {
          channel?: string;
          data?: unknown;
        };

        if (msg.channel === 'allMids' && msg.data && typeof msg.data === 'object') {
          const mids = (msg.data as { mids?: AllMidsPayload }).mids;
          if (mids && typeof mids === 'object') {
            this.latestMids = mids;
            this.lastMidsAt = Date.now();
            for (const h of this.midsListeners) {
              h(mids, this.lastMidsAt);
            }
          }
        }

        if (msg.channel === 'candle' && msg.data !== undefined) {
          const rows = Array.isArray(msg.data) ? msg.data : [msg.data];
          for (const row of rows as CandleWsPayload[]) {
            const coin = row?.s;
            if (typeof coin === 'string') {
              for (const h of this.candleListeners) {
                h(coin, row);
              }
            }
          }
        }
      } catch {
        /* ignore malformed frames */
      }
    });

    ws.on('close', () => {
      this.emitStatus(false);
      this.ws = null;
      if (!this.wantConnect) return;
      console.warn(`[HL WS] reconnect in ${this.reconnectMs}ms`);
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.reconnectMs = Math.min(30_000, Math.floor(this.reconnectMs * 1.5));
        this.connect();
      }, this.reconnectMs);
    });

    ws.on('error', (err) => {
      console.error('[HL WS] error', err.message);
    });
  }
}
