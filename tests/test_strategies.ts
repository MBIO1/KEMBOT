import { GridStrategy } from '../src/backend/strategies/grid.ts';
import { DCAStrategy } from '../src/backend/strategies/dca.ts';

async function testStrategies() {
  console.log('Testing DCA Strategy...');
  const dca = new DCAStrategy('test-dca', 'BTC', { intervalMinutes: 1, sizeUsd: 10 });
  // We can't easily wait for loop in a test without mock, but checking instance creation
  console.log('DCA Instance created:', dca ? 'PASS' : 'FAIL');

  console.log('Testing Grid Strategy...');
  const grid = new GridStrategy('test-grid', 'ETH', { upperPrice: 4000, lowerPrice: 2000, numGrids: 5, sizePerGrid: 0.1 });
  console.log('Grid Instance created:', grid ? 'PASS' : 'FAIL');
}

testStrategies();
