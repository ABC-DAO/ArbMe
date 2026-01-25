/**
 * Test V4 pool slot0 fetch
 */
import { createPublicClient, http, Address, keccak256 } from 'viem';
import { base } from 'viem/chains';

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY;
const V4_STATE_VIEW = '0xa3c0c9b65bad0b08107aa264b0f3db444b867a71';
const V4_POOL_MANAGER = '0x498581fF718922c3f8e6A244956aF099B2652b2b'; // Uniswap V4 PoolManager on Base

const V4_STATE_VIEW_ABI = [
  {
    name: 'getSlot0',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      {
        name: 'poolKey',
        type: 'tuple',
        components: [
          { name: 'currency0', type: 'address' },
          { name: 'currency1', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'tickSpacing', type: 'int24' },
          { name: 'hooks', type: 'address' },
        ],
      },
    ],
    outputs: [
      { name: 'sqrtPriceX96', type: 'uint160' },
      { name: 'tick', type: 'int24' },
      { name: 'protocolFee', type: 'uint24' },
      { name: 'lpFee', type: 'uint24' },
    ],
  },
] as const;

// Pool manager ABI for checking if pool is initialized
const POOL_MANAGER_ABI = [
  {
    name: 'isPoolInitialized',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      {
        name: 'id',
        type: 'bytes32',
      },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

// Calculate pool ID from poolKey
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

async function main() {
  const rpcUrl = ALCHEMY_KEY
    ? `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
    : 'https://mainnet.base.org';

  const client = createPublicClient({
    chain: base,
    transport: http(rpcUrl),
  });

  // The problematic pool from the error
  const poolKey = {
    currency0: '0x1bc0c42215582d5A085795f4baDbaC3ff36d1Bcb' as Address, // CLANKER
    currency1: '0xC647421C5Dc78D1c3960faA7A33f9aEFDF4B7B07' as Address, // ARBME
    fee: 30000,
    tickSpacing: 200,
    hooks: '0x0000000000000000000000000000000000000000' as Address,
  };

  console.log('=== V4 Pool Debug ===');
  console.log('Pool Key:', poolKey);

  // Calculate pool ID
  const poolId = calculatePoolId(
    poolKey.currency0,
    poolKey.currency1,
    poolKey.fee,
    poolKey.tickSpacing,
    poolKey.hooks
  );
  console.log('Pool ID:', poolId);

  // Check if pool is initialized
  try {
    const isInitialized = await client.readContract({
      address: V4_POOL_MANAGER as Address,
      abi: POOL_MANAGER_ABI,
      functionName: 'isPoolInitialized',
      args: [poolId],
    });
    console.log('Pool initialized:', isInitialized);
  } catch (error) {
    console.log('Error checking isPoolInitialized:', error);
  }

  // Try to get slot0
  try {
    console.log('\nTrying getSlot0...');
    const slot0 = await client.readContract({
      address: V4_STATE_VIEW as Address,
      abi: V4_STATE_VIEW_ABI,
      functionName: 'getSlot0',
      args: [poolKey],
    });
    console.log('Slot0 result:', {
      sqrtPriceX96: slot0[0].toString(),
      tick: slot0[1],
      protocolFee: slot0[2],
      lpFee: slot0[3],
    });
  } catch (error: any) {
    console.log('getSlot0 failed:', error.shortMessage || error.message);
  }

  // Try with different tick spacings
  console.log('\n=== Trying different tick spacings ===');
  const tickSpacings = [10, 60, 200, 600, 1000, 2000];

  for (const ts of tickSpacings) {
    const testKey = { ...poolKey, tickSpacing: ts };
    const testPoolId = calculatePoolId(
      testKey.currency0,
      testKey.currency1,
      testKey.fee,
      testKey.tickSpacing,
      testKey.hooks
    );

    try {
      const isInit = await client.readContract({
        address: V4_POOL_MANAGER as Address,
        abi: POOL_MANAGER_ABI,
        functionName: 'isPoolInitialized',
        args: [testPoolId],
      });

      if (isInit) {
        console.log(`✓ tickSpacing=${ts} - POOL EXISTS!`);

        // Get slot0 for this pool
        const slot0 = await client.readContract({
          address: V4_STATE_VIEW as Address,
          abi: V4_STATE_VIEW_ABI,
          functionName: 'getSlot0',
          args: [testKey],
        });
        console.log('  sqrtPriceX96:', slot0[0].toString());
        console.log('  tick:', slot0[1]);
      } else {
        console.log(`✗ tickSpacing=${ts} - not initialized`);
      }
    } catch (error) {
      console.log(`✗ tickSpacing=${ts} - error`);
    }
  }
}

main().catch(console.error);
