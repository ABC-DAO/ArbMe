/**
 * Price History Storage
 * Stores hourly price snapshots for VCV matrix analysis
 *
 * Note: In-memory storage - data lost on restart
 * TODO: Upgrade to PostgreSQL/Redis for persistence
 */

export interface PriceSnapshot {
  timestamp: number // Unix seconds (hourly, rounded down)
  prices: Record<string, number> // symbol -> price
}

// In-memory storage - Map of timestamp -> prices
const priceHistory: Map<number, Record<string, number>> = new Map()

// Max history to keep (168 hours = 7 days)
const MAX_HISTORY_HOURS = 168

/**
 * Round timestamp down to nearest hour
 */
export function roundToHour(timestamp: number): number {
  return Math.floor(timestamp / 3600) * 3600
}

/**
 * Record prices for the current hour
 * Overwrites if same hour already exists (updates with latest)
 */
export function recordPrices(prices: Record<string, number>): void {
  const hourTimestamp = roundToHour(Math.floor(Date.now() / 1000))

  // Merge with existing prices for this hour (in case we're tracking more assets)
  const existing = priceHistory.get(hourTimestamp) || {}
  priceHistory.set(hourTimestamp, { ...existing, ...prices })

  // Prune old data
  pruneOldData()

  console.log(`[PriceHistory] Recorded ${Object.keys(prices).length} prices for hour ${hourTimestamp}`)
}

/**
 * Remove data older than MAX_HISTORY_HOURS
 */
function pruneOldData(): void {
  const cutoff = roundToHour(Math.floor(Date.now() / 1000)) - (MAX_HISTORY_HOURS * 3600)

  for (const timestamp of priceHistory.keys()) {
    if (timestamp < cutoff) {
      priceHistory.delete(timestamp)
    }
  }
}

/**
 * Get price history for specified assets
 * Returns array sorted by timestamp descending (most recent first)
 */
export function getPriceHistory(
  assets: string[],
  hours: number = 72
): PriceSnapshot[] {
  const now = roundToHour(Math.floor(Date.now() / 1000))
  const cutoff = now - (hours * 3600)

  const results: PriceSnapshot[] = []

  // Get all timestamps in range, sorted descending
  const timestamps = Array.from(priceHistory.keys())
    .filter(ts => ts >= cutoff)
    .sort((a, b) => b - a)

  for (const timestamp of timestamps) {
    const allPrices = priceHistory.get(timestamp)
    if (!allPrices) continue

    // Filter to requested assets only
    const filteredPrices: Record<string, number> = {}
    for (const asset of assets) {
      const upperAsset = asset.toUpperCase()
      if (allPrices[upperAsset] !== undefined) {
        filteredPrices[upperAsset] = allPrices[upperAsset]
      }
    }

    // Only include if we have at least one asset
    if (Object.keys(filteredPrices).length > 0) {
      results.push({ timestamp, prices: filteredPrices })
    }
  }

  return results
}

/**
 * Get all tracked assets
 */
export function getTrackedAssets(): string[] {
  const assets = new Set<string>()
  for (const prices of priceHistory.values()) {
    for (const asset of Object.keys(prices)) {
      assets.add(asset)
    }
  }
  return Array.from(assets).sort()
}

/**
 * Get stats about stored history
 */
export function getHistoryStats(): {
  totalSnapshots: number
  oldestTimestamp: number | null
  newestTimestamp: number | null
  trackedAssets: string[]
} {
  const timestamps = Array.from(priceHistory.keys()).sort((a, b) => a - b)

  return {
    totalSnapshots: timestamps.length,
    oldestTimestamp: timestamps[0] || null,
    newestTimestamp: timestamps[timestamps.length - 1] || null,
    trackedAssets: getTrackedAssets(),
  }
}
