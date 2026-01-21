'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useAppState } from '@/store/AppContext'
import { useWallet } from '@/hooks/useWallet'
import { fetchPosition, buildCollectFeesTransaction } from '@/services/api'
import { formatUsd } from '@/utils/format'
import type { Position } from '@/utils/types'
import { AppHeader } from '@/components/AppHeader'
import Link from 'next/link'
import sdk from '@farcaster/miniapp-sdk'

export default function PositionDetailPage() {
  const params = useParams()
  const id = params.id as string
  const { state } = useAppState()
  const { error } = state
  const wallet = useWallet()
  const [position, setPosition] = useState<Position | null>(null)
  const [loading, setLoading] = useState(true)
  const [collecting, setCollecting] = useState(false)

  useEffect(() => {
    if (wallet && id) {
      loadPosition()
    }
  }, [wallet, id])

  async function loadPosition() {
    if (!wallet || !id) {
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      console.log('[PositionDetail] Fetching position:', id, 'for wallet:', wallet)
      const data = await fetchPosition(id, wallet)
      console.log('[PositionDetail] Received position:', data)
      setPosition(data)
      setLoading(false)
    } catch (err) {
      console.error('[PositionDetail] Failed to load position:', err)
      setLoading(false)
    }
  }

  async function handleCollectFees() {
    if (!wallet || !position) return

    setCollecting(true)

    try {
      console.log('[PositionDetail] Building collect fees transaction')
      const transaction = await buildCollectFeesTransaction(position.id, wallet)
      const provider = await sdk.wallet.getEthereumProvider()

      if (!provider) throw new Error('No Ethereum provider available')

      console.log('[PositionDetail] Sending transaction')
      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: wallet as `0x${string}`,
          to: transaction.to as `0x${string}`,
          data: transaction.data as `0x${string}`,
          value: transaction.value as `0x${string}`,
        }],
      })

      console.log('[PositionDetail] Transaction sent:', txHash)

      setTimeout(async () => {
        await loadPosition()
        alert('Fees collected successfully!')
        setCollecting(false)
      }, 3000)

    } catch (err) {
      console.error('[PositionDetail] Fee collection failed:', err)
      alert(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
      setCollecting(false)
    }
  }

  if (!wallet || !id) {
    return (
      <div className="position-detail-page">
        <AppHeader />
        <div className="page-subheader">
          <Link href="/positions" className="back-button">← Back to Positions</Link>
          <h2>Position Details</h2>
        </div>
        <div className="empty-state">
          <p className="text-secondary">Wallet not connected or invalid position ID</p>
        </div>
      </div>
    )
  }

  if (loading || !position) {
    return (
      <div className="position-detail-page">
        <AppHeader />
        <div className="page-subheader">
          <Link href="/positions" className="back-button">← Back to Positions</Link>
          <h2>Position Details</h2>
        </div>

        <div className="loading-state">
          <div className="spinner"></div>
          <p className="text-secondary">Loading position...</p>
        </div>
      </div>
    )
  }

  const inRangeBadge = position.inRange !== undefined
    ? position.inRange
      ? <span className="badge badge-success">✓ In Range</span>
      : <span className="badge badge-warning">⚠ Out of Range</span>
    : null

  return (
    <div className="position-detail-page">
      <AppHeader />
      <div className="page-subheader">
        <Link href="/positions" className="back-button">← Back to Positions</Link>
        <h2>{position.pair} Position</h2>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="position-detail-card">
        <div className="detail-header">
          <h2>{position.pair}</h2>
          <span className="position-version text-secondary">{position.version}</span>
        </div>

        <div className="detail-section">
          <h3>Value</h3>
          <div className="detail-stats">
            <div className="stat-large">
              <span className="stat-label text-secondary">Your Liquidity</span>
              <span className="stat-value">{formatUsd(position.liquidityUsd)}</span>
            </div>
            <div className="stat-large">
              <span className="stat-label text-secondary">Uncollected Fees</span>
              <span className="stat-value text-positive">{formatUsd(position.feesEarnedUsd)}</span>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h3>Token Amounts</h3>
          <div className="detail-list">
            <div className="detail-item">
              <span className="text-secondary">{position.token0.symbol}</span>
              <span>{position.token0.amount.toFixed(6)}</span>
            </div>
            <div className="detail-item">
              <span className="text-secondary">{position.token1.symbol}</span>
              <span>{position.token1.amount.toFixed(6)}</span>
            </div>
          </div>
        </div>

        {position.priceRange && (
          <div className="detail-section">
            <h3>Price Range</h3>
            <div className="detail-list">
              <div className="detail-item">
                <span className="text-secondary">Min Price</span>
                <span>${position.priceRange.min.toFixed(6)}</span>
              </div>
              <div className="detail-item">
                <span className="text-secondary">Max Price</span>
                <span>${position.priceRange.max.toFixed(6)}</span>
              </div>
              <div className="detail-item">
                <span className="text-secondary">Status</span>
                {inRangeBadge}
              </div>
            </div>
          </div>
        )}

        <div className="detail-actions">
          <button
            onClick={handleCollectFees}
            disabled={position.feesEarnedUsd === 0 || collecting}
            className="button-primary collect-fees-btn-large"
          >
            {collecting ? 'Collecting Fees...' : 'Collect Fees'}
          </button>
        </div>
      </div>
    </div>
  )
}
