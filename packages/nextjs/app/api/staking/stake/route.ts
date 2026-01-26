import { NextRequest, NextResponse } from 'next/server'
import { buildStakeTransaction, RATCHET_STAKING_ADDRESS } from '@arbme/core-lib'

export async function POST(request: NextRequest) {
  try {
    const { amount } = await request.json()

    if (!amount) {
      return NextResponse.json(
        { error: 'Missing required parameter: amount' },
        { status: 400 }
      )
    }

    // Validate amount is a valid number
    try {
      BigInt(amount)
    } catch {
      return NextResponse.json(
        { error: 'Invalid amount format' },
        { status: 400 }
      )
    }

    // Check if staking contract is deployed
    if (RATCHET_STAKING_ADDRESS === '0x0000000000000000000000000000000000000000') {
      return NextResponse.json(
        { error: 'Staking contract not yet deployed' },
        { status: 400 }
      )
    }

    const transaction = buildStakeTransaction(amount)

    return NextResponse.json({
      success: true,
      transaction: {
        to: transaction.to,
        data: transaction.data,
        value: transaction.value,
      },
      description: 'Stake $RATCHET tokens',
    })
  } catch (error: any) {
    console.error('[staking/stake] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to build stake transaction' },
      { status: 500 }
    )
  }
}
