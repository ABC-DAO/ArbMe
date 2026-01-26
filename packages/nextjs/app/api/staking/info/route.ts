import { NextRequest, NextResponse } from 'next/server'
import {
  getStakingInfo,
  getStakingAllowance,
  getRatchetBalance,
  setStakingAlchemyKey,
  RATCHET_STAKING_ADDRESS,
} from '@arbme/core-lib'

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY

export async function GET(request: NextRequest) {
  try {
    const wallet = request.nextUrl.searchParams.get('wallet')

    if (!wallet) {
      return NextResponse.json(
        { error: 'Missing required parameter: wallet' },
        { status: 400 }
      )
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      )
    }

    // Check if staking contract is deployed
    if (RATCHET_STAKING_ADDRESS === '0x0000000000000000000000000000000000000000') {
      return NextResponse.json({
        success: true,
        contractDeployed: false,
        message: 'Staking contract not yet deployed',
        wallet,
        staked: '0',
        earned: '0',
        totalStaked: '0',
        rewardRate: '0',
        periodFinish: 0,
        apr: 0,
        allowance: '0',
        balance: '0',
      })
    }

    // Set Alchemy key for RPC calls
    setStakingAlchemyKey(ALCHEMY_KEY)

    // Fetch staking info, allowance, and balance in parallel
    const [stakingInfo, allowance, balance] = await Promise.all([
      getStakingInfo(wallet as `0x${string}`),
      getStakingAllowance(wallet as `0x${string}`),
      getRatchetBalance(wallet as `0x${string}`),
    ])

    return NextResponse.json({
      success: true,
      contractDeployed: true,
      wallet,
      ...stakingInfo,
      allowance: allowance.toString(),
      balance: balance.toString(),
    })
  } catch (error: any) {
    console.error('[staking/info] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch staking info' },
      { status: 500 }
    )
  }
}
