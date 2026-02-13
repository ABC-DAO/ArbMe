import { NextRequest, NextResponse } from 'next/server'
import { encodeFunctionData } from 'viem'
import { CHAOS_GAUGES } from '@/utils/constants'

export async function POST(request: NextRequest) {
  try {
    const { gaugeIndex, amount } = await request.json()

    if (gaugeIndex === undefined || gaugeIndex < 0 || gaugeIndex >= CHAOS_GAUGES.length) {
      return NextResponse.json({ error: 'Invalid gauge index' }, { status: 400 })
    }
    if (!amount) return NextResponse.json({ error: 'Missing amount' }, { status: 400 })
    try { BigInt(amount) } catch { return NextResponse.json({ error: 'Invalid amount' }, { status: 400 }) }

    const gauge = CHAOS_GAUGES[gaugeIndex]
    if (gauge.gaugeAddress === '0x0000000000000000000000000000000000000000') {
      return NextResponse.json({ error: `${gauge.symbol} gauge not yet deployed` }, { status: 400 })
    }

    const data = encodeFunctionData({
      abi: [{
        name: 'notifyRewardAmount',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [{ name: 'reward', type: 'uint256' }],
        outputs: [],
      }],
      functionName: 'notifyRewardAmount',
      args: [BigInt(amount)],
    })

    return NextResponse.json({
      success: true,
      transaction: { to: gauge.gaugeAddress, data, value: '0' },
      description: `Notify ${gauge.symbol} gauge with reward amount`,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to build notify tx' }, { status: 500 })
  }
}
