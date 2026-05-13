import dotenv from 'dotenv';
dotenv.config();

export const config = {
  privateKey: process.env.HYPERLIQUID_PRIVATE_KEY || '',
  walletAddress: process.env.HYPERLIQUID_WALLET_ADDRESS || '',
  dryRun: process.env.DRY_RUN === 'true',
  testnet: process.env.TESTNET === 'true',
  liveTrading: process.env.LIVE_TRADING === 'true',
  dbPath: process.env.DB_PATH || 'trading_bot.db',
  
  // API URLs
  infoUrl: process.env.TESTNET === 'true' 
    ? 'https://api.hyperliquid-testnet.xyz/info' 
    : 'https://api.hyperliquid.xyz/info',
  exchangeUrl: process.env.TESTNET === 'true' 
    ? 'https://api.hyperliquid-testnet.xyz/exchange' 
    : 'https://api.hyperliquid.xyz/exchange',
    
  // Supported symbols (Initial set)
  supportedSymbols: ['BTC', 'ETH', 'SOL', 'HYPE', 'SUI'],

  // Market Selection configuration
  marketSelectionEnabled: process.env.MARKET_SELECTION_ENABLED === 'true' || false,
  marketSelectionIntervalMs: parseInt(process.env.MARKET_SELECTION_INTERVAL_MINUTES || '60') * 60 * 1000,
  maxSelectedMarkets: parseInt(process.env.MAX_SELECTED_MARKETS || '5'),
  min24hVolumeUsd: parseFloat(process.env.MIN_24H_VOLUME_USD || '50000000'),
  maxSpreadPercent: parseFloat(process.env.MAX_SPREAD_PERCENT || '0.05') / 100, // percentage to decimal
  maxAbsFundingRate: parseFloat(process.env.MAX_ABS_FUNDING_RATE || '0.0003'),
  marketLookbackDays: parseInt(process.env.MARKET_LOOKBACK_DAYS || '60'),
};
