process.env.HYPERLIQUID_PRIVATE_KEY = '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.LIVE_TRADING = 'false';
process.env.DRY_RUN = 'true';
process.env.TESTNET = 'true';

async function testHyperliquidSigning() {
  const { HyperliquidClient } = await import('../src/backend/exchange/hyperliquidClient.ts');

  const client = new HyperliquidClient();
  const order = {
    symbol: 'BTC',
    isBuy: true,
    price: 30000,
    size: 0.001,
    reduceOnly: false,
  };

  const signature = await client.signOrder(order);
  const recoveredAddress = await client.verifyOrderSignature(order, signature);
  const walletAddress = client.getWalletAddress();

  console.log('Hyperliquid signing generated signature:', signature ? 'PASS' : 'FAIL');
  console.log('Hyperliquid signature recover matches wallet:', recoveredAddress?.toLowerCase() === walletAddress?.toLowerCase() ? 'PASS' : 'FAIL');
}

testHyperliquidSigning();
