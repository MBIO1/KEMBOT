import dotenv from 'dotenv';
dotenv.config();

export const config = {
  privateKey: process.env.HYPERLIQUID_PRIVATE_KEY || '',
  walletAddress: process.env.HYPERLIQUID_WALLET_ADDRESS || '',
  dryRun: process.env.DRY_RUN === 'true',
  testnet: process.env.TESTNET === 'true',
  liveTrading: process.env.LIVE_TRADING === 'true',
  dbPath: 'trading_bot.db',
  
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
