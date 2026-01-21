import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY
const PROVIDER_URL = ALCHEMY_KEY
  ? `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
  : 'https://mainnet.base.org'

const ERC20_ABI = [
  'function allowance(address owner, address spender) view returns (uint256)',
]

export async function POST(request: NextRequest) {
  try {
    const {
      token0,
      token1,
      owner,
      spender,
      amount0Required,
      amount1Required,
    } = await request.json()

    console.log('[check-approvals] Request:', { token0, token1, owner, spender, amount0Required, amount1Required })

    if (!token0 || !token1 || !owner || !spender) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    console.log('[check-approvals] Using RPC:', PROVIDER_URL)

    const provider = new ethers.providers.JsonRpcProvider(PROVIDER_URL)

    // Create contract instances
    const token0Contract = new ethers.Contract(token0, ERC20_ABI, provider)
    const token1Contract = new ethers.Contract(token1, ERC20_ABI, provider)

    console.log('[check-approvals] Fetching allowances...')

    // Fetch allowances with timeout
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('RPC request timeout after 10s')), 10000)
    )

    const [token0Allowance, token1Allowance] = await Promise.race([
      Promise.all([
        token0Contract.allowance(owner, spender),
        token1Contract.allowance(owner, spender),
      ]),
      timeoutPromise
    ]) as [any, any]

    console.log('[check-approvals] Allowances fetched:', {
      token0Allowance: token0Allowance.toString(),
      token1Allowance: token1Allowance.toString()
    })

    // Convert required amounts to BigNumber
    const amount0RequiredBN = ethers.BigNumber.from(amount0Required || '0')
    const amount1RequiredBN = ethers.BigNumber.from(amount1Required || '0')

    // Check if approvals are needed
    const token0NeedsApproval = token0Allowance.lt(amount0RequiredBN)
    const token1NeedsApproval = token1Allowance.lt(amount1RequiredBN)

    console.log('[check-approvals] Success:', { token0NeedsApproval, token1NeedsApproval })

    return NextResponse.json({
      token0NeedsApproval,
      token1NeedsApproval,
      token0Allowance: token0Allowance.toString(),
      token1Allowance: token1Allowance.toString(),
    })
  } catch (error: any) {
    console.error('[check-approvals] Error:', error.message, error.stack)
    return NextResponse.json(
      { error: error.message || 'Failed to check approvals' },
      { status: 500 }
    )
  }
}
