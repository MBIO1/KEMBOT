process.env.HYPERLIQUID_PRIVATE_KEY = '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.LIVE_TRADING = 'false';
process.env.DRY_RUN = 'true';
process.env.TESTNET = 'true';

import { signL1Action } from '@nktkas/hyperliquid/signing';
import { privateKeyToAccount } from 'viem/accounts';
import { floatToWire } from '../src/backend/exchange/hyperliquidClient.ts';

async function testHyperliquidSigning() {
  const key = process.env.HYPERLIQUID_PRIVATE_KEY as `0x${string}`;
  const wallet = privateKeyToAccount(key);
  const nonce = 1_700_000_000_000;
  const action = {
    type: 'cancel' as const,
    cancels: [{ a: 0, o: 1 }],
  };

  const signature = await signL1Action({
    wallet,
    action,
    nonce,
    isTestnet: true,
  });

  const hasRsv =
    typeof signature.r === 'string' &&
    typeof signature.s === 'string' &&
    (signature.v === 27 || signature.v === 28);

  console.log('L1 action signature r/s/v present:', hasRsv ? 'PASS' : 'FAIL');

  const w1 = floatToWire(30000);
  const w2 = floatToWire(0.001);
  console.log('floatToWire price:', w1 === '30000' ? 'PASS' : `FAIL (got ${w1})`);
  console.log('floatToWire size:', w2 === '0.001' ? 'PASS' : `FAIL (got ${w2})`);
}

testHyperliquidSigning();
