import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY
const PROVIDER_URL = ALCHEMY_KEY
  ? `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
  : 'https://mainnet.base.org'

// In-memory cache for pool prices and token metadata
const CACHE_TTL_PRICE = 60 * 1000 // 60 seconds for pool prices
const CACHE_TTL_NO_POOL = 10 * 1000 // 10 seconds for non-existent pools
const CACHE_TTL_METADATA = 60 * 60 * 1000 // 1 hour for token symbols/decimals

interface CacheEntry<T> {
  data: T
  timestamp: number
}

const priceCache = new Map<string, CacheEntry<any>>()
const noPoolCache = new Map<string, CacheEntry<any>>() // Shorter TTL for non-existent pools
const metadataCache = new Map<string, CacheEntry<{ symbol: string }>>()

function getCacheKey(version: string, token0: string, token1: string, fee?: number): string {
  return `${version}:${token0.toLowerCase()}:${token1.toLowerCase()}:${fee || 'none'}`
}

function getFromCache<T>(cache: Map<string, CacheEntry<T>>, key: string, ttl: number): T | null {
  const entry = cache.get(key)
  if (!entry) return null

  const age = Date.now() - entry.timestamp
  if (age > ttl) {
    cache.delete(key)
    return null
  }

  return entry.data
}

function setCache<T>(cache: Map<string, CacheEntry<T>>, key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() })
}

// Uniswap V3 Pool ABI (minimal)
const POOL_ABI = [
  'function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
  'function token0() view returns (address)',
  'function token1() view returns (address)',
]

// Uniswap V2 Pair ABI (minimal)
const V2_PAIR_ABI = [
  'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function token0() view returns (address)',
  'function token1() view returns (address)',
]

// Factory ABIs for getting pool address
const V3_FACTORY_ABI = [
  'function getPool(address tokenA, address tokenB, uint24 fee) view returns (address pool)',
]

const V2_FACTORY_ABI = [
  'function getPair(address tokenA, address tokenB) view returns (address pair)',
]

const FACTORY_ADDRESSES = {
  v2: '0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24', // Base V2 Factory
  v3: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD', // Base V3 Factory
  v4: '0x7c5f5a4bbd8fd63184577525326123b519429bdc', // Base V4 Position Manager
}

const ERC20_ABI = ['function symbol() view returns (string)']

export async function POST(request: NextRequest) {
  try {
    const { version, token0, token1, fee } = await request.json()

    if (!version || !token0 || !token1) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Check cache first (check both existing and non-existing pool caches)
    const cacheKey = getCacheKey(version, token0, token1, fee)
    let cachedPrice = getFromCache(priceCache, cacheKey, CACHE_TTL_PRICE)

    if (!cachedPrice) {
      cachedPrice = getFromCache(noPoolCache, cacheKey, CACHE_TTL_NO_POOL)
    }

    if (cachedPrice) {
      console.log('[pool-price] Cache HIT:', cacheKey)
      return NextResponse.json(cachedPrice, {
        headers: {
          'X-Cache': 'HIT',
          'Cache-Control': `public, max-age=${cachedPrice.exists ? 60 : 10}`,
        },
      })
    }

    console.log('[pool-price] Cache MISS:', cacheKey)

    const provider = new ethers.providers.JsonRpcProvider(PROVIDER_URL)

    // Get token symbols (with metadata cache)
    const token0Contract = new ethers.Contract(token0, ERC20_ABI, provider)
    const token1Contract = new ethers.Contract(token1, ERC20_ABI, provider)

    // Check metadata cache for symbols
    let symbol0 = getFromCache(metadataCache, token0.toLowerCase(), CACHE_TTL_METADATA)?.symbol
    let symbol1 = getFromCache(metadataCache, token1.toLowerCase(), CACHE_TTL_METADATA)?.symbol

    const symbolPromises = []
    if (!symbol0) symbolPromises.push(token0Contract.symbol().then((s: string) => { symbol0 = s; return s }))
    if (!symbol1) symbolPromises.push(token1Contract.symbol().then((s: string) => { symbol1 = s; return s }))

    if (symbolPromises.length > 0) {
      await Promise.all(symbolPromises)

      // Cache the symbols
      if (symbol0) setCache(metadataCache, token0.toLowerCase(), { symbol: symbol0 })
      if (symbol1) setCache(metadataCache, token1.toLowerCase(), { symbol: symbol1 })
    }

    if (version === 'v2') {
      // V2 uses reserves
      const factoryAddress = FACTORY_ADDRESSES.v2
      const factory = new ethers.Contract(factoryAddress, V2_FACTORY_ABI, provider)
      const pairAddress = await factory.getPair(token0, token1)

      if (pairAddress === ethers.constants.AddressZero) {
        const responseData = {
          exists: false,
          price: null,
          priceDisplay: null,
          token0Symbol: symbol0,
          token1Symbol: symbol1,
        }

        // Cache non-existent pool with shorter TTL
        setCache(noPoolCache, cacheKey, responseData)

        return NextResponse.json(responseData, {
          headers: {
            'X-Cache': 'MISS',
            'Cache-Control': 'public, max-age=10',
          },
        })
      }

      // Get reserves
      const pair = new ethers.Contract(pairAddress, V2_PAIR_ABI, provider)
      const reserves = await pair.getReserves()

      // Calculate price (reserve1 / reserve0)
      const reserve0 = Number(ethers.utils.formatUnits(reserves.reserve0, 18))
      const reserve1 = Number(ethers.utils.formatUnits(reserves.reserve1, 18))
      const price = reserve1 / reserve0

      const priceDisplay = `1 ${symbol0} = ${price.toFixed(6)} ${symbol1}`

      const responseData = {
        exists: true,
        price,
        priceDisplay,
        token0Symbol: symbol0,
        token1Symbol: symbol1,
      }

      // Cache the response
      setCache(priceCache, cacheKey, responseData)

      return NextResponse.json(responseData, {
        headers: {
          'X-Cache': 'MISS',
          'Cache-Control': 'public, max-age=60',
        },
      })
    }

    // V3 and V4 use sqrtPriceX96
    const factoryAddress = FACTORY_ADDRESSES[version as 'v3' | 'v4']
    if (!factoryAddress) {
      return NextResponse.json(
        { error: `Unsupported version: ${version}` },
        { status: 400 }
      )
    }

    const factory = new ethers.Contract(factoryAddress, V3_FACTORY_ABI, provider)
    const poolAddress = await factory.getPool(token0, token1, fee)

    if (poolAddress === ethers.constants.AddressZero) {
      const responseData = {
        exists: false,
        price: null,
        priceDisplay: null,
        token0Symbol: symbol0,
        token1Symbol: symbol1,
      }

      // Cache non-existent pool with shorter TTL
      setCache(noPoolCache, cacheKey, responseData)

      return NextResponse.json(responseData, {
        headers: {
          'X-Cache': 'MISS',
          'Cache-Control': 'public, max-age=10',
        },
      })
    }

    // Get pool state
    const pool = new ethers.Contract(poolAddress, POOL_ABI, provider)
    const slot0 = await pool.slot0()
    const sqrtPriceX96 = slot0.sqrtPriceX96

    // Calculate price from sqrtPriceX96
    // price = (sqrtPriceX96 / 2^96) ^ 2
    const Q96 = ethers.BigNumber.from(2).pow(96)
    const sqrtPrice = Number(sqrtPriceX96.toString()) / Number(Q96.toString())
    const price = sqrtPrice ** 2

    const priceDisplay = `1 ${symbol0} = ${price.toFixed(6)} ${symbol1}`

    const responseData = {
      exists: true,
      sqrtPriceX96: sqrtPriceX96.toString(),
      price,
      priceDisplay,
      token0Symbol: symbol0,
      token1Symbol: symbol1,
    }

    // Cache the response
    setCache(priceCache, cacheKey, responseData)

    return NextResponse.json(responseData, {
      headers: {
        'X-Cache': 'MISS',
        'Cache-Control': 'public, max-age=60',
      },
    })
  } catch (error: any) {
    console.error('[pool-price] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch pool price' },
      { status: 500 }
    )
  }
}
