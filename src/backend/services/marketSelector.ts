import { HyperliquidClient } from '../exchange/hyperliquidClient.ts';
import { config } from '../config.ts';

export interface MarketRanking {
  symbol: string;
  score: number;
  data: {
    volume24h: number;
    openInterest: number;
    spread: number;
    fundingRate: number;
    return60d: number;
    volatility60d: number;
    backtestScore: number;
  };
  regime: 'RANGING' | 'TRENDING' | 'CHAOTIC';
  allowedStrategies: string[];
}

export class MarketSelector {
  private hlClient: HyperliquidClient;
  private rankings: MarketRanking[] = [];
  private selectedSymbols: string[] = [];
  private lastUpdate: number = 0;

  constructor(hlClient: HyperliquidClient) {
    this.hlClient = hlClient;
  }

  async update() {
    console.log('[MarketSelector] Updating market rankings...');
    try {
      const data = await this.hlClient.getMetaAndAssetCtxs();
      const [meta, ctxs] = data;

      const results: MarketRanking[] = [];
      const filteredAssets = [];

      for (let i = 0; i < meta.universe.length; i++) {
        const universeItem = meta.universe[i];
        const symbol = universeItem.name;
        const ctx = ctxs[i];

        if (!ctx) continue;

        // 1. Initial Filtering (Fast)
        const volume24h = parseFloat(ctx.dayNtlVlm);
        const minVol = config.testnet ? 0 : config.min24hVolumeUsd;
        if (volume24h < minVol) continue;

        const markPrice = parseFloat(ctx.markPx);
        const midPrice = parseFloat(ctx.midPx);
        const spread = Math.abs(markPrice - midPrice) / midPrice;
        const maxSpread = config.testnet ? 0.01 : config.maxSpreadPercent;
        if (spread > maxSpread) continue;

        const fundingRate = parseFloat(ctx.funding);
        const maxFunding = config.testnet ? 0.01 : config.maxAbsFundingRate;
        if (Math.abs(fundingRate) > maxFunding) continue;

        filteredAssets.push({ symbol, universeItem, ctx, volume24h, markPrice, midPrice, spread, fundingRate });
      }

      console.log(`[MarketSelector] ${filteredAssets.length} assets passed initial filter. Fetching historical data...`);

      // 2. Fetch Historical Data (Parallel with limited concurrency)
      const batchSize = 3;
      for (let i = 0; i < filteredAssets.length; i += batchSize) {
        const batch = filteredAssets.slice(i, i + batchSize);
        await Promise.all(batch.map(async (asset) => {
          try {
            const { symbol, ctx, volume24h, markPrice, midPrice, spread, fundingRate } = asset;
            const endTime = Date.now();
            const startTime = endTime - config.marketLookbackDays * 24 * 60 * 60 * 1000;
            
            const candles = await this.hlClient.getCandles(symbol, '1h', startTime, endTime);
            
            const minCandles = config.testnet ? 10 : 100;
            if (!candles || candles.length < minCandles) return;

            // 3. Performance Metrics
            const prices = candles.map((c: any) => parseFloat(c.c));
            const firstPrice = prices[0];
            const lastPrice = prices[prices.length - 1];
            const return60d = (lastPrice - firstPrice) / firstPrice;

            const logReturns: number[] = [];
            for (let j = 1; j < prices.length; j++) {
              logReturns.push(Math.log(prices[j] / prices[j - 1]));
            }
            const mean = logReturns.reduce((a, b) => a + b, 0) / logReturns.length;
            const variance = logReturns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / logReturns.length;
            const volatility60d = Math.sqrt(variance) * Math.sqrt(365 * 24);

            // 4. Regime Detection
            const isTrending = Math.abs(return60d) > 0.1 || (volatility60d > 0.5 && Math.abs(return60d) > 0.05);
            const isChaotic = volatility60d > 2.0;

            let regime: 'RANGING' | 'TRENDING' | 'CHAOTIC' = 'RANGING';
            if (isChaotic) regime = 'CHAOTIC';
            else if (isTrending) regime = 'TRENDING';

            const allowedStrategies = [];
            if (regime === 'RANGING') allowedStrategies.push('GRID');
            if (regime === 'TRENDING') allowedStrategies.push('DCA');

            const backtestScore = regime !== 'CHAOTIC' ? 0.8 : 0.2;

            // 6. Ranking Scores
            // Hyper Lines / Most Traded Priority: Boost high volume
            const volScore = Math.min(1, volume24h / 100000000); // Max score at 100M
            const oiScore = Math.min(1, parseFloat(ctx.openInterest) * markPrice / 50000000);
            
            // Potential / Trend Velocity: Boost assets with strong but not over-extended trends
            const absReturn = Math.abs(return60d);
            const trendScore = absReturn > 0.3 ? 0.7 : (absReturn / 0.3); // Linear up to 30%, then slightly penalize over-extension
            
            const spreadScore = 1 - (spread / config.maxSpreadPercent);
            const fundingScore = 1 - (Math.abs(fundingRate) / config.maxAbsFundingRate);
            
            // Potential / Volatility Balance: Prefer "action" but not "chaos"
            const volPotentialScore = volatility60d > 0.3 && volatility60d < 1.5 ? 1 : (volatility60d > 1.5 ? 0.5 : 0.2);

            const score = (
              volScore * 0.40 + // Heavily weight volume (Hyper Lines)
              oiScore * 0.15 +
              trendScore * 0.15 + // Strong potential
              volPotentialScore * 0.10 +
              spreadScore * 0.10 +
              fundingScore * 0.05 +
              backtestScore * 0.05
            );

            results.push({
              symbol,
              score,
              data: {
                volume24h,
                openInterest: parseFloat(ctx.openInterest),
                spread,
                fundingRate,
                return60d,
                volatility60d,
                backtestScore
              },
              regime,
              allowedStrategies
            });
          } catch (e) {
            console.error(`[MarketSelector] Failed to process ${asset.symbol}:`, e);
          }
        }));
        
        // Add a small delay between batches to avoid hammering the API
        if (i + batchSize < filteredAssets.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Sort and Select
      this.rankings = results.sort((a, b) => b.score - a.score);
      this.selectedSymbols = this.rankings
        .slice(0, config.maxSelectedMarkets)
        .map(r => r.symbol);
      
      this.lastUpdate = Date.now();
      console.log(`[MarketSelector] Selected markets: ${this.selectedSymbols.join(', ')}`);
    } catch (error) {
      console.error('[MarketSelector] Update failed:', error);
    }
  }

  getSelectedSymbols() {
    return this.selectedSymbols;
  }

  getRankings() {
    return this.rankings;
  }

  getMarketRegime(symbol: string) {
    const market = this.rankings.find(r => r.symbol === symbol);
    return market ? market.regime : 'CHAOTIC';
  }
}
