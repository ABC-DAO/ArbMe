import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY

const client = createPublicClient({
  chain: base,
  transport: http(`https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const hash = searchParams.get('hash')

    if (!hash) {
      return NextResponse.json(
        { error: 'Missing required parameter: hash' },
        { status: 400 }
      )
    }

    // Validate hash format
    if (!/^0x[a-fA-F0-9]{64}$/.test(hash)) {
      return NextResponse.json(
        { error: 'Invalid transaction hash format' },
        { status: 400 }
      )
    }

    try {
      const receipt = await client.getTransactionReceipt({
        hash: hash as `0x${string}`,
      })

      if (receipt) {
        return NextResponse.json({
          status: receipt.status === 'success' ? 'success' : 'failed',
          blockNumber: receipt.blockNumber.toString(),
          gasUsed: receipt.gasUsed.toString(),
        })
      }
    } catch (err: any) {
      // Transaction not yet mined - getTransactionReceipt throws when receipt not found
      if (err.message?.includes('could not be found') || err.name === 'TransactionReceiptNotFoundError') {
        return NextResponse.json({ status: 'pending' })
      }
      throw err
    }

    // Fallback: receipt is null
    return NextResponse.json({ status: 'pending' })
  } catch (error: any) {
    console.error('[tx-receipt] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get transaction receipt' },
      { status: 500 }
    )
  }
}
