'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useWallet, useIsFarcaster } from '@/hooks/useWallet'
import { AppHeader } from '@/components/AppHeader'
import { Footer } from '@/components/Footer'
import { BackButton } from '@/components/BackButton'
import { useSendTransaction } from 'wagmi'

const API_BASE = '/api'

type TxStatus = 'idle' | 'building' | 'pending' | 'success' | 'error'

interface TokenInfo {
  address: string
  symbol: string
  decimals: number
}

export default function TradePage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const wallet = useWallet()
  const isFarcaster = useIsFarcaster()
  const { sendTransactionAsync } = useSendTransaction()

  const poolAddress = params.pool as string

  // Parse query params
  const token0Address = searchParams.get('t0') || ''
  const token1Address = searchParams.get('t1') || ''
  const version = (searchParams.get('v') || 'V4') as 'V2' | 'V3' | 'V4'
  const fee = parseInt(searchParams.get('fee') || '3000', 10)
  const tickSpacing = parseInt(searchParams.get('ts') || '60', 10)
  const pairName = searchParams.get('pair') || 'Token Swap'

  // Token info state (fetched on mount)
  const [token0, setToken0] = useState<TokenInfo | null>(null)
  const [token1, setToken1] = useState<TokenInfo | null>(null)
  const [loading, setLoading] = useState(true)

  // Swap state
  const [swapDirection, setSwapDirection] = useState<'0to1' | '1to0'>('0to1')
  const [swapAmount, setSwapAmount] = useState('')
  const [swapQuote, setSwapQuote] = useState<{
    amountOut: string
    priceImpact: number
    executionPrice: number
  } | null>(null)
  const [swapStatus, setSwapStatus] = useState<TxStatus>('idle')
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch token info (symbols, decimals)
  useEffect(() => {
    async function fetchTokenInfo() {
      if (!token0Address || !token1Address) {
        setLoading(false)
        return
      }

      try {
        // Fetch token info from RPC or use common token lookup
        const [t0Info, t1Info] = await Promise.all([
          getTokenInfo(token0Address),
          getTokenInfo(token1Address),
        ])

        setToken0(t0Info)
        setToken1(t1Info)
      } catch (err) {
        console.error('[TradePage] Error fetching token info:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchTokenInfo()
  }, [token0Address, token1Address])

  // Common token lookup (saves RPC calls for known tokens)
  async function getTokenInfo(address: string): Promise<TokenInfo> {
    const knownTokens: Record<string, { symbol: string; decimals: number }> = {
      '0xc647421c5dc78d1c3960faa7a33f9aefdf4b7b07': { symbol: 'ARBME', decimals: 18 },
      '0x4200000000000000000000000000000000000006': { symbol: 'WETH', decimals: 18 },
      '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': { symbol: 'USDC', decimals: 6 },
      '0x1bc0c42215582d5a085795f3ee422eca40256c17': { symbol: 'CLANKER', decimals: 18 },
      '0x5a845d59b57ee3eb076cefc100c68c0aa8e3d7e2': { symbol: 'PAGE', decimals: 18 },
      '0x1c466dfcce7c2c18eb9f54a3cbb6d2e36da7c821': { symbol: 'OINC', decimals: 18 },
      '0x768be13e1680b5ebe0024c42c896e3db59ec0149': { symbol: 'RATCHET', decimals: 18 },
      '0x60c39541540e49a18e4c591c74b3487b4cd2aa27': { symbol: 'ABC', decimals: 18 },
    }

    const lowerAddr = address.toLowerCase()
    if (knownTokens[lowerAddr]) {
      return { address, ...knownTokens[lowerAddr] }
    }

    // Fallback: fetch from RPC
    // For now, assume 18 decimals and use truncated address as symbol
    return {
      address,
      symbol: address.slice(0, 6) + '...',
      decimals: 18,
    }
  }

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

  const handleGetQuote = async () => {
    if (!token0 || !token1 || !swapAmount || parseFloat(swapAmount) <= 0) return

    try {
      setQuoteLoading(true)
      setSwapQuote(null)
      setError(null)

      const tokenIn = swapDirection === '0to1' ? token0.address : token1.address
      const tokenOut = swapDirection === '0to1' ? token1.address : token0.address
      const decimalsIn = swapDirection === '0to1' ? token0.decimals : token1.decimals

      // Convert amount to wei
      const amountInWei = BigInt(Math.floor(parseFloat(swapAmount) * Math.pow(10, decimalsIn))).toString()

      const res = await fetch(`${API_BASE}/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poolAddress,
          version,
          tokenIn,
          tokenOut,
          amountIn: amountInWei,
          fee,
          tickSpacing,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to get quote')
      }

      const data = await res.json()
      setSwapQuote(data)
    } catch (err: any) {
      console.error('[getQuote] Error:', err)
      setError(err.message || 'Failed to get quote')
    } finally {
      setQuoteLoading(false)
    }
  }

  const handleExecuteSwap = async () => {
    if (!token0 || !token1 || !wallet || !swapQuote || !swapAmount) return

    try {
      setSwapStatus('building')
      setError(null)

      const tokenIn = swapDirection === '0to1' ? token0.address : token1.address
      const tokenOut = swapDirection === '0to1' ? token1.address : token0.address
      const decimalsIn = swapDirection === '0to1' ? token0.decimals : token1.decimals

      // Convert amount to wei
      const amountInWei = BigInt(Math.floor(parseFloat(swapAmount) * Math.pow(10, decimalsIn))).toString()

      // Apply 0.5% slippage to the quote
      const minAmountOut = BigInt(Math.floor(Number(swapQuote.amountOut) * 0.995)).toString()

      const res = await fetch(`${API_BASE}/swap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poolAddress,
          version,
          tokenIn,
          tokenOut,
          amountIn: amountInWei,
          minAmountOut,
          recipient: wallet,
          fee,
          tickSpacing,
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

      // Reset after success
      setTimeout(() => {
        setSwapStatus('idle')
        setSwapAmount('')
        setSwapQuote(null)
      }, 3000)
    } catch (err: any) {
      console.error('[executeSwap] Error:', err)
      setError(err.message || 'Swap failed')
      setSwapStatus('error')
    }
  }

  const formatAmount = (amount: number | undefined, decimals: number = 6) => {
    if (amount === undefined || amount === null) return '0'
    if (amount < 0.000001) return '<0.000001'
    if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M`
    if (amount >= 1_000) return `${(amount / 1_000).toFixed(2)}K`
    return amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: decimals })
  }

  const tokenInSymbol = swapDirection === '0to1' ? token0?.symbol : token1?.symbol
  const tokenOutSymbol = swapDirection === '0to1' ? token1?.symbol : token0?.symbol
  const decimalsOut = swapDirection === '0to1' ? (token1?.decimals || 18) : (token0?.decimals || 18)

  return (
    <div className="app">
      <AppHeader />

      <div className="main-content">
        <BackButton href="/" label="Back to Pools" />

        <div className="page-header">
          <h1>Trade {pairName}</h1>
          <div className="pool-meta">
            <span className={`version-badge ${version.toLowerCase()}`}>{version}</span>
            <span className="fee-badge">{(fee / 10000).toFixed(2)}% fee</span>
          </div>
        </div>

        {!wallet ? (
          <div className="empty-state">
            <p>Connect your wallet to trade</p>
          </div>
        ) : loading ? (
          <div className="loading-state">
            <div className="loading-spinner" />
            <p>Loading pool...</p>
          </div>
        ) : !token0 || !token1 ? (
          <div className="error-state">
            <p>Invalid pool configuration</p>
            <button onClick={() => router.push('/')}>Back to Pools</button>
          </div>
        ) : (
          <div className="trade-card">
            {/* Direction Toggle */}
            <div className="input-group">
              <span className="input-label">Direction</span>
              <div className="direction-toggle">
                <button
                  className={`direction-btn ${swapDirection === '0to1' ? 'active' : ''}`}
                  onClick={() => {
                    setSwapDirection('0to1')
                    setSwapQuote(null)
                  }}
                  disabled={swapStatus === 'pending'}
                >
                  {token0.symbol} → {token1.symbol}
                </button>
                <button
                  className={`direction-btn ${swapDirection === '1to0' ? 'active' : ''}`}
                  onClick={() => {
                    setSwapDirection('1to0')
                    setSwapQuote(null)
                  }}
                  disabled={swapStatus === 'pending'}
                >
                  {token1.symbol} → {token0.symbol}
                </button>
              </div>
            </div>

            {/* Amount Input */}
            <div className="input-group">
              <span className="input-label">Amount ({tokenInSymbol})</span>
              <input
                type="number"
                className="amount-input"
                placeholder="0.0"
                value={swapAmount}
                onChange={(e) => {
                  setSwapAmount(e.target.value)
                  setSwapQuote(null)
                }}
                disabled={swapStatus === 'pending'}
              />
            </div>

            {/* Get Quote Button */}
            <button
              className="btn btn-secondary full-width"
              onClick={handleGetQuote}
              disabled={!swapAmount || parseFloat(swapAmount) <= 0 || quoteLoading || swapStatus === 'pending'}
            >
              {quoteLoading ? (
                <>
                  <span className="loading-spinner small" /> Getting Quote...
                </>
              ) : (
                'Get Quote'
              )}
            </button>

            {/* Quote Display */}
            {swapQuote && (
              <div className="swap-quote">
                <div className="quote-row">
                  <span className="quote-label">Expected Output</span>
                  <span className="quote-value">
                    {formatAmount(Number(swapQuote.amountOut) / Math.pow(10, decimalsOut))} {tokenOutSymbol}
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
                    {formatAmount(Number(swapQuote.amountOut) * 0.995 / Math.pow(10, decimalsOut))} {tokenOutSymbol}
                  </span>
                </div>
                {swapQuote.priceImpact > 5 && (
                  <div className="price-impact-warning">
                    High price impact! Consider using a smaller amount.
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="tx-error">{error}</div>
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
              {swapStatus === 'idle' && 'Execute Swap'}
            </button>
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}
