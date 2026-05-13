import dotenv from 'dotenv';
dotenv.config();

export const config = {
  privateKey: process.env.HYPERLIQUID_PRIVATE_KEY || '',
  walletAddress: process.env.HYPERLIQUID_WALLET_ADDRESS || '',
  dryRun: process.env.DRY_RUN === 'true',
  testnet: process.env.TESTNET === 'true',
  liveTrading: process.env.LIVE_TRADING === 'true',
  useTopPairsOnly: process.env.USE_TOP_PAIRS_ONLY !== 'false',
  topTradingPairs: Number(process.env.TOP_TRADING_PAIRS || '5'),
  signalLookbackDays: Number(process.env.SIGNAL_LOOKBACK_DAYS || '60'),
  dbPath: process.env.DB_PATH || 'trading_bot.db',
  chainId: process.env.TESTNET === 'true' ? 5 : 1,
  orderExpirationSeconds: Number(process.env.ORDER_EXPIRATION_SECONDS || '30'),

  // API URLs
  infoUrl: process.env.TESTNET === 'true' 
    ? 'https://api.hyperliquid-testnet.xyz/info' 
    : 'https://api.hyperliquid.xyz/info',
  exchangeUrl: process.env.TESTNET === 'true' 
    ? 'https://api.hyperliquid-testnet.xyz/exchange' 
    : 'https://api.hyperliquid.xyz/exchange',
    
  // Default symbols
  supportedSymbols: ['BTC', 'ETH', 'SOL', 'SUI'],
};
