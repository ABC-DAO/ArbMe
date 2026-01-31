import { NextRequest, NextResponse } from 'next/server'
import { getRecentSwaps, SwapEvent } from '@/lib/swap-store'

// ═══════════════════════════════════════════════════════════════════════════════
// Token Metadata (for enriching swap data)
// ═══════════════════════════════════════════════════════════════════════════════

const TOKEN_INFO: Record<string, { symbol: string; decimals: number; name: string }> = {
  '0xc647421c5dc78d1c3960faa7a33f9aefdf4b7b07': {
    symbol: 'ARBME',
    decimals: 18,
    name: 'Arbitrage Mesh',
  },
  '0x392bc5deea227043d69af0e67badbcbbaed511b07': {
    symbol: 'RATCHET',
    decimals: 18,
    name: 'Ratchet',
  },
  '0x5c0872b790bb73e2b3a9778db6e7704095624b07': {
    symbol: 'ABC',
    decimals: 18,
    name: 'ABC Token',
  },
  '0x4200000000000000000000000000000000000006': {
    symbol: 'WETH',
    decimals: 18,
    name: 'Wrapped Ether',
  },
  '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': {
    symbol: 'USDC',
    decimals: 6,
    name: 'USD Coin',
  },
}

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface EnrichedSwap extends SwapEvent {
  tokenInInfo?: { symbol: string; decimals: number; name: string }
  tokenOutInfo?: { symbol: string; decimals: number; name: string }
  formattedAmountIn?: string
  formattedAmountOut?: string
  explorerUrl: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════════

function formatAmount(amount: string, decimals: number): string {
  try {
    const value = BigInt(amount)
    const divisor = BigInt(10 ** decimals)
    const whole = value / divisor
    const remainder = value % divisor

    if (remainder === BigInt(0)) {
      return whole.toString()
    }

    const remainderStr = remainder.toString().padStart(decimals, '0')
    const trimmed = remainderStr.replace(/0+$/, '')

    return `${whole}.${trimmed}`
  } catch {
    return amount
  }
}

function enrichSwap(swap: SwapEvent): EnrichedSwap {
  const tokenInAddr = swap.tokenIn.toLowerCase()
  const tokenOutAddr = swap.tokenOut.toLowerCase()

  const tokenInInfo = TOKEN_INFO[tokenInAddr]
  const tokenOutInfo = TOKEN_INFO[tokenOutAddr]

  return {
    ...swap,
    tokenInInfo,
    tokenOutInfo,
    formattedAmountIn: tokenInInfo
      ? formatAmount(swap.amountIn, tokenInInfo.decimals)
      : swap.amountIn,
    formattedAmountOut: tokenOutInfo
      ? formatAmount(swap.amountOut, tokenOutInfo.decimals)
      : swap.amountOut,
    explorerUrl: `https://basescan.org/tx/${swap.txHash}`,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API Handler
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  // Parse query params
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
  const token = searchParams.get('token')?.toLowerCase()
  const pool = searchParams.get('pool')?.toLowerCase()

  try {
    let swaps = getRecentSwaps(100) // Get all, then filter

    // Filter by token if specified
    if (token) {
      swaps = swaps.filter(
        s =>
          s.tokenIn.toLowerCase() === token ||
          s.tokenOut.toLowerCase() === token
      )
    }

    // Filter by pool if specified
    if (pool) {
      swaps = swaps.filter(s => s.poolAddress.toLowerCase() === pool)
    }

    // Apply limit after filtering
    swaps = swaps.slice(0, limit)

    // Enrich with token metadata
    const enrichedSwaps = swaps.map(enrichSwap)

    return NextResponse.json({
      count: enrichedSwaps.length,
      swaps: enrichedSwaps,
      filters: {
        token: token || null,
        pool: pool || null,
        limit,
      },
    })
  } catch (error) {
    console.error('[Swaps API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch swaps' },
      { status: 500 }
    )
  }
}
