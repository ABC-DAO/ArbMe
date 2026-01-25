/**
 * Test V4 position details directly
 */
import { createPublicClient, http, Address } from 'viem';
import { base } from 'viem/chains';

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY;
const V4_POSITION_MANAGER = '0x7c5f5a4bbd8fd63184577525326123b519429bdc';

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
  {
    name: 'getPositionLiquidity',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: 'liquidity', type: 'uint128' }],
  },
] as const;

// Position 982740 from our error logs
const TOKEN_ID = 982740n;

async function main() {
  const rpcUrl = ALCHEMY_KEY
    ? `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
    : 'https://mainnet.base.org';

  const client = createPublicClient({
    chain: base,
    transport: http(rpcUrl),
  });

  console.log('=== V4 Position Debug ===');
  console.log('Token ID:', TOKEN_ID.toString());

  try {
    const [poolKey, packedInfo] = await client.readContract({
      address: V4_POSITION_MANAGER as Address,
      abi: V4_NFT_ABI,
      functionName: 'getPoolAndPositionInfo',
      args: [TOKEN_ID],
    });

    console.log('\nPool Key from position:');
    console.log('  currency0:', poolKey.currency0);
    console.log('  currency1:', poolKey.currency1);
    console.log('  fee:', poolKey.fee);
    console.log('  tickSpacing:', poolKey.tickSpacing);
    console.log('  hooks:', poolKey.hooks);
    console.log('\nPacked Info (raw):', packedInfo.toString());
    console.log('Packed Info (hex):', '0x' + packedInfo.toString(16));

    // Extract ticks from packed info
    // Layout (from LSB): hasSubscriber (8 bits) | tickLower (24 bits) | tickUpper (24 bits) | poolId (200 bits)
    // Must skip hasSubscriber first
    const shifted = packedInfo >> BigInt(8);
    const tickLowerRaw = Number(shifted & BigInt(0xFFFFFF));
    const tickUpperRaw = Number((shifted >> BigInt(24)) & BigInt(0xFFFFFF));

    // Convert from unsigned to signed
    const tickLower = tickLowerRaw > 0x7FFFFF ? tickLowerRaw - 0x1000000 : tickLowerRaw;
    const tickUpper = tickUpperRaw > 0x7FFFFF ? tickUpperRaw - 0x1000000 : tickUpperRaw;

    console.log('\nExtracted ticks:');
    console.log('  tickLower:', tickLower);
    console.log('  tickUpper:', tickUpper);

    // Check liquidity
    const liquidity = await client.readContract({
      address: V4_POSITION_MANAGER as Address,
      abi: V4_NFT_ABI,
      functionName: 'getPositionLiquidity',
      args: [TOKEN_ID],
    });

    console.log('\nLiquidity:', liquidity.toString());

    // Check if the currency addresses look valid (not zero)
    if (poolKey.currency0 === '0x0000000000000000000000000000000000000000') {
      console.log('\n⚠️  currency0 is zero address!');
    }
    if (poolKey.currency1 === '0x0000000000000000000000000000000000000000') {
      console.log('\n⚠️  currency1 is zero address!');
    }

    // Try to get slot0 for this pool via StateView
    const V4_STATE_VIEW = '0xa3c0c9b65bad0b08107aa264b0f3db444b867a71';
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

    console.log('\n=== Testing getSlot0 via StateView ===');
    console.log('StateView address:', V4_STATE_VIEW);
    console.log('PoolKey for getSlot0:', {
      currency0: poolKey.currency0,
      currency1: poolKey.currency1,
      fee: poolKey.fee,
      tickSpacing: poolKey.tickSpacing,
      hooks: poolKey.hooks,
    });

    try {
      const slot0 = await client.readContract({
        address: V4_STATE_VIEW as Address,
        abi: V4_STATE_VIEW_ABI,
        functionName: 'getSlot0',
        args: [poolKey],
      });
      console.log('✓ getSlot0 succeeded!');
      console.log('  sqrtPriceX96:', slot0[0].toString());
      console.log('  tick:', slot0[1]);
      console.log('  protocolFee:', slot0[2]);
      console.log('  lpFee:', slot0[3]);
    } catch (e: any) {
      console.log('✗ getSlot0 failed:', e.shortMessage || e.message);
    }

  } catch (error: any) {
    console.error('Error:', error.shortMessage || error.message);
  }
}

main().catch(console.error);
