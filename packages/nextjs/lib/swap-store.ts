// ═══════════════════════════════════════════════════════════════════════════════
// Swap Event Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface SwapEvent {
  id: string
  timestamp: string
  blockNumber: number
  txHash: string
  poolAddress: string
  tokenIn: string
  tokenOut: string
  amountIn: string
  amountOut: string
  sender: string
  recipient: string
  priceImpact?: number
}

// ═══════════════════════════════════════════════════════════════════════════════
// In-Memory Swap Store
// For production, replace with Redis, PostgreSQL, or other persistent storage
// ═══════════════════════════════════════════════════════════════════════════════

const MAX_SWAPS = 100
const swapStore: SwapEvent[] = []

/**
 * Get recent swaps from the store
 */
export function getRecentSwaps(limit = 20): SwapEvent[] {
  return swapStore.slice(0, Math.min(limit, MAX_SWAPS))
}

/**
 * Add a new swap to the store (most recent first)
 */
export function addSwap(swap: SwapEvent): void {
  // Check for duplicates by ID
  const exists = swapStore.some(s => s.id === swap.id)
  if (exists) return

  swapStore.unshift(swap)
  if (swapStore.length > MAX_SWAPS) {
    swapStore.pop()
  }
}

/**
 * Get the current store size
 */
export function getSwapCount(): number {
  return swapStore.length
}

/**
 * Clear all swaps (useful for testing)
 */
export function clearSwaps(): void {
  swapStore.length = 0
}
