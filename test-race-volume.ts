/**
 * Test V4 on-chain volume calculation for race pools
 */
import { createPublicClient, http, Address, keccak256, parseAbiItem, formatUnits } from 'viem';
import { base } from 'viem/chains';

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY;
const V4_POSITION_MANAGER = '0x7c5f5a4bbd8fd63184577525326123b519429bdc';
const V4_POOL_MANAGER = '0x498581ff718922c3f8e6a244956af099b2652b2b';

// Just test one position
const TEST_POSITION_ID = '1016630';

const BLOCKS_PER_DAY = 43200;

const V4_NFT_ABI = [
  {
    name: 'getPoolAndPositionInfo',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [
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
      { name: 'info', type: 'uint256' },
    ],
  },
] as const;

const SWAP_EVENT = parseAbiItem(
  'event Swap(bytes32 indexed id, address indexed sender, int128 amount0, int128 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick, uint24 fee)'
);

interface PoolKey {
  currency0: string;
  currency1: string;
  fee: number;
  tickSpacing: number;
  hooks: string;
}

function calculatePoolId(poolKey: PoolKey): `0x${string}` {
  const encoded =
    poolKey.currency0.slice(2).toLowerCase().padStart(64, '0') +
    poolKey.currency1.slice(2).toLowerCase().padStart(64, '0') +
    poolKey.fee.toString(16).padStart(64, '0') +
    poolKey.tickSpacing.toString(16).padStart(64, '0') +
    poolKey.hooks.slice(2).toLowerCase().padStart(64, '0');

  return keccak256(`0x${encoded}` as `0x${string}`);
}

async function main() {
  // Use public Base RPC for getLogs (supports larger block ranges)
  const rpcUrl = 'https://mainnet.base.org';

  const client = createPublicClient({
    chain: base,
    transport: http(rpcUrl),
  });

  console.log('=== Testing V4 On-Chain Volume ===\n');

  // Get pool key from position
  const [poolKey] = await client.readContract({
    address: V4_POSITION_MANAGER as Address,
    abi: V4_NFT_ABI,
    functionName: 'getPoolAndPositionInfo',
    args: [BigInt(TEST_POSITION_ID)],
  });

  const { currency0, currency1, fee, tickSpacing, hooks } = poolKey as any;

  console.log('Pool Key:');
  console.log('  currency0:', currency0);
  console.log('  currency1:', currency1);
  console.log('  fee:', Number(fee));
  console.log('  tickSpacing:', Number(tickSpacing));
  console.log('  hooks:', hooks);

  // Calculate pool ID
  const poolId = calculatePoolId({
    currency0,
    currency1,
    fee: Number(fee),
    tickSpacing: Number(tickSpacing),
    hooks,
  });

  console.log('\nPool ID:', poolId);

  // Get current block
  const currentBlock = await client.getBlockNumber();
  const fromBlock = currentBlock - BigInt(BLOCKS_PER_DAY);

  console.log(`\nFetching swaps from block ${fromBlock} to ${currentBlock}...`);

  // Fetch swap events
  const logs = await client.getLogs({
    address: V4_POOL_MANAGER as Address,
    event: SWAP_EVENT,
    args: {
      id: poolId,
    },
    fromBlock,
    toBlock: currentBlock,
  });

  console.log(`Found ${logs.length} swap events\n`);

  if (logs.length > 0) {
    console.log('First 5 swaps:');
    for (const log of logs.slice(0, 5)) {
      const { amount0, amount1 } = log.args as { amount0: bigint; amount1: bigint };
      console.log(`  Block ${log.blockNumber}: amount0=${amount0}, amount1=${amount1}`);
    }
  }
}

main().catch(console.error);
