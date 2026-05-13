import { MarketSelector } from '../services/marketSelector.ts';
import { HyperliquidClient } from '../exchange/hyperliquidClient.ts';
import { config } from '../config.ts';

// Mock HyperliquidClient
const mockHlClient = {
  getMetaAndAssetCtxs: async () => [
    { universe: [{ name: 'BTC' }, { name: 'ETH' }, { name: 'LOW_VOL' }, { name: 'HIGH_SPREAD' }, { name: 'HIGH_FUNDING' }] },
    [
      // BTC - Best
      { dayNtlVlm: '1000000000', markPx: '60000', midPx: '60000', funding: '0.0001', openInterest: '10000' },
      // ETH - Second
      { dayNtlVlm: '200000000', markPx: '3000', midPx: '3000', funding: '0.0001', openInterest: '10000' },
      // LOW_VOL - Filtered
      { dayNtlVlm: '10000000', markPx: '1', midPx: '1', funding: '0.0001', openInterest: '100' },
      // HIGH_SPREAD - Filtered
      { dayNtlVlm: '100000000', markPx: '100', midPx: '101', funding: '0.0001', openInterest: '1000' },
      // HIGH_FUNDING - Filtered
      { dayNtlVlm: '100000000', markPx: '100', midPx: '100', funding: '0.001', openInterest: '1000' },
    ]
  ],
  getCandles: async () => {
    // Return dummy 60 day 1h candles
    return Array.from({ length: 1440 }, (_, i) => ({
      t: Date.now() - (1440 - i) * 3600000,
      c: (100 + i * 0.01).toString()
    }));
  }
} as any;

async function runTests() {
  console.log('--- Running MarketSelector Tests ---');
  
  const selector = new MarketSelector(mockHlClient);
  
  // Test 1: Update and Filtering
  await selector.update();
  const selected = selector.getSelectedSymbols();
  const rankings = selector.getRankings();
  
  console.log('Selected:', selected);
  rankings.forEach(r => console.log(`${r.symbol}: ${r.score.toFixed(4)}`));
  
  if (selected.includes('BTC') && selected.includes('ETH')) {
    console.log('✅ Pass: BTC and ETH included');
  } else {
    console.error('❌ Fail: BTC or ETH missing');
  }
  
  if (!selected.includes('LOW_VOL')) {
    console.log('✅ Pass: LOW_VOL filtered');
  } else {
    console.error('❌ Fail: LOW_VOL included');
  }
  
  if (!selected.includes('HIGH_SPREAD')) {
    console.log('✅ Pass: HIGH_SPREAD filtered');
  } else {
    console.error('❌ Fail: HIGH_SPREAD included');
  }
  
  if (!selected.includes('HIGH_FUNDING')) {
    console.log('✅ Pass: HIGH_FUNDING filtered');
  } else {
    console.error('❌ Fail: HIGH_FUNDING included');
  }
  
  // Test 2: Ranking Logic
  if (rankings[0].symbol === 'BTC' && rankings[0].score > rankings[1].score) {
    console.log('✅ Pass: BTC ranked higher than ETH due to volume');
  } else {
    console.error('❌ Fail: Ranking order incorrect');
  }
  
  console.log('--- Tests Complete ---');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}
