'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { fetchPools } from '@/services/api'
import { AppHeader } from '@/components/AppHeader'
import { Footer } from '@/components/Footer'
import { BackButton } from '@/components/BackButton'
import { ROUTES } from '@/utils/constants'
import type { Pool, PoolsResponse } from '@/utils/types'
import { buildTradeHref, dexToVersion } from '@/utils/trade-links'

function formatUsd(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`
  if (value >= 1) return `$${value.toFixed(2)}`
  return `$${value.toFixed(4)}`
}

export default function TradeIndexPage() {
  const [data, setData] = useState<PoolsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'arbme' | 'ratchet'>('all')

  useEffect(() => {
    fetchPools()
      .then(setData)
      .catch((err) => {
        console.error('[Trade] Failed to fetch pools:', err)
        setError('Failed to load pools')
      })
      .finally(() => setLoading(false))
  }, [])

  const pools = useMemo(() => {
    if (!data?.pools) return []

    let filtered = data.pools.filter(p => p.tvl > 1)

    if (filter === 'arbme') {
      filtered = filtered.filter(p => p.pair.toUpperCase().includes('ARBME'))
    } else if (filter === 'ratchet') {
      filtered = filtered.filter(p => p.pair.toUpperCase().includes('RATCHET'))
    }

    // Sort by TVL descending
    return filtered.sort((a, b) => b.tvl - a.tvl)
  }, [data, filter])

  return (
    <div className="app">
      <AppHeader />

      <div className="main-content">
        <BackButton href={ROUTES.HOME} label="Back" />

        <div className="page-header">
          <h1 style={{ fontFamily: 'var(--font-mono)' }}>Trade</h1>
          <p className="page-subtitle">Swap tokens in any pool</p>
        </div>

        {/* Filter */}
        <div className="trade-filters">
          {(['all', 'arbme', 'ratchet'] as const).map((f) => (
            <button
              key={f}
              className={`trade-filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All Pools' : f === 'arbme' ? 'ARBME' : 'RATCHET'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner" />
            <p>Loading pools...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <p>{error}</p>
          </div>
        ) : pools.length === 0 ? (
          <div className="empty-state">
            <p>No pools found</p>
          </div>
        ) : (
          <div className="trade-pool-list">
            {pools.map((pool) => {
              const tradeHref = buildTradeHref(pool)
              const version = dexToVersion(pool.dex) || pool.dex
              const changeClass = pool.priceChange24h >= 0 ? 'positive' : 'negative'
              const changeSign = pool.priceChange24h >= 0 ? '+' : ''

              const card = (
                <div className="trade-pool-card">
                  <div className="trade-pool-top">
                    <span className="trade-pool-pair">{pool.pair}</span>
                    <span className={`version-badge ${version.toLowerCase()}`}>{version}</span>
                  </div>
                  <div className="trade-pool-stats">
                    <div className="trade-pool-stat">
                      <span className="trade-stat-label">TVL</span>
                      <span className="trade-stat-value">{formatUsd(pool.tvl)}</span>
                    </div>
                    <div className="trade-pool-stat">
                      <span className="trade-stat-label">24h Vol</span>
                      <span className="trade-stat-value">{formatUsd(pool.volume24h)}</span>
                    </div>
                    <div className="trade-pool-stat">
                      <span className="trade-stat-label">24h</span>
                      <span className={`trade-stat-value ${changeClass}`}>
                        {changeSign}{pool.priceChange24h.toFixed(2)}%
                      </span>
                    </div>
                    {pool.fee && (
                      <div className="trade-pool-stat">
                        <span className="trade-stat-label">Fee</span>
                        <span className="trade-stat-value">{(pool.fee / 10000).toFixed(2)}%</span>
                      </div>
                    )}
                  </div>
                </div>
              )

              if (tradeHref) {
                return (
                  <Link key={pool.pairAddress} href={tradeHref} className="trade-pool-link">
                    {card}
                  </Link>
                )
              }

              // Fallback: link to external DEX
              return (
                <a
                  key={pool.pairAddress}
                  href={pool.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="trade-pool-link"
                >
                  {card}
                  <span className="trade-external-badge">External</span>
                </a>
              )
            })}
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}
