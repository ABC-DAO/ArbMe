'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useWallet, useIsFarcaster } from '@/hooks/useWallet'
import { AppHeader } from '@/components/AppHeader'
import { Footer } from '@/components/Footer'
import { BackButton } from '@/components/BackButton'
import { ROUTES } from '@/utils/constants'
import type { Position } from '@/utils/types'
import { useSendTransaction, useReadContract } from 'wagmi'

const API_BASE = '/api'

// Contract addresses for client-side quoting
const V3_QUOTER = '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a' as const
const V4_STATE_VIEW = '0xa3c0c9b65bad0b08107aa264b0f3db444b867a71' as const

// ABIs for client-side quoting
const QUOTER_V2_ABI = [
  {
    name: 'quoteExactInputSingle',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{
      name: 'params',
      type: 'tuple',
      components: [
        { name: 'tokenIn', type: 'address' },
        { name: 'tokenOut', type: 'address' },
        { name: 'amountIn', type: 'uint256' },
        { name: 'fee', type: 'uint24' },
        { name: 'sqrtPriceLimitX96', type: 'uint160' },
      ],
    }],
    outputs: [
      { name: 'amountOut', type: 'uint256' },
      { name: 'sqrtPriceX96After', type: 'uint160' },
      { name: 'initializedTicksCrossed', type: 'uint32' },
      { name: 'gasEstimate', type: 'uint256' },
    ],
  },
] as const

const STATE_VIEW_ABI = [
  {
    name: 'getSlot0',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'poolId', type: 'bytes32' }],
    outputs: [
      { name: 'sqrtPriceX96', type: 'uint160' },
      { name: 'tick', type: 'int24' },
      { name: 'protocolFee', type: 'uint24' },
      { name: 'lpFee', type: 'uint24' },
    ],
  },
  {
    name: 'getLiquidity',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'poolId', type: 'bytes32' }],
    outputs: [{ name: 'liquidity', type: 'uint128' }],
  },
] as const

const V2_PAIR_ABI = [
  {
    name: 'getReserves',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'reserve0', type: 'uint112' },
      { name: 'reserve1', type: 'uint112' },
      { name: 'blockTimestampLast', type: 'uint32' },
    ],
  },
  {
    name: 'token0',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
] as const

type TxStatus = 'idle' | 'building' | 'pending' | 'success' | 'error'

export default function PositionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const wallet = useWallet()
  const isFarcaster = useIsFarcaster()
  const { sendTransactionAsync } = useSendTransaction()
  const positionId = params.id as string

  const [position, setPosition] = useState<Position | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Transaction states
  const [collectStatus, setCollectStatus] = useState<TxStatus>('idle')
  const [removePercentage, setRemovePercentage] = useState(0)
  const [removeStatus, setRemoveStatus] = useState<TxStatus>('idle')
  const [txError, setTxError] = useState<string | null>(null)

  // Modal states
  const [showRemoveModal, setShowRemoveModal] = useState(false)
  const [showSwapModal, setShowSwapModal] = useState(false)

  // Swap states
  const [swapDirection, setSwapDirection] = useState<'0to1' | '1to0'>('0to1')
  const [swapAmount, setSwapAmount] = useState('')
  const [swapStatus, setSwapStatus] = useState<TxStatus>('idle')

  // Computed swap values
  const tokenIn = position ? (swapDirection === '0to1' ? position.token0 : position.token1) : null
  const tokenOut = position ? (swapDirection === '0to1' ? position.token1 : position.token0) : null
  const decimalsIn = tokenIn?.decimals || 18
  const decimalsOut = tokenOut?.decimals || 18

  const amountInWei = useMemo(() => {
    if (!swapAmount || parseFloat(swapAmount) <= 0) return 0n
    try {
      return BigInt(Math.floor(parseFloat(swapAmount) * Math.pow(10, decimalsIn)))
    } catch {
      return 0n
    }
  }, [swapAmount, decimalsIn])

  // V2: Read reserves for quote calculation
  const { data: v2Reserves } = useReadContract({
    address: position?.poolAddress as `0x${string}`,
    abi: V2_PAIR_ABI,
    functionName: 'getReserves',
    query: { enabled: position?.version === 'V2' && !!position?.poolAddress && showSwapModal },
  })

  const { data: v2Token0 } = useReadContract({
    address: position?.poolAddress as `0x${string}`,
    abi: V2_PAIR_ABI,
    functionName: 'token0',
    query: { enabled: position?.version === 'V2' && !!position?.poolAddress && showSwapModal },
  })

  // V3: Use Quoter contract
  const { data: v3Quote, isLoading: v3Loading } = useReadContract({
    address: V3_QUOTER,
    abi: QUOTER_V2_ABI,
    functionName: 'quoteExactInputSingle',
    args: tokenIn && tokenOut && amountInWei > 0n ? [{
      tokenIn: tokenIn.address as `0x${string}`,
      tokenOut: tokenOut.address as `0x${string}`,
      amountIn: amountInWei,
      fee: position?.fee || 3000,
      sqrtPriceLimitX96: 0n,
    }] : undefined,
    query: {
      enabled: position?.version === 'V3' && !!tokenIn && !!tokenOut && amountInWei > 0n && showSwapModal,
    },
  })

  // V4: Read pool state from StateView
  const poolId = useMemo(() => {
    if (position?.version !== 'V4' || !position?.poolAddress) return undefined
    if (position.poolAddress.startsWith('0x') && position.poolAddress.length === 66) {
      return position.poolAddress as `0x${string}`
    }
    return undefined
  }, [position])

  const { data: v4Slot0 } = useReadContract({
    address: V4_STATE_VIEW,
    abi: STATE_VIEW_ABI,
    functionName: 'getSlot0',
    args: poolId ? [poolId] : undefined,
    query: { enabled: position?.version === 'V4' && !!poolId && showSwapModal },
  })

  const { data: v4Liquidity } = useReadContract({
    address: V4_STATE_VIEW,
    abi: STATE_VIEW_ABI,
    functionName: 'getLiquidity',
    args: poolId ? [poolId] : undefined,
    query: { enabled: position?.version === 'V4' && !!poolId && showSwapModal },
  })

  // Calculate quote based on version
  const swapQuote = useMemo(() => {
    if (amountInWei === 0n || !position) return null

    if (position.version === 'V2' && v2Reserves && v2Token0 && tokenIn && tokenOut) {
      const reserves = v2Reserves as readonly [bigint, bigint, number]
      const reserve0 = reserves[0]
      const reserve1 = reserves[1]
      const isToken0In = tokenIn.address?.toLowerCase() === (v2Token0 as string).toLowerCase()
      const reserveIn = isToken0In ? reserve0 : reserve1
      const reserveOut = isToken0In ? reserve1 : reserve0

      const amountInWithFee = amountInWei * 997n
      const numerator = BigInt(reserveOut) * amountInWithFee
      const denominator = BigInt(reserveIn) * 1000n + amountInWithFee
      const amountOut = numerator / denominator

      const priceImpact = Number(amountInWei * 100n / BigInt(reserveIn))

      return {
        amountOut: amountOut.toString(),
        priceImpact: Math.min(priceImpact, 100),
        executionPrice: Number(amountOut) / Number(amountInWei),
      }
    }

    if (position.version === 'V3' && v3Quote) {
      const amountOut = (v3Quote as readonly [bigint, bigint, number, bigint])[0]
      const priceImpact = 0.1
      return {
        amountOut: amountOut.toString(),
        priceImpact,
        executionPrice: Number(amountOut) / Number(amountInWei),
      }
    }

    if (position.version === 'V4' && v4Slot0 && v4Liquidity && tokenIn && tokenOut) {
      const slot0 = v4Slot0 as readonly [bigint, number, number, number]
      const sqrtPriceX96 = slot0[0]
      const liquidity = v4Liquidity as bigint

      if (liquidity === 0n) return null

      const price = Number(sqrtPriceX96) ** 2 / (2 ** 192)
      const isToken0In = (tokenIn.address?.toLowerCase() || '') < (tokenOut.address?.toLowerCase() || '')
      const effectivePrice = isToken0In ? price : 1 / price

      const amountOutEstimate = Number(amountInWei) * effectivePrice * 0.997
      const priceImpact = (Number(amountInWei) / Number(liquidity)) * 100

      return {
        amountOut: BigInt(Math.floor(amountOutEstimate)).toString(),
        priceImpact: Math.min(priceImpact, 100),
        executionPrice: effectivePrice,
      }
    }

    return null
  }, [position, amountInWei, v2Reserves, v2Token0, v3Quote, v4Slot0, v4Liquidity, tokenIn, tokenOut])

  const quoteLoading = position?.version === 'V3' && v3Loading

  const fetchPosition = useCallback(async () => {
    if (!wallet || !positionId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Fetch all positions and find the one we need
      const res = await fetch(`${API_BASE}/positions?wallet=${wallet}`)
      if (!res.ok) {
        throw new Error('Failed to fetch positions')
      }
      const data = await res.json()
      const found = data.positions?.find((p: Position) => p.id === positionId)

      if (!found) {
        throw new Error('Position not found')
      }

      setPosition(found)
    } catch (err: any) {
      console.error('[PositionDetailPage] Error:', err)
      setError(err.message || 'Failed to load position')
    } finally {
      setLoading(false)
    }
  }, [wallet, positionId])

  useEffect(() => {
    fetchPosition()
  }, [fetchPosition])

  const sendTransaction = async (tx: { to: string; data: string; value: string }) => {
    if (!wallet) throw new Error('No wallet connected')

    try {
      if (isFarcaster) {
        const farcasterSdk = (await import('@farcaster/miniapp-sdk')).default
        const provider = await farcasterSdk.wallet.getEthereumProvider()
        if (!provider) throw new Error('No wallet provider')

        const txHash = await provider.request({
          method: 'eth_sendTransaction',
          params: [{
            from: wallet as `0x${string}`,
            to: tx.to as `0x${string}`,
            data: tx.data as `0x${string}`,
            value: tx.value !== '0' ? `0x${BigInt(tx.value).toString(16)}` as `0x${string}` : '0x0',
          }],
        })

        return txHash as string
      } else {
        const txHash = await sendTransactionAsync({
          to: tx.to as `0x${string}`,
          data: tx.data as `0x${string}`,
          value: tx.value !== '0' ? BigInt(tx.value) : 0n,
        })

        return txHash
      }
    } catch (err: any) {
      const message = err?.message || err?.shortMessage || err?.error?.message || 'Transaction failed'
      throw new Error(message)
    }
  }

  const handleCollectFees = async () => {
    if (!position || !wallet) return

    try {
      setCollectStatus('building')
      setTxError(null)

      const res = await fetch(`${API_BASE}/collect-fees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positionId: position.id,
          recipient: wallet,
          // V4 needs token addresses for the TAKE_PAIR action
          currency0: position.token0?.address,
          currency1: position.token1?.address,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to build transaction')
      }

      const { transaction } = await res.json()

      setCollectStatus('pending')
      await sendTransaction(transaction)
      setCollectStatus('success')

      // Refresh position data
      setTimeout(() => {
        fetchPosition()
        setCollectStatus('idle')
      }, 3000)
    } catch (err: any) {
      console.error('[collectFees] Error:', err)
      setTxError(err.message || 'Transaction failed')
      setCollectStatus('error')
    }
  }

  const handleRemoveLiquidity = async () => {
    if (!position || !wallet || removePercentage === 0) return

    try {
      setRemoveStatus('building')
      setTxError(null)

      const res = await fetch(`${API_BASE}/decrease-liquidity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positionId: position.id,
          liquidityPercentage: removePercentage,
          currentLiquidity: position.liquidity,
          recipient: wallet,
          // V4 needs token addresses for TAKE_PAIR action
          currency0: position.token0?.address,
          currency1: position.token1?.address,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to build transaction')
      }

      const { transaction } = await res.json()

      setRemoveStatus('pending')
      await sendTransaction(transaction)
      setRemoveStatus('success')

      // Refresh and close modal
      setTimeout(() => {
        fetchPosition()
        setRemoveStatus('idle')
        setShowRemoveModal(false)
        setRemovePercentage(0)

        // If 100% removed, go back to list
        if (removePercentage === 100) {
          router.push(ROUTES.MY_POOLS)
        }
      }, 3000)
    } catch (err: any) {
      console.error('[removeLiquidity] Error:', err)
      setTxError(err.message || 'Transaction failed')
      setRemoveStatus('error')
    }
  }

  const handleExecuteSwap = async () => {
    if (!position || !wallet || !swapQuote || !swapAmount || !tokenIn || !tokenOut) return

    try {
      setSwapStatus('building')
      setTxError(null)

      // Apply 0.5% slippage to the quote
      const minAmountOut = (BigInt(swapQuote.amountOut) * 995n / 1000n).toString()

      const res = await fetch(`${API_BASE}/swap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poolAddress: position.poolAddress,
          version: position.version,
          tokenIn: tokenIn.address,
          tokenOut: tokenOut.address,
          amountIn: amountInWei.toString(),
          minAmountOut,
          recipient: wallet,
          fee: position.fee,
          tickSpacing: position.tickSpacing,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to build swap transaction')
      }

      const { transaction } = await res.json()

      setSwapStatus('pending')
      await sendTransaction(transaction)
      setSwapStatus('success')

      // Refresh position and close modal
      setTimeout(() => {
        fetchPosition()
        setSwapStatus('idle')
        setShowSwapModal(false)
        setSwapAmount('')
        setSwapQuote(null)
      }, 3000)
    } catch (err: any) {
      console.error('[executeSwap] Error:', err)
      setTxError(err.message || 'Swap failed')
      setSwapStatus('error')
    }
  }

  const formatUsd = (value: number | undefined) => {
    if (value === undefined || value === null) return '$0.00'
    if (value < 0.01) return '<$0.01'
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
    if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const formatAmount = (amount: number | undefined, decimals: number = 4) => {
    if (amount === undefined || amount === null) return '0'
    if (amount < 0.0001) return '<0.0001'
    if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(2)}B`
    if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M`
    if (amount >= 100_000) return `${(amount / 1_000).toFixed(1)}K`
    if (amount >= 1_000) return amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    return amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: decimals })
  }

  const isClosed = position && (!position.liquidityUsd || position.liquidityUsd === 0)
  const hasFees = position && position.feesEarnedUsd && position.feesEarnedUsd > 0

  return (
    <div className="app">
      <AppHeader />

      <div className="main-content">
        <BackButton href={ROUTES.MY_POOLS} label="Back to Positions" />

        {!wallet ? (
          <div className="empty-state">
            <p>Connect your wallet to view this position</p>
          </div>
        ) : loading ? (
          <div className="loading-state">
            <div className="loading-spinner" />
            <p>Loading position...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <p>{error}</p>
            <button onClick={() => router.push(ROUTES.MY_POOLS)}>Back to Positions</button>
          </div>
        ) : !position ? (
          <div className="empty-state">
            <p>Position not found</p>
            <button onClick={() => router.push(ROUTES.MY_POOLS)}>Back to Positions</button>
          </div>
        ) : (
          <div className="position-detail-card">
            <div className="detail-header">
              <div>
                <h2 style={{ margin: 0 }}>{position.pair}</h2>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <span className={`version-badge ${position.version.toLowerCase()}`}>
                    {position.version}
                  </span>
                  {position.fee && (
                    <span className="fee-badge">{(position.fee / 10000).toFixed(2)}% fee</span>
                  )}
                  {position.version !== 'V2' && position.inRange !== undefined && (
                    <span className={`range-badge ${position.inRange ? 'in-range' : 'out-of-range'}`}>
                      {position.inRange ? 'In Range' : 'Out of Range'}
                    </span>
                  )}
                </div>
              </div>
              <div className="position-value">
                {formatUsd(position.liquidityUsd)}
              </div>
            </div>

            {/* Token Amounts */}
            <div className="detail-section">
              <h3>Token Amounts</h3>
              <div className="detail-stats">
                <div className="stat-large">
                  <span className="stat-label">{position.token0?.symbol || '???'}</span>
                  <span className="stat-value">{formatAmount(position.token0?.amount)}</span>
                </div>
                <div className="stat-large">
                  <span className="stat-label">{position.token1?.symbol || '???'}</span>
                  <span className="stat-value">{formatAmount(position.token1?.amount)}</span>
                </div>
              </div>
            </div>

            {/* Unclaimed Fees */}
            {hasFees && !isClosed && (
              <div className="detail-section">
                <h3>Unclaimed Fees</h3>
                <div className="unclaimed-fees" style={{ marginTop: 0 }}>
                  <span className="fees-label">Available to collect</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                    {formatUsd(position.feesEarnedUsd)}
                  </span>
                </div>
              </div>
            )}

            {/* Actions */}
            {!isClosed && (
              <div className="detail-actions">
                {hasFees && position.version !== 'V2' && (
                  <button
                    className="btn btn-primary full-width"
                    onClick={handleCollectFees}
                    disabled={collectStatus !== 'idle'}
                  >
                    {collectStatus === 'building' && 'Building...'}
                    {collectStatus === 'pending' && (
                      <>
                        <span className="loading-spinner small" /> Collecting...
                      </>
                    )}
                    {collectStatus === 'success' && 'Collected!'}
                    {collectStatus === 'error' && 'Failed - Try Again'}
                    {collectStatus === 'idle' && 'Collect Fees'}
                  </button>
                )}

                <button
                  className="btn btn-secondary full-width"
                  onClick={() => setShowSwapModal(true)}
                >
                  Swap Tokens
                </button>

                <button
                  className="btn btn-secondary full-width"
                  onClick={() => setShowRemoveModal(true)}
                >
                  Remove Liquidity
                </button>

                <Link
                  href={`${ROUTES.ADD_LIQUIDITY}?pool=${position.poolAddress}&version=${position.version}&token0=${position.token0?.address || ''}&token1=${position.token1?.address || ''}&fee=${position.fee || ''}`}
                  className="btn btn-secondary full-width"
                  style={{ textAlign: 'center' }}
                >
                  Add More Liquidity
                </Link>
              </div>
            )}

            {isClosed && (
              <div className="info-message" style={{ marginTop: '1rem' }}>
                This position has been closed. No further actions available.
              </div>
            )}

            {txError && (
              <div className="tx-error" style={{ marginTop: '1rem' }}>
                {txError}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Remove Liquidity Modal */}
      {showRemoveModal && position && (
        <div className="modal-overlay visible">
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Remove Liquidity</span>
              <button
                className="modal-close"
                onClick={() => {
                  setShowRemoveModal(false)
                  setRemovePercentage(0)
                  setRemoveStatus('idle')
                  setTxError(null)
                }}
                disabled={removeStatus === 'pending'}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="remove-liquidity-form">
                <div className="input-group">
                  <span className="input-label">Amount to Remove</span>
                  <div className="percentage-display">{removePercentage}%</div>
                  <input
                    type="range"
                    className="percentage-slider"
                    min="0"
                    max="100"
                    step="1"
                    value={removePercentage}
                    onChange={(e) => setRemovePercentage(Number(e.target.value))}
                    disabled={removeStatus === 'pending'}
                  />
                  <div className="percentage-buttons">
                    {[25, 50, 75, 100].map((pct) => (
                      <button
                        key={pct}
                        onClick={() => setRemovePercentage(pct)}
                        disabled={removeStatus === 'pending'}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>

                <div className="remove-preview">
                  <div className="preview-header">You will receive</div>
                  <div className="preview-amounts">
                    <div className="preview-row">
                      <span className="token-symbol">{position.token0?.symbol || '???'}</span>
                      <span className="amount">
                        {formatAmount((position.token0?.amount || 0) * (removePercentage / 100))}
                      </span>
                    </div>
                    <div className="preview-row">
                      <span className="token-symbol">{position.token1?.symbol || '???'}</span>
                      <span className="amount">
                        {formatAmount((position.token1?.amount || 0) * (removePercentage / 100))}
                      </span>
                    </div>
                  </div>
                  {hasFees && position.version !== 'V2' && (
                    <div className="fees-note">
                      Unclaimed fees will also be collected
                    </div>
                  )}
                </div>

                {txError && (
                  <div className="tx-error">{txError}</div>
                )}

                <button
                  className="btn btn-primary full-width"
                  onClick={handleRemoveLiquidity}
                  disabled={removePercentage === 0 || removeStatus === 'pending' || removeStatus === 'building'}
                >
                  {removeStatus === 'building' && 'Building...'}
                  {removeStatus === 'pending' && (
                    <>
                      <span className="loading-spinner small" /> Removing...
                    </>
                  )}
                  {removeStatus === 'success' && 'Success!'}
                  {removeStatus === 'error' && 'Failed - Try Again'}
                  {removeStatus === 'idle' && (
                    removePercentage === 100 ? 'Remove All & Close Position' : `Remove ${removePercentage}%`
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Swap Tokens Modal */}
      {showSwapModal && position && (
        <div className="modal-overlay visible">
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Swap Tokens</span>
              <button
                className="modal-close"
                onClick={() => {
                  setShowSwapModal(false)
                  setSwapAmount('')
                  setSwapQuote(null)
                  setSwapStatus('idle')
                  setTxError(null)
                }}
                disabled={swapStatus === 'pending'}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="swap-form">
                {/* Direction Toggle */}
                <div className="input-group">
                  <span className="input-label">Direction</span>
                  <div className="direction-toggle">
                    <button
                      className={`direction-btn ${swapDirection === '0to1' ? 'active' : ''}`}
                      onClick={() => setSwapDirection('0to1')}
                      disabled={swapStatus === 'pending'}
                    >
                      {position.token0?.symbol || '???'} → {position.token1?.symbol || '???'}
                    </button>
                    <button
                      className={`direction-btn ${swapDirection === '1to0' ? 'active' : ''}`}
                      onClick={() => setSwapDirection('1to0')}
                      disabled={swapStatus === 'pending'}
                    >
                      {position.token1?.symbol || '???'} → {position.token0?.symbol || '???'}
                    </button>
                  </div>
                </div>

                {/* Amount Input */}
                <div className="input-group">
                  <span className="input-label">
                    Amount ({tokenIn?.symbol || '???'})
                  </span>
                  <input
                    type="number"
                    className="amount-input"
                    placeholder="0.0"
                    value={swapAmount}
                    onChange={(e) => setSwapAmount(e.target.value)}
                    disabled={swapStatus === 'pending'}
                  />
                </div>

                {/* Real-time Quote Loading */}
                {quoteLoading && (
                  <div className="quote-loading">
                    <span className="loading-spinner small" /> Getting quote...
                  </div>
                )}

                {/* Quote Display */}
                {swapQuote && amountInWei > 0n && (
                  <div className="swap-quote">
                    <div className="quote-row">
                      <span className="quote-label">Expected Output</span>
                      <span className="quote-value">
                        {formatAmount(Number(swapQuote.amountOut) / Math.pow(10, decimalsOut), 6)} {tokenOut?.symbol}
                      </span>
                    </div>
                    <div className="quote-row">
                      <span className="quote-label">Price Impact</span>
                      <span className={`quote-value ${swapQuote.priceImpact > 5 ? 'warning' : ''}`}>
                        {swapQuote.priceImpact.toFixed(2)}%
                      </span>
                    </div>
                    <div className="quote-row">
                      <span className="quote-label">Min. Received (0.5% slippage)</span>
                      <span className="quote-value">
                        {formatAmount(Number(swapQuote.amountOut) * 0.995 / Math.pow(10, decimalsOut), 6)} {tokenOut?.symbol}
                      </span>
                    </div>
                    {swapQuote.priceImpact > 5 && (
                      <div className="price-impact-warning">
                        High price impact! Consider using a smaller amount.
                      </div>
                    )}
                  </div>
                )}

                {txError && (
                  <div className="tx-error">{txError}</div>
                )}

                {/* Execute Swap Button */}
                <button
                  className="btn btn-primary full-width"
                  onClick={handleExecuteSwap}
                  disabled={!swapQuote || swapStatus === 'pending' || swapStatus === 'building'}
                >
                  {swapStatus === 'building' && 'Building...'}
                  {swapStatus === 'pending' && (
                    <>
                      <span className="loading-spinner small" /> Swapping...
                    </>
                  )}
                  {swapStatus === 'success' && 'Success!'}
                  {swapStatus === 'error' && 'Failed - Try Again'}
                  {swapStatus === 'idle' && (swapQuote ? 'Execute Swap' : 'Enter amount')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}
