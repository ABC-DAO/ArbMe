import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { addSwap, getSwapCount, SwapEvent } from '@/lib/swap-store'

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface AlchemyWebhookEvent {
  webhookId: string
  id: string
  createdAt: string
  type: 'ADDRESS_ACTIVITY' | 'GRAPHQL' | 'NFT_ACTIVITY'
  event: {
    network: string
    activity: AlchemyActivity[]
  }
}

interface AlchemyActivity {
  blockNum: string
  hash: string
  fromAddress: string
  toAddress: string
  value: number
  asset: string
  category: 'token' | 'erc20' | 'erc721' | 'erc1155' | 'internal' | 'external'
  rawContract: {
    rawValue: string
    address: string
    decimals: number
  }
  log?: {
    address: string
    topics: string[]
    data: string
    blockNumber: string
    transactionHash: string
    logIndex: string
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Token Addresses (for filtering)
// ═══════════════════════════════════════════════════════════════════════════════

const ARBME = '0xC647421C5Dc78D1c3960faA7A33f9aEFDF4B7B07'.toLowerCase()
const RATCHET = '0x392bc5DeEa227043d69Af0e67BadCbBAeD511B07'.toLowerCase()
const ABC = '0x5c0872b790Bb73e2B3A9778Db6E7704095624b07'.toLowerCase()

const TRACKED_TOKENS = new Set([ARBME, RATCHET, ABC])

// Uniswap V2/V3 Swap event signatures
const SWAP_SIGNATURES = {
  // V2: Swap(address indexed sender, uint amount0In, uint amount1In, uint amount0Out, uint amount1Out, address indexed to)
  V2: '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822',
  // V3: Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)
  V3: '0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67',
  // V4 uses similar signature
  V4: '0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67',
}

// ═══════════════════════════════════════════════════════════════════════════════
// Signature Verification
// ═══════════════════════════════════════════════════════════════════════════════

function verifyAlchemySignature(
  rawBody: string,
  signature: string,
  signingKey: string
): boolean {
  const hmac = createHmac('sha256', signingKey)
  hmac.update(rawBody, 'utf8')
  const digest = hmac.digest('hex')

  // Use timing-safe comparison to prevent timing attacks
  try {
    return timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(digest)
    )
  } catch {
    return false
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Event Parsing
// ═══════════════════════════════════════════════════════════════════════════════

function parseSwapFromActivity(activity: AlchemyActivity): SwapEvent | null {
  // Check if this is an ERC20 transfer involving our tracked tokens
  if (activity.category !== 'erc20' && activity.category !== 'token') {
    return null
  }

  const tokenAddress = activity.rawContract?.address?.toLowerCase()
  if (!tokenAddress || !TRACKED_TOKENS.has(tokenAddress)) {
    return null
  }

  // This is a token transfer - could be part of a swap
  // In a real swap, we'd see two transfers in the same tx
  return {
    id: `${activity.hash}-${activity.log?.logIndex || '0'}`,
    timestamp: new Date().toISOString(),
    blockNumber: parseInt(activity.blockNum, 16),
    txHash: activity.hash,
    poolAddress: activity.toAddress, // Pool receives the tokens
    tokenIn: tokenAddress,
    tokenOut: '', // Would need to correlate with other transfer in same tx
    amountIn: activity.rawContract?.rawValue || '0',
    amountOut: '0',
    sender: activity.fromAddress,
    recipient: activity.toAddress,
  }
}

function parseSwapFromLog(log: AlchemyActivity['log']): SwapEvent | null {
  if (!log) return null

  const topic0 = log.topics[0]?.toLowerCase()

  // Check if this is a Swap event
  const isV2Swap = topic0 === SWAP_SIGNATURES.V2.toLowerCase()
  const isV3Swap = topic0 === SWAP_SIGNATURES.V3.toLowerCase()

  if (!isV2Swap && !isV3Swap) {
    return null
  }

  try {
    if (isV2Swap) {
      // V2 Swap: sender (indexed), to (indexed), amount0In, amount1In, amount0Out, amount1Out
      const sender = '0x' + log.topics[1]?.slice(26)
      const recipient = '0x' + log.topics[2]?.slice(26)
      const data = log.data.slice(2) // Remove 0x

      const amount0In = BigInt('0x' + data.slice(0, 64)).toString()
      const amount1In = BigInt('0x' + data.slice(64, 128)).toString()
      const amount0Out = BigInt('0x' + data.slice(128, 192)).toString()
      const amount1Out = BigInt('0x' + data.slice(192, 256)).toString()

      return {
        id: `${log.transactionHash}-${log.logIndex}`,
        timestamp: new Date().toISOString(),
        blockNumber: parseInt(log.blockNumber, 16),
        txHash: log.transactionHash,
        poolAddress: log.address,
        tokenIn: amount0In !== '0' ? 'token0' : 'token1',
        tokenOut: amount0Out !== '0' ? 'token0' : 'token1',
        amountIn: amount0In !== '0' ? amount0In : amount1In,
        amountOut: amount0Out !== '0' ? amount0Out : amount1Out,
        sender,
        recipient,
      }
    }

    if (isV3Swap) {
      // V3 Swap: sender (indexed), recipient (indexed), amount0, amount1, sqrtPriceX96, liquidity, tick
      const sender = '0x' + log.topics[1]?.slice(26)
      const recipient = '0x' + log.topics[2]?.slice(26)
      const data = log.data.slice(2)

      // amount0 and amount1 are int256 (can be negative)
      const amount0Hex = data.slice(0, 64)
      const amount1Hex = data.slice(64, 128)

      // Parse as signed integers
      const amount0 = BigInt('0x' + amount0Hex)
      const amount1 = BigInt('0x' + amount1Hex)

      // Negative = token going out of pool (user receives), Positive = token going in
      const isToken0In = amount0 > BigInt(0)

      return {
        id: `${log.transactionHash}-${log.logIndex}`,
        timestamp: new Date().toISOString(),
        blockNumber: parseInt(log.blockNumber, 16),
        txHash: log.transactionHash,
        poolAddress: log.address,
        tokenIn: isToken0In ? 'token0' : 'token1',
        tokenOut: isToken0In ? 'token1' : 'token0',
        amountIn: (isToken0In ? amount0 : -amount1).toString(),
        amountOut: (isToken0In ? -amount1 : amount0).toString(),
        sender,
        recipient,
      }
    }
  } catch (error) {
    console.error('[Webhook] Error parsing swap log:', error)
  }

  return null
}

// ═══════════════════════════════════════════════════════════════════════════════
// Webhook Handler
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  const signingKey = process.env.ALCHEMY_WEBHOOK_SIGNING_KEY

  try {
    // Get raw body for signature verification
    const rawBody = await request.text()

    // Verify signature if signing key is configured
    if (signingKey) {
      const signature = request.headers.get('x-alchemy-signature')

      if (!signature) {
        console.warn('[Webhook] Missing x-alchemy-signature header')
        return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
      }

      if (!verifyAlchemySignature(rawBody, signature, signingKey)) {
        console.warn('[Webhook] Invalid signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    // Parse the webhook payload
    const payload: AlchemyWebhookEvent = JSON.parse(rawBody)

    console.log(`[Webhook] Received ${payload.type} event: ${payload.id}`)

    // Process based on webhook type
    if (payload.type === 'ADDRESS_ACTIVITY') {
      const activities = payload.event?.activity || []

      for (const activity of activities) {
        // Try to parse as a swap from activity data
        const swap = parseSwapFromActivity(activity)
        if (swap) {
          addSwap(swap)
          console.log(`[Webhook] Recorded swap: ${swap.txHash}`)
        }

        // Also check if there's log data with swap events
        if (activity.log) {
          const logSwap = parseSwapFromLog(activity.log)
          if (logSwap) {
            addSwap(logSwap)
            console.log(`[Webhook] Recorded swap from log: ${logSwap.txHash}`)
          }
        }
      }
    } else if (payload.type === 'GRAPHQL') {
      // Custom webhook with GraphQL response
      // The structure depends on your GraphQL query
      // Parse accordingly based on your query setup
      console.log('[Webhook] Received GraphQL webhook - implement custom parsing')
    }

    return NextResponse.json({
      success: true,
      swapsRecorded: getSwapCount()
    })

  } catch (error) {
    console.error('[Webhook] Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    swapsStored: getSwapCount(),
    trackedTokens: Array.from(TRACKED_TOKENS),
  })
}
