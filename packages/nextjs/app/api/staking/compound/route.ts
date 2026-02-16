import { NextRequest, NextResponse } from 'next/server'
import {
  buildCompoundTransactions,
  getStakingInfo,
  getStakingAllowance,
  setStakingAlchemyKey,
  RATCHET_STAKING_ADDRESS,
} from '@arbme/core-lib'

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY

export async function POST(request: NextRequest) {
  try {
    const { wallet } = await request.json()

    if (!wallet) {
      return NextResponse.json(
        { error: 'Missing required parameter: wallet' },
        { status: 400 }
      )
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      )
    }

    if (RATCHET_STAKING_ADDRESS === '0x0000000000000000000000000000000000000000') {
      return NextResponse.json(
        { error: 'Staking contract not yet deployed' },
        { status: 400 }
      )
    }

    // Set Alchemy key for RPC calls
    setStakingAlchemyKey(ALCHEMY_KEY)

    // Read earned amount and allowance server-side for consistency
    const [stakingInfo, allowance] = await Promise.all([
      getStakingInfo(wallet as `0x${string}`),
      getStakingAllowance(wallet as `0x${string}`),
    ])

    const earnedAmount = stakingInfo.earned

    if (BigInt(earnedAmount) === 0n) {
      return NextResponse.json(
        { error: 'No rewards to compound' },
        { status: 400 }
      )
    }

    const transactions = buildCompoundTransactions(earnedAmount)
    const needsApproval = allowance < BigInt(earnedAmount)

    return NextResponse.json({
      success: true,
      transactions: transactions.map(tx => ({
        to: tx.to,
        data: tx.data,
        value: tx.value,
      })),
      needsApproval,
      earnedAmount,
      description: 'Compound staking rewards (claim + re-stake)',
    })
  } catch (error: any) {
    console.error('[staking/compound] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to build compound transactions' },
      { status: 500 }
    )
  }
}
