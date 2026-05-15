import { HyperliquidSignalService } from '../src/backend/signals/hyperliquidSignalService.ts';

class FakeHyperliquidClient {
  async getMetaAndAssetCtxs() {
    return [
      { universe: [{ name: 'BTC' }, { name: 'ETH' }, { name: 'SOL' }, { name: 'SUI' }, { name: 'ARB' }] },
      [
        { dayNtlVlm: '1000000', midPrice: '69000', prevDayPrice: '68000', winRate: '0.72' },
        { dayNtlVlm: '750000', midPrice: '3800', prevDayPrice: '3700', winRate: '0.68' },
        { dayNtlVlm: '540000', midPrice: '120', prevDayPrice: '115', winRate: '0.70' },
        { dayNtlVlm: '220000', midPrice: '40', prevDayPrice: '38', winRate: '0.65' },
        { dayNtlVlm: '180000', midPrice: '1.05', prevDayPrice: '1.02', winRate: '0.67' },
      ],
    ];
  }

  async getTradingHistory(symbol: string) {
    if (symbol === 'BTC') {
      return [{ c: '66000' }, { c: '67000' }, { c: '68000' }, { c: '69000' }];
    }
    if (symbol === 'ETH') {
      return [{ c: '3600' }, { c: '3700' }, { c: '3800' }];
    }
    return [];
  }
}

async function testSignalService() {
  const service = new HyperliquidSignalService(new FakeHyperliquidClient() as any);

  const topPairs = await service.getTopTradedPairs();
  console.log('Top Pairs Length:', topPairs.length === 5 ? 'PASS' : 'FAIL');
  console.log('Top Pair Symbols:', topPairs.map((p: { symbol: string }) => p.symbol).join(', '));

  const topo = await service.getTopSignals();
  console.log('Signals Length:', topo.length === 5 ? 'PASS' : 'FAIL');
  console.log('BTC Signal Exists:', topo.some((item) => item.symbol === 'BTC') ? 'PASS' : 'FAIL');
}

testSignalService();
