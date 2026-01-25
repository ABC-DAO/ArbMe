/**
 * Test V4 StateView with a known pool
 */
import { createPublicClient, http, Address, keccak256 } from 'viem';
import { base } from 'viem/chains';

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY;
const V4_STATE_VIEW = '0xa3c0c9b65bad0b08107aa264b0f3db444b867a71';

const V4_STATE_VIEW_ABI = [
  {
    name: 'getSlot0',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'poolId', type: 'bytes32' },
    ],
    outputs: [
      { name: 'sqrtPriceX96', type: 'uint160' },
      { name: 'tick', type: 'int24' },
      { name: 'protocolFee', type: 'uint24' },
      { name: 'lpFee', type: 'uint24' },
    ],
  },
] as const;

function calculatePoolId(
  currency0: string,
  currency1: string,
  fee: number,
  tickSpacing: number,
  hooks: string
): `0x${string}` {
  const poolKeyEncoded =
    currency0.slice(2).toLowerCase().padStart(64, '0') +
    currency1.slice(2).toLowerCase().padStart(64, '0') +
    fee.toString(16).padStart(64, '0') +
    tickSpacing.toString(16).padStart(64, '0') +
    hooks.slice(2).toLowerCase().padStart(64, '0');

  return keccak256(`0x${poolKeyEncoded}` as `0x${string}`);
}

// WETH and USDC on Base
const WETH = '0x4200000000000000000000000000000000000006';
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

async function main() {
  const rpcUrl = ALCHEMY_KEY
    ? `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
    : 'https://mainnet.base.org';

  const client = createPublicClient({
    chain: base,
    transport: http(rpcUrl),
  });

  console.log('=== Testing V4 StateView with known pools ===\n');

  // Try different fee/tickSpacing combinations for USDC/WETH
  const testCases = [
    { fee: 500, tickSpacing: 10 },
    { fee: 3000, tickSpacing: 60 },
    { fee: 10000, tickSpacing: 200 },
    { fee: 100, tickSpacing: 1 },
  ];

  // Note: In Uniswap V4, currency0 < currency1 by address
  const [currency0, currency1] = USDC.toLowerCase() < WETH.toLowerCase()
    ? [USDC, WETH]
    : [WETH, USDC];

  console.log('currency0:', currency0);
  console.log('currency1:', currency1);
  console.log('');

  for (const { fee, tickSpacing } of testCases) {
    const hooks = '0x0000000000000000000000000000000000000000';
    const poolId = calculatePoolId(currency0, currency1, fee, tickSpacing, hooks);

    try {
      const slot0 = await client.readContract({
        address: V4_STATE_VIEW as Address,
        abi: V4_STATE_VIEW_ABI,
        functionName: 'getSlot0',
        args: [poolId],
      });
      console.log(`✓ fee=${fee}, tickSpacing=${tickSpacing}`);
      console.log(`  poolId: ${poolId}`);
      console.log(`  sqrtPriceX96: ${slot0[0].toString()}`);
      console.log(`  tick: ${slot0[1]}`);
    } catch (e: any) {
      console.log(`✗ fee=${fee}, tickSpacing=${tickSpacing} - ${e.shortMessage || e.message}`);
    }
  }
}

main().catch(console.error);
