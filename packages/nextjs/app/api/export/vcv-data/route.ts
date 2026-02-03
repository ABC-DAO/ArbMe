import { NextRequest, NextResponse } from 'next/server'
import { getPriceHistory, getTrackedAssets } from '@/lib/price-history'

/**
 * GET /api/export/vcv-data
 *
 * Exports historical price data for VCV (Variance-Covariance) matrix analysis.
 * Returns plain text CSV format.
 *
 * Query params:
 * - assets: comma-separated list of assets (e.g., "ARBME,ETH,CLANKER")
 *           defaults to all tracked assets
 * - hours: number of hours of history (default 72)
 *
 * Response: CSV with columns: timestamp, then one column per asset
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  // Parse assets parameter
  const assetsParam = searchParams.get('assets')
  let assets: string[]

  if (assetsParam) {
    assets = assetsParam.split(',').map(a => a.trim().toUpperCase()).filter(Boolean)
  } else {
    // Default to all tracked assets
    assets = getTrackedAssets()
  }

  if (assets.length === 0) {
    return new NextResponse('No assets specified or tracked', { status: 400 })
  }

  // Parse hours parameter
  const hoursParam = searchParams.get('hours')
  const hours = hoursParam ? parseInt(hoursParam, 10) : 72

  if (isNaN(hours) || hours < 1 || hours > 168) {
    return new NextResponse('Invalid hours parameter (must be 1-168)', { status: 400 })
  }

  // Get price history
  const history = getPriceHistory(assets, hours)

  if (history.length === 0) {
    return new NextResponse('No price history available. Ensure /api/collect/prices is being called hourly.', {
      status: 404,
    })
  }

  // Build CSV
  const lines: string[] = []

  // Header row
  lines.push(['timestamp', ...assets].join(','))

  // Data rows (history is already sorted descending, but CSV typically wants ascending)
  const sortedHistory = [...history].sort((a, b) => a.timestamp - b.timestamp)

  for (const snapshot of sortedHistory) {
    const row: (string | number)[] = [snapshot.timestamp]

    for (const asset of assets) {
      const price = snapshot.prices[asset]
      row.push(price !== undefined ? price : '')
    }

    lines.push(row.join(','))
  }

  const csv = lines.join('\n')

  // Return as plain text CSV
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="vcv-data-${Date.now()}.csv"`,
    },
  })
}
