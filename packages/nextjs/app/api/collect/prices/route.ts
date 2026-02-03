import { NextRequest, NextResponse } from 'next/server'
import { fetchPools } from '@arbme/core-lib'
import { recordPrices, getHistoryStats } from '@/lib/price-history'

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY

/**
 * POST /api/collect/prices
 *
 * Cron-triggered endpoint to collect and store current prices.
 * Should be called hourly to build price history for VCV analysis.
 *
 * Optional auth via CRON_SECRET for security.
 */
export async function POST(request: NextRequest) {
  // Optional: verify cron secret for security
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Fetch current pool data
    const poolData = await fetchPools(ALCHEMY_KEY)

    // Build prices object from all available data
    const prices: Record<string, number> = {}

    // Core token prices
    if (poolData.tokenPrices?.WETH) prices['ETH'] = poolData.tokenPrices.WETH
    if (poolData.tokenPrices?.CLANKER) prices['CLANKER'] = poolData.tokenPrices.CLANKER

    // ARBME price (from main ARBME/WETH pool)
    const arbmePrice = parseFloat(poolData.arbmePrice)
    if (arbmePrice > 0) prices['ARBME'] = arbmePrice

    // RATCHET price
    const ratchetPrice = parseFloat(poolData.ratchetPrice)
    if (ratchetPrice > 0) prices['RATCHET'] = ratchetPrice

    // ABC price
    const abcPrice = parseFloat(poolData.abcPrice)
    if (abcPrice > 0) prices['ABC'] = abcPrice

    // CLAWD price
    const clawdPrice = parseFloat(poolData.clawdPrice)
    if (clawdPrice > 0) prices['CLAWD'] = clawdPrice

    // Record to history
    recordPrices(prices)

    // Get stats for response
    const stats = getHistoryStats()

    return NextResponse.json({
      success: true,
      recorded: Object.keys(prices).length,
      prices,
      stats,
    })

  } catch (error) {
    console.error('[PriceCollector] Error:', error)
    return NextResponse.json(
      { error: 'Failed to collect prices' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/collect/prices
 *
 * Returns current stats about stored price history.
 * Useful for debugging and monitoring.
 */
export async function GET() {
  const stats = getHistoryStats()

  return NextResponse.json({
    stats,
    note: 'POST to this endpoint to trigger price collection',
  })
}
