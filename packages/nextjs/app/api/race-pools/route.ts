import { NextResponse } from 'next/server'
import { createPublicClient, http, Address } from 'viem'
import { base } from 'viem/chains'

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY

// V4 Position Manager on Base
const V4_POSITION_MANAGER = '0x7c5f5a4bbd8fd63184577525326123b519429bdc'

// The 8 competing position IDs
const RACE_POSITION_IDS = [
  '1016630',
  '1016620',
  '1016603',
  '1016592',
  '1016591',
  '1016589',
  '1016586',
  '1016580',
]

// Race end time: Midnight UTC, Saturday Feb 1, 2026
const RACE_END_TIME = new Date('2026-02-01T00:00:00Z').getTime()

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
] as const

const ERC20_ABI = [
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
] as const

interface RacePool {
  positionId: string
  token0: { symbol: string; address: string }
  token1: { symbol: string; address: string }
  fee: number
  volume24h: number
  tvlUsd: number
  poolAddress: string | null
  rank: number
}

interface GeckoPool {
  address: string
  name: string
  volume24h: number
  tvlUsd: number
  fee: number
}

async function getTokenSymbol(client: any, address: string): Promise<string> {
  if (address === '0x0000000000000000000000000000000000000000') {
    return 'ETH'
  }
  try {
    const symbol = await client.readContract({
      address: address as Address,
      abi: ERC20_ABI,
      functionName: 'symbol',
    })
    return symbol as string
  } catch {
    return address.slice(0, 6) + '...'
  }
}

/**
 * Search GeckoTerminal for pools containing both tokens
 * Returns the best matching pool (by fee tier if possible)
 */
async function findPoolOnGeckoTerminal(
  token0: string,
  token1: string,
  targetFee: number
): Promise<GeckoPool | null> {
  try {
    // Search by the first token to find all its pools
    const searchToken = token0 === '0x0000000000000000000000000000000000000000'
      ? '0x4200000000000000000000000000000000000006' // Use WETH for native ETH
      : token0

    const url = `https://api.geckoterminal.com/api/v2/networks/base/tokens/${searchToken}/pools?page=1`
    const res = await fetch(url, { next: { revalidate: 60 } })

    if (!res.ok) {
      console.log(`[GeckoTerminal] Failed to fetch pools for ${searchToken}: ${res.status}`)
      return null
    }

    const data = await res.json() as any
    const pools = data?.data || []

    // Normalize token1 for comparison (handle native ETH)
    const normalizedToken1 = token1 === '0x0000000000000000000000000000000000000000'
      ? '0x4200000000000000000000000000000000000006'.toLowerCase()
      : token1.toLowerCase()

    // Find pools that contain both tokens
    const matchingPools: GeckoPool[] = []

    for (const pool of pools) {
      const attrs = pool.attributes
      const relationships = pool.relationships

      // Extract token addresses from relationships
      const baseTokenId = relationships?.base_token?.data?.id || ''
      const quoteTokenId = relationships?.quote_token?.data?.id || ''

      // GeckoTerminal uses format "base_0xaddress"
      const baseToken = baseTokenId.split('_')[1]?.toLowerCase() || ''
      const quoteToken = quoteTokenId.split('_')[1]?.toLowerCase() || ''

      // Check if this pool contains our second token
      const hasToken1 = baseToken === normalizedToken1 || quoteToken === normalizedToken1

      if (hasToken1) {
        // Parse fee from pool name (e.g., "TOKEN0 / TOKEN1 0.3%")
        const feeMatch = attrs.name?.match(/(\d+\.?\d*)%/)
        const poolFee = feeMatch ? parseFloat(feeMatch[1]) * 10000 : 0 // Convert to basis points

        matchingPools.push({
          address: attrs.address,
          name: attrs.name,
          volume24h: parseFloat(attrs.volume_usd?.h24 || '0'),
          tvlUsd: parseFloat(attrs.reserve_in_usd || '0'),
          fee: poolFee,
        })
      }
    }

    if (matchingPools.length === 0) {
      console.log(`[GeckoTerminal] No matching pools found for ${token0}/${token1}`)
      return null
    }

    // Try to find pool with matching fee tier
    const exactFeeMatch = matchingPools.find(p => Math.abs(p.fee - targetFee) < 100)
    if (exactFeeMatch) {
      console.log(`[GeckoTerminal] Found exact fee match: ${exactFeeMatch.name}`)
      return exactFeeMatch
    }

    // Otherwise return the highest volume pool
    matchingPools.sort((a, b) => b.volume24h - a.volume24h)
    console.log(`[GeckoTerminal] Using highest volume pool: ${matchingPools[0].name}`)
    return matchingPools[0]
  } catch (error) {
    console.error(`[GeckoTerminal] Error searching for pool:`, error)
    return null
  }
}

export async function GET() {
  try {
    const rpcUrl = ALCHEMY_KEY
      ? `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
      : 'https://mainnet.base.org'

    const client = createPublicClient({
      chain: base,
      transport: http(rpcUrl),
    })

    const pools: RacePool[] = []

    // Fetch pool info for each position
    for (const positionId of RACE_POSITION_IDS) {
      try {
        // Get pool key from position
        const [poolKey] = await client.readContract({
          address: V4_POSITION_MANAGER as Address,
          abi: V4_NFT_ABI,
          functionName: 'getPoolAndPositionInfo',
          args: [BigInt(positionId)],
        })

        const { currency0, currency1, fee } = poolKey as any

        // Get token symbols
        const [symbol0, symbol1] = await Promise.all([
          getTokenSymbol(client, currency0),
          getTokenSymbol(client, currency1),
        ])

        // Search GeckoTerminal for this pool to get volume
        const geckoPool = await findPoolOnGeckoTerminal(
          currency0,
          currency1,
          Number(fee)
        )

        pools.push({
          positionId,
          token0: { symbol: symbol0, address: currency0 },
          token1: { symbol: symbol1, address: currency1 },
          fee: Number(fee),
          volume24h: geckoPool?.volume24h || 0,
          tvlUsd: geckoPool?.tvlUsd || 0,
          poolAddress: geckoPool?.address || null,
          rank: 0,
        })
      } catch (err) {
        console.error(`Failed to fetch position ${positionId}:`, err)
      }
    }

    // Sort by 24h volume (primary metric for the race!) and assign ranks
    pools.sort((a, b) => b.volume24h - a.volume24h)
    pools.forEach((pool, index) => {
      pool.rank = index + 1
    })

    return NextResponse.json({
      pools,
      raceEndTime: RACE_END_TIME,
      lastUpdated: Date.now(),
      metric: 'volume24h', // Indicate what we're ranking by
    })
  } catch (error: any) {
    console.error('[race-pools] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch race pools' },
      { status: 500 }
    )
  }
}
