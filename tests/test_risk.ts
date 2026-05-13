import { RiskEngine } from '../src/backend/risk/riskEngine.ts';
import { initDb } from '../src/backend/db/session.ts';

async function testRiskEngine() {
  initDb();
  const risk = new RiskEngine({
    maxLeverage: 3,
    maxPositionSize: 1000,
    maxDailyLoss: 100,
    maxOpenOrders: 5,
    maxExposurePerCoin: 0.5,
  });

  const accountValue = 2000;
  const currentPositions: any[] = [];
  const order = { symbol: 'BTC', price: 60000, size: 0.1, reduceOnly: false };

  const result = await risk.validateOrder(order, currentPositions, accountValue, 0);
  console.log('Test 1 (Over size):', result.allowed === false ? 'PASS' : 'FAIL');

  const smallOrder = { symbol: 'BTC', price: 60000, size: 0.01, reduceOnly: false };
  const result2 = await risk.validateOrder(smallOrder, currentPositions, accountValue, 0);
  console.log('Test 2 (Allowed):', result2.allowed === true ? 'PASS' : 'FAIL');

  const positionsWithExposure = [
    { position: { coin: 'BTC', szi: '0.08', entryPx: '60000' } },
  ];
  const orderExposure = { symbol: 'BTC', price: 60000, size: 0.005, reduceOnly: false };
  const result3 = await risk.validateOrder(orderExposure, positionsWithExposure, 10000, 0);
  console.log('Test 3 (Exposure per coin exceeded):', result3.allowed === false ? 'PASS' : 'FAIL');

  const result4 = await risk.validateOrder(smallOrder, [], accountValue, 5);
  console.log('Test 4 (Open orders limit):', result4.allowed === false ? 'PASS' : 'FAIL');

  const lossPositions = [
    { position: { coin: 'BTC', szi: '0.1', entryPx: '60000', curPx: '59000' } },
  ];
  const lossResult = risk.validateDailyLoss(lossPositions, accountValue);
  console.log('Test 5 (Daily loss kill switch):', lossResult.allowed === false && lossResult.killSwitch ? 'PASS' : 'FAIL');
}

testRiskEngine();
