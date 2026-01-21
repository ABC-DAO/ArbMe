import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const {
      version,
      token0,
      token1,
      fee,
      amount0,
      amount1,
      decimals0,
      decimals1,
    } = await request.json()

    // Fetch current pool price using the pool-price endpoint
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE || '/app/api'
    const poolPriceUrl = `${request.nextUrl.origin}${baseUrl}/pool-price`

    const priceResponse = await fetch(poolPriceUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version, token0, token1, fee }),
    })

    if (!priceResponse.ok) {
      throw new Error('Failed to fetch pool price')
    }

    const { exists, price, priceDisplay } = await priceResponse.json()

    if (!exists || !price) {
      return NextResponse.json(
        { error: 'Pool does not exist' },
        { status: 404 }
      )
    }

    let calculatedAmount0: string
    let calculatedAmount1: string

    if (amount0) {
      // User provided amount0, calculate amount1
      calculatedAmount0 = amount0
      calculatedAmount1 = (parseFloat(amount0) * price).toFixed(Math.min(decimals1, 6))
    } else if (amount1) {
      // User provided amount1, calculate amount0
      calculatedAmount1 = amount1
      calculatedAmount0 = (parseFloat(amount1) / price).toFixed(Math.min(decimals0, 6))
    } else {
      return NextResponse.json(
        { error: 'Must provide either amount0 or amount1' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      amount0: calculatedAmount0,
      amount1: calculatedAmount1,
      price,
      priceDisplay,
    })
  } catch (error: any) {
    console.error('[calculate-ratio] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to calculate ratio' },
      { status: 500 }
    )
  }
}
