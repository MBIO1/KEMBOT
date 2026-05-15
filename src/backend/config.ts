import dotenv from 'dotenv';
dotenv.config();

const rawTop = Number(process.env.TOP_TRADING_PAIRS || '8');
const clampedTop = Number.isFinite(rawTop) ? Math.min(10, Math.max(5, Math.floor(rawTop))) : 8;

export const config = {
  privateKey: process.env.HYPERLIQUID_PRIVATE_KEY || '',
  walletAddress: process.env.HYPERLIQUID_WALLET_ADDRESS || '',
  dryRun: process.env.DRY_RUN === 'true',
  testnet: process.env.TESTNET === 'true',
  liveTrading: process.env.LIVE_TRADING === 'true',
  useTopPairsOnly: process.env.USE_TOP_PAIRS_ONLY !== 'false',
  /** Hyperliquid top-N universe slice (by day notional volume). Clamped to 5–10. */
  topTradingPairs: clampedTop,
  signalLookbackDays: Number(process.env.SIGNAL_LOOKBACK_DAYS || '60'),

  /** When true, server runs Hyperstrong evaluation + optional auto-orders on top pairs. */
  signalTradingEnabled: process.env.HYPER_SIGNAL_TRADING === 'true',
  /** Minimum absolute REST/candle trend score to qualify as hyperstrong (see HyperliquidSignalService). */
  hyperStrongScoreMin: Number(process.env.HYPER_STRONG_SCORE_MIN || '3'),
  /** Minimum aligned 1m / allMids momentum (% change over the live window) to confirm hyperstrong. */
  hyperMomentumMinPct: Number(process.env.HYPER_MOMENTUM_MIN_PCT || '0.08'),
  /** Target order notional in USDC (Hyperliquid per-order minimum ~$10). */
  hyperOrderNotionalUsd: Math.max(10, Number(process.env.HYPER_ORDER_NOTIONAL_USD || '15')),
  /** Cooldown between automated entries per symbol (ms). */
  hyperCooldownMs: Number(process.env.HYPER_COOLDOWN_MS || '120000'),
  /** How long to reuse cached trend `computeSignal` per symbol (ms). */
  hyperTrendCacheMs: Number(process.env.HYPER_TREND_CACHE_MS || '180000'),
  /** How often to refresh top-volume pair list from REST (ms). */
  hyperPairRefreshMs: Number(process.env.HYPER_PAIR_REFRESH_MS || '120000'),
  /** Debounce after each `allMids` push before re-evaluating signals (ms). */
  hyperMidsDebounceMs: Number(process.env.HYPER_MIDS_DEBOUNCE_MS || '250'),
  /** Rolling window for live momentum from streamed mids (ms). */
  hyperMomentumWindowMs: Number(process.env.HYPER_MOMENTUM_WINDOW_MS || '90000'),
  dbPath: process.env.DB_PATH || 'trading_bot.db',
  /** Optional subaccount / vault address (master key signs; see Hyperliquid docs). */
  vaultAddress: process.env.HYPERLIQUID_VAULT_ADDRESS || '',
  /** Optional exchange `expiresAfter` (ms); omit when unset. */
  expiresAfterMs: (() => {
    const raw = process.env.HYPERLIQUID_EXPIRES_AFTER_MS;
    if (raw === undefined || raw === '') return undefined;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  })(),

  // API URLs
  infoUrl: process.env.TESTNET === 'true' 
    ? 'https://api.hyperliquid-testnet.xyz/info' 
    : 'https://api.hyperliquid.xyz/info',
  exchangeUrl: process.env.TESTNET === 'true' 
    ? 'https://api.hyperliquid-testnet.xyz/exchange' 
    : 'https://api.hyperliquid.xyz/exchange',

  wsUrl:
    process.env.TESTNET === 'true'
      ? 'wss://api.hyperliquid-testnet.xyz/ws'
      : 'wss://api.hyperliquid.xyz/ws',

  // Default symbols
  supportedSymbols: ['BTC', 'ETH', 'SOL', 'SUI'],
};
