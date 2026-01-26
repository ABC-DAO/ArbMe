import { NextRequest, NextResponse } from 'next/server'
import { buildGetRewardTransaction, RATCHET_STAKING_ADDRESS } from '@arbme/core-lib'

export async function POST(_request: NextRequest) {
  try {
    // Check if staking contract is deployed
    if (RATCHET_STAKING_ADDRESS === '0x0000000000000000000000000000000000000000') {
      return NextResponse.json(
        { error: 'Staking contract not yet deployed' },
        { status: 400 }
      )
    }

    const transaction = buildGetRewardTransaction()

    return NextResponse.json({
      success: true,
      transaction: {
        to: transaction.to,
        data: transaction.data,
        value: transaction.value,
      },
      description: 'Claim staking rewards',
    })
  } catch (error: any) {
    console.error('[staking/claim] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to build claim transaction' },
      { status: 500 }
    )
  }
}
