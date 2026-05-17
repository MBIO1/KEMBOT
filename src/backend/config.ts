import dotenv from 'dotenv';
dotenv.config();

const rawTop = Number(process.env.TOP_TRADING_PAIRS || '8');
const clampedTop = Number.isFinite(rawTop) ? Math.min(10, Math.max(5, Math.floor(rawTop))) : 8;

export const config = {
  privateKey: process.env.HYPERLIQUID_PRIVATE_KEY || '',
  walletAddress: process.env.HYPERLIQUID_WALLET_ADDRESS || '',
  dryRun: process.env.DRY_RUN !== 'false',
  testnet: process.env.TESTNET !== 'false',
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
  infoUrl: process.env.TESTNET !== 'false' 
    ? 'https://api.hyperliquid-testnet.xyz/info' 
    : 'https://api.hyperliquid.xyz/info',
  exchangeUrl: process.env.TESTNET !== 'false' 
    ? 'https://api.hyperliquid-testnet.xyz/exchange' 
    : 'https://api.hyperliquid.xyz/exchange',

  wsUrl:
    process.env.TESTNET !== 'false'
      ? 'wss://api.hyperliquid-testnet.xyz/ws'
      : 'wss://api.hyperliquid.xyz/ws',

  // Market Selection configuration
  marketSelectionEnabled: process.env.MARKET_SELECTION_ENABLED === 'true' || false,
  marketSelectionIntervalMs: parseInt(process.env.MARKET_SELECTION_INTERVAL_MINUTES || '60') * 60 * 1000,
  maxSelectedMarkets: parseInt(process.env.MAX_SELECTED_MARKETS || '5'),
  min24hVolumeUsd: parseFloat(process.env.MIN_24H_VOLUME_USD || '50000000'),
  maxSpreadPercent: parseFloat(process.env.MAX_SPREAD_PERCENT || '0.05') / 100, // percentage to decimal
  maxAbsFundingRate: parseFloat(process.env.MAX_ABS_FUNDING_RATE || '0.0003'),
  marketLookbackDays: parseInt(process.env.MARKET_LOOKBACK_DAYS || '60'),

  // Default symbols
  supportedSymbols: ['BTC', 'ETH', 'SOL', 'SUI'],

  // ============ RISK MANAGEMENT - CRITICAL FOR LIVE TRADING ============
  // Position & Balance Limits
  maxPositionSizeUsd: parseInt(process.env.MAX_POSITION_SIZE_USD || '2000'),
  maxTotalExposureUsd: parseInt(process.env.MAX_TOTAL_EXPOSURE_USD || '10000'),
  maxLeverageAllowed: parseFloat(process.env.MAX_LEVERAGE_ALLOWED || '2'),
  dailyLossLimitUsd: parseInt(process.env.DAILY_LOSS_LIMIT_USD || '500'),
  minBalanceAlertUsd: parseInt(process.env.MIN_BALANCE_ALERT_USD || '100'),

  // Order Execution Limits
  maxSlippagePercent: parseFloat(process.env.MAX_SLIPPAGE_PERCENT || '0.5'),
  orderRateLimitMs: parseInt(process.env.ORDER_RATE_LIMIT_MS || '1000'),

  // Emergency Controls
  enableEmergencyClose: process.env.ENABLE_EMERGENCY_CLOSE === 'true' || true,
  maxOpenOrdersPerSymbol: parseInt(process.env.MAX_OPEN_ORDERS_PER_SYMBOL || '3'),
};
