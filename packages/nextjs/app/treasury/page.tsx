'use client'

import { useEffect, useState } from 'react'
import { AppHeader } from '@/components/AppHeader'
import { Footer } from '@/components/Footer'
import { BackButton } from '@/components/BackButton'

const MULTISIG_ADDRESS = '0xc35c2dCdD084F1Df8a4dDbD374436E35136b4368'

interface TreasuryAsset {
  address: string
  symbol: string
  balance: number
  priceUsd: number
  valueUsd: number
}

interface TreasuryData {
  ethBalance: number
  ethPriceUsd: number
  ethValueUsd: number
  assets: TreasuryAsset[]
  totalValue: number
}

export default function TreasuryPage() {
  const [data, setData] = useState<TreasuryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchTreasury = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/treasury')
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Failed to fetch (${res.status})`)
      }
      const result = await res.json()
      setData(result)
      setLastUpdated(new Date())
    } catch (err: any) {
      console.error('[Treasury] Error:', err)
      setError(err.message || 'Failed to fetch treasury data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTreasury()
  }, [])

  const formatBalance = (value: number): string => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`
    if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`
    if (value >= 1) return value.toLocaleString(undefined, { maximumFractionDigits: 4 })
    if (value >= 0.0001) return value.toFixed(6)
    return value.toFixed(8)
  }

  const formatUsd = (value: number): string => {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
    if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`
    if (value >= 0.01) return `$${value.toFixed(2)}`
    return `$${value.toFixed(4)}`
  }

  const formatPrice = (value: number): string => {
    if (value >= 1) return `$${value.toFixed(2)}`
    if (value >= 0.01) return `$${value.toFixed(4)}`
    if (value >= 0.0001) return `$${value.toFixed(6)}`
    return `$${value.toFixed(8)}`
  }

  return (
    <div className="app">
      <AppHeader />

      <div className="main-content">
        <BackButton href="/" label="Back" />

        <div className="page-header">
          <h1 style={{ fontFamily: 'var(--font-mono)' }}>ABC_DAO_Treasury</h1>
          <p className="page-subtitle">Live balances from the multisig</p>
        </div>

        {/* Multisig Address */}
        <div className="treasury-address-card">
          <div className="treasury-label">Multisig Address</div>
          <a
            href={`https://basescan.org/address/${MULTISIG_ADDRESS}`}
            target="_blank"
            rel="noopener noreferrer"
            className="treasury-address"
          >
            {MULTISIG_ADDRESS}
          </a>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner" />
            <p>Fetching balances...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <p>{error}</p>
            <button className="btn btn-secondary" onClick={fetchTreasury}>
              Retry
            </button>
          </div>
        ) : data ? (
          <>
            <div className="treasury-section">
              <h2 className="section-title">Assets</h2>
              <div className="treasury-tokens-list">
                <div className="treasury-total-card">
                  <div className="treasury-total-label">Total Value</div>
                  <div className="treasury-total-value">{formatUsd(data.totalValue)}</div>
                </div>

                {/* ETH */}
                <div className="treasury-balance-card">
                  <div className="treasury-token-info">
                    <div className="treasury-token-symbol">ETH</div>
                    <a
                      href={`https://basescan.org/address/${MULTISIG_ADDRESS}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="treasury-token-link"
                    >
                      View on Basescan
                    </a>
                  </div>
                  <div className="treasury-token-values">
                    <div className="treasury-token-balance">
                      {formatBalance(data.ethBalance)} ETH
                    </div>
                    <div className="treasury-token-usd">
                      {formatUsd(data.ethValueUsd)}
                      {data.ethPriceUsd > 0 && (
                        <span className="treasury-token-price">
                          @ {formatPrice(data.ethPriceUsd)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tokens */}
                {data.assets.map((asset) => (
                  <div key={asset.address} className="treasury-balance-card">
                    <div className="treasury-token-info">
                      <div className="treasury-token-symbol">{asset.symbol}</div>
                      <a
                        href={`https://basescan.org/token/${asset.address}?a=${MULTISIG_ADDRESS}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="treasury-token-link"
                      >
                        View on Basescan
                      </a>
                    </div>
                    <div className="treasury-token-values">
                      <div className="treasury-token-balance">
                        {formatBalance(asset.balance)} {asset.symbol}
                      </div>
                      <div className="treasury-token-usd">
                        {formatUsd(asset.valueUsd)}
                        {asset.priceUsd > 0 && (
                          <span className="treasury-token-price">
                            @ {formatPrice(asset.priceUsd)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Refresh Button & Last Updated */}
            <div className="treasury-footer">
              <button className="btn btn-secondary" onClick={fetchTreasury}>
                Refresh
              </button>
              {lastUpdated && (
                <span className="treasury-updated">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </div>
          </>
        ) : null}
      </div>

      <Footer />
    </div>
  )
}
