'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useWallet } from '@/hooks/useWallet'
import { usePositions } from '@/hooks/usePositions'
import { AppHeader } from '@/components/AppHeader'
import { Footer } from '@/components/Footer'
import { BackButton } from '@/components/BackButton'
import { PositionCard } from '@/components/PositionCard'
import { ROUTES } from '@/utils/constants'

export default function PositionsPage() {
  const wallet = useWallet()
  const { positions, loading, refreshing, error, lastRefresh, refresh } = usePositions(wallet)
  const [showClosed, setShowClosed] = useState(false)

  // All positions returned from the API have on-chain liquidity.
  // Positions with liquidityUsd === 0 have active liquidity but missing price data.
  const pricedPositions = positions.filter(p => p.liquidityUsd > 0)
  const unpricedPositions = positions.filter(p => !p.liquidityUsd || p.liquidityUsd === 0)

  const displayedPositions = showClosed ? positions : pricedPositions

  return (
    <div className="app">
      <AppHeader />

      <div className="main-content">
        <BackButton href={ROUTES.HOME} label="Back to Home" />

        <div className="section-header">
          <h2>
            My Positions
            <span className="count">({pricedPositions.length})</span>
            {unpricedPositions.length > 0 && (
              <span className="closed-count">+ {unpricedPositions.length} unpriced</span>
            )}
          </h2>
          <div className="header-actions">
            <span className="cache-age" style={{ fontSize: '0.75rem', color: 'var(--text-muted, #888)', marginRight: '0.5rem' }}>
              {lastRefresh !== 'Never' && lastRefresh}
            </span>
            <button
              className="btn btn-secondary btn-sm"
              onClick={refresh}
              disabled={refreshing}
              style={{ minWidth: 'auto', padding: '0.25rem 0.5rem' }}
            >
              {refreshing ? '...' : '\u21BB'}
            </button>
            <Link href={ROUTES.ADD_LIQUIDITY} className="btn btn-primary btn-sm">
              + Add
            </Link>
          </div>
        </div>

        {!wallet ? (
          <div className="empty-state">
            <p>Connect your wallet to view positions</p>
            <p className="hint">Your wallet will connect automatically in Farcaster</p>
          </div>
        ) : loading ? (
          <div className="loading-state">
            <div className="loading-spinner" />
            <p>Loading positions...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <p>{error}</p>
            <button onClick={() => window.location.reload()}>Retry</button>
          </div>
        ) : displayedPositions.length === 0 ? (
          <div className="empty-state">
            <p>No {showClosed ? '' : 'active '}positions found</p>
            <p className="hint">Add liquidity to a pool to get started</p>
            <p className="hint">If you believe this is an error, refresh to try again.</p>
            <Link href={ROUTES.ADD_LIQUIDITY} className="btn btn-primary" style={{ marginTop: '1rem' }}>
              Add Liquidity
            </Link>
          </div>
        ) : (
          <>
            {unpricedPositions.length > 0 && (
              <div className="positions-filter">
                <label className="filter-toggle">
                  <input
                    type="checkbox"
                    checked={showClosed}
                    onChange={(e) => setShowClosed(e.target.checked)}
                  />
                  <span className="filter-label">Show positions without price data</span>
                </label>
              </div>
            )}

            <div className="positions-grid">
              {displayedPositions.map((position) => (
                <PositionCard key={position.id} position={position} />
              ))}
            </div>
          </>
        )}
      </div>

      <Footer />
    </div>
  )
}
