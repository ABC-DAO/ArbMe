import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY
const PROVIDER_URL = ALCHEMY_KEY
  ? `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
  : 'https://mainnet.base.org'

// Minimal ERC20 ABI
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
]

export async function POST(request: NextRequest) {
  try {
    const { tokenAddress, walletAddress } = await request.json()

    console.log('[token-balance] Request:', { tokenAddress, walletAddress })

    if (!tokenAddress || !walletAddress) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    console.log('[token-balance] Using RPC:', PROVIDER_URL)

    const provider = new ethers.providers.JsonRpcProvider(PROVIDER_URL)
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider)

    console.log('[token-balance] Fetching balance and decimals...')

    // Fetch balance and decimals with timeout
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('RPC request timeout after 10s')), 10000)
    )

    const [balanceWei, decimals] = await Promise.race([
      Promise.all([
        contract.balanceOf(walletAddress),
        contract.decimals(),
      ]),
      timeoutPromise
    ]) as [any, any]

    console.log('[token-balance] Success:', { balanceWei: balanceWei.toString(), decimals: Number(decimals) })

    // Format balance
    const balanceFormatted = ethers.utils.formatUnits(balanceWei, decimals)

    return NextResponse.json({
      balanceWei: balanceWei.toString(),
      balanceFormatted,
      decimals: Number(decimals),
    })
  } catch (error: any) {
    console.error('[token-balance] Error:', error.message, error.stack)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch balance' },
      { status: 500 }
    )
  }
}
