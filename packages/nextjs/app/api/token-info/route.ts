import { NextRequest, NextResponse } from 'next/server'
import { getTokenMetadata, ARBME } from '@arbme/core-lib'

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY

// Known tokens - instant lookup, no RPC needed
const KNOWN_TOKENS: Record<string, { symbol: string; decimals: number }> = {
  [ARBME.address.toLowerCase()]: { symbol: 'ARBME', decimals: 18 },
  '0x4200000000000000000000000000000000000006': { symbol: 'WETH', decimals: 18 },
  '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': { symbol: 'USDC', decimals: 6 },
  '0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf': { symbol: 'cbBTC', decimals: 8 },
  '0x50c5725949a6f0c72e6c4a641f24049a917db0cb': { symbol: 'DAI', decimals: 18 },
  '0x0578d8a44db98b23bf096a382e016e29a5ce0ffe': { symbol: 'HIGHER', decimals: 18 },
  '0x532f27101965dd16442e59d40670faf5ebb142e4': { symbol: 'BRETT', decimals: 18 },
  '0xca5228d0c54b0a10e5a77c2c436e5e0bbafd8dc8': { symbol: 'PAGE', decimals: 18 },
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const address = searchParams.get('address')

    if (!address) {
      return NextResponse.json(
        { error: 'Missing token address' },
        { status: 400 }
      )
    }

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json(
        { error: 'Invalid token address format' },
        { status: 400 }
      )
    }

    // Check known tokens first (instant, no RPC)
    const knownToken = KNOWN_TOKENS[address.toLowerCase()]
    if (knownToken) {
      return NextResponse.json({
        address,
        symbol: knownToken.symbol,
        decimals: knownToken.decimals,
      })
    }

    // Fall back to RPC for unknown tokens
    const metadata = await getTokenMetadata(address, ALCHEMY_KEY)

    return NextResponse.json({
      address: metadata.address,
      symbol: metadata.symbol,
      decimals: metadata.decimals,
    })
  } catch (error: any) {
    console.error('[token-info] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch token info' },
      { status: 500 }
    )
  }
}
