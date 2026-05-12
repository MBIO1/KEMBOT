import { RiskEngine } from '../src/backend/risk/riskEngine.ts';

async function testRiskEngine() {
  const risk = new RiskEngine({
    maxLeverage: 3,
    maxPositionSize: 1000,
    maxDailyLoss: 100,
    maxOpenOrders: 5,
    maxExposurePerCoin: 0.5
  });

  const accountValue = 2000;
  const currentPositions: any[] = [];
  const order = { symbol: 'BTC', price: 60000, size: 0.1 }; // $6000 order

  const result = await risk.validateOrder(order, currentPositions, accountValue);
  console.log('Test 1 (Over size):', result.allowed === false ? 'PASS' : 'FAIL');

  const smallOrder = { symbol: 'BTC', price: 60000, size: 0.01 }; // $600 order
  const result2 = await risk.validateOrder(smallOrder, currentPositions, accountValue);
  console.log('Test 2 (Allowed):', result2.allowed === true ? 'PASS' : 'FAIL');
}

testRiskEngine();
