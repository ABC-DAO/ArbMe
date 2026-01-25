# Token Pricing Architecture

This document describes how the ArbMe application calculates and retrieves token prices.

## Overview

The pricing system uses **GeckoTerminal as the primary source** with a 30-second in-memory cache for fast repeated lookups.

**Core file:** `src/pricing.ts`

## Architecture

```
Request → Check Cache → [HIT] Return cached price
                     → [MISS] Fetch from GeckoTerminal → Cache → Return
```

### Key Features

1. **30-second cache TTL** - Prevents hammering the API
2. **Batch queries** - Multiple tokens fetched in single request
3. **Automatic staleness** - Expired entries purged on access
4. **On-chain fallback** - For tokens not indexed by GeckoTerminal (requires WETH_PAIRS config)

## API

### `getTokenPrice(tokenAddress, alchemyKey?)`

Get price for a single token.

```typescript
import { getTokenPrice } from '@arbme/core-lib'

const price = await getTokenPrice('0xC647421C5Dc78D1c3960faA7A33f9aEFDF4B7B07')
// Returns: 0.00000074 (USD)
```

### `getTokenPrices(tokenAddresses, alchemyKey?)`

Get prices for multiple tokens (batched).

```typescript
import { getTokenPrices } from '@arbme/core-lib'

const prices = await getTokenPrices([
  '0x4200000000000000000000000000000000000006', // WETH
  '0xC647421C5Dc78D1c3960faA7A33f9aEFDF4B7B07', // ARBME
])
// Returns: Map<string, number>
```

### `getWethPrice()`

Get WETH/USD price (commonly needed anchor).

```typescript
import { getWethPrice } from '@arbme/core-lib'

const wethPrice = await getWethPrice()
// Returns: 2840.12 (USD)
```

### `getPriceCacheStats()`

Debug helper to inspect cache state.

```typescript
import { getPriceCacheStats } from '@arbme/core-lib'

const stats = getPriceCacheStats()
// Returns: { size: 5, entries: [{ address, price, age, source }] }
```

### `clearPriceCache()`

Clear all cached prices (useful for testing).

## GeckoTerminal Coverage

| Token | Indexed | Price Source |
|-------|---------|--------------|
| WETH | Yes | GeckoTerminal |
| USDC | Yes | GeckoTerminal |
| CLANKER | Yes | GeckoTerminal |
| DEGEN | Yes | GeckoTerminal |
| ARBME | Yes | GeckoTerminal |
| PAGE | Yes | GeckoTerminal |
| OINC | Yes | GeckoTerminal |

GeckoTerminal has good coverage for Base tokens. For tokens not indexed, the system falls back to on-chain pool reserve calculations (requires configuring `WETH_PAIRS` in pricing.ts).

## Caching Behavior

```
┌─────────────────────────────────────────┐
│            Price Cache                   │
│  TTL: 30 seconds                        │
│                                          │
│  ┌──────────────────┬────────┬────────┐ │
│  │ Address          │ Price  │ Age(s) │ │
│  ├──────────────────┼────────┼────────┤ │
│  │ 0x4200...0006    │ 2840   │ 5      │ │
│  │ 0xc647...7b07    │ 0.0007 │ 12     │ │
│  │ 0x1bc0...1bcb    │ 23.12  │ 28     │ │
│  └──────────────────┴────────┴────────┘ │
└─────────────────────────────────────────┘
```

- First request: ~300ms (API call)
- Cached request: <1ms
- After 30s: Cache miss, fresh fetch

## Legacy Compatibility

For backwards compatibility with existing code:

```typescript
// Old API (still works)
import { getTokenPricesOnChain, getTokenPriceOnChain } from '@arbme/core-lib'

// These now just wrap the new functions
const prices = await getTokenPricesOnChain(
  [{ address: '0x...', decimals: 18 }],
  alchemyKey
)
```

## Performance

| Operation | Latency |
|-----------|---------|
| Cache hit | <1ms |
| Single token (uncached) | ~300ms |
| Batch 10 tokens (uncached) | ~300ms |
| Batch 10 tokens (all cached) | <1ms |

## Where Pricing Is Used

1. **Positions page** (`/positions`) - Shows position USD values
2. **Race leaderboard** (`/the-great-20-race`) - Shows token prices
3. **Add liquidity page** - Estimated USD value display

All consumers now use the same centralized pricing with shared cache.
