'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AppHeader } from '@/components/AppHeader'
import { Footer } from '@/components/Footer'
import { BackButton } from '@/components/BackButton'

// ABCDAO Multisig
const MULTISIG_ADDRESS = '0xc35c2dCdD084F1Df8a4dDbD374436E35136b4368'

// Known token addresses on Base
const KNOWN_TOKENS: Record<string, { symbol: string; decimals: number }> = {
  '0xc647421c5dc78d1c3960faa7a33f9aefdf4b7b07': { symbol: 'ARBME', decimals: 18 },
  '0x768be13e1680b5ebe0024c42c896e3db59ec0149': { symbol: 'RATCHET', decimals: 18 },
  '0x60c39541540e49a18e4c591c74b3487b4cd2aa27': { symbol: 'ABC', decimals: 18 },
  '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': { symbol: 'USDC', decimals: 6 },
  '0x4200000000000000000000000000000000000006': { symbol: 'WETH', decimals: 18 },
  '0x50c5725949a6f0c72e6c4a641f24049a917db0cb': { symbol: 'DAI', decimals: 18 },
}

interface TokenBalance {
  address: string
  symbol: string
  balance: string
  balanceFormatted: number
}

export default function TreasuryPage() {
  const [ethBalance, setEthBalance] = useState<string | null>(null)
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchBalances = async () => {
    setLoading(true)
    setError(null)

    try {
      const ALCHEMY_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY
      const rpcUrl = ALCHEMY_KEY
        ? `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
        : 'https://mainnet.base.org'

      // Fetch ETH balance
      const ethResponse = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getBalance',
          params: [MULTISIG_ADDRESS, 'latest'],
        }),
      })

      const ethData = await ethResponse.json()
      if (ethData.result) {
        const ethWei = BigInt(ethData.result)
        const ethFormatted = Number(ethWei) / 1e18
        setEthBalance(ethFormatted.toFixed(4))
      }

      // Fetch token balances using Alchemy's getTokenBalances if available
      if (ALCHEMY_KEY) {
        const tokenResponse = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 2,
            method: 'alchemy_getTokenBalances',
            params: [MULTISIG_ADDRESS],
          }),
        })

        const tokenData = await tokenResponse.json()

        if (tokenData.result?.tokenBalances) {
          const balances: TokenBalance[] = []

          for (const token of tokenData.result.tokenBalances) {
            const address = token.contractAddress.toLowerCase()
            const known = KNOWN_TOKENS[address]

            if (known && token.tokenBalance !== '0x0' && token.tokenBalance !== '0x') {
              const balanceWei = BigInt(token.tokenBalance)
              const balanceFormatted = Number(balanceWei) / Math.pow(10, known.decimals)

              if (balanceFormatted > 0) {
                balances.push({
                  address: token.contractAddress,
                  symbol: known.symbol,
                  balance: token.tokenBalance,
                  balanceFormatted,
                })
              }
            }
          }

          // Sort by known importance
          const order = ['ARBME', 'RATCHET', 'ABC', 'WETH', 'USDC', 'DAI']
          balances.sort((a, b) => {
            const aIndex = order.indexOf(a.symbol)
            const bIndex = order.indexOf(b.symbol)
            return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex)
          })

          setTokenBalances(balances)
        }
      } else {
        // Fallback: manually check known tokens via balanceOf
        const balances: TokenBalance[] = []

        for (const [address, token] of Object.entries(KNOWN_TOKENS)) {
          try {
            // balanceOf(address) selector = 0x70a08231
            const data = `0x70a08231000000000000000000000000${MULTISIG_ADDRESS.slice(2)}`

            const response = await fetch(rpcUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'eth_call',
                params: [{ to: address, data }, 'latest'],
              }),
            })

            const result = await response.json()

            if (result.result && result.result !== '0x' && result.result !== '0x0') {
              const balanceWei = BigInt(result.result)
              const balanceFormatted = Number(balanceWei) / Math.pow(10, token.decimals)

              if (balanceFormatted > 0) {
                balances.push({
                  address,
                  symbol: token.symbol,
                  balance: result.result,
                  balanceFormatted,
                })
              }
            }
          } catch (err) {
            console.error(`Failed to fetch ${token.symbol} balance:`, err)
          }
        }

        setTokenBalances(balances)
      }

      setLastUpdated(new Date())
    } catch (err: any) {
      console.error('[Treasury] Error fetching balances:', err)
      setError(err.message || 'Failed to fetch balances')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBalances()
  }, [])

  const formatBalance = (value: number): string => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`
    if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`
    if (value >= 1) return value.toLocaleString(undefined, { maximumFractionDigits: 4 })
    if (value >= 0.0001) return value.toFixed(6)
    return value.toFixed(8)
  }

  return (
    <div className="app">
      <AppHeader />

      <div className="main-content">
        <BackButton href="/" label="Back" />

        <div className="page-header">
          <h1>ABCDAO Treasury</h1>
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
            <button className="btn btn-secondary" onClick={fetchBalances}>
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* ETH Balance */}
            <div className="treasury-section">
              <h2 className="section-title">Native Balance</h2>
              <div className="treasury-balance-card">
                <div className="treasury-token-symbol">ETH</div>
                <div className="treasury-token-balance">
                  {ethBalance || '0'} ETH
                </div>
              </div>
            </div>

            {/* Token Balances */}
            {tokenBalances.length > 0 && (
              <div className="treasury-section">
                <h2 className="section-title">Token Balances</h2>
                <div className="treasury-tokens-list">
                  {tokenBalances.map((token) => (
                    <div key={token.address} className="treasury-balance-card">
                      <div className="treasury-token-info">
                        <div className="treasury-token-symbol">{token.symbol}</div>
                        <a
                          href={`https://basescan.org/token/${token.address}?a=${MULTISIG_ADDRESS}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="treasury-token-link"
                        >
                          View on Basescan
                        </a>
                      </div>
                      <div className="treasury-token-balance">
                        {formatBalance(token.balanceFormatted)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tokenBalances.length === 0 && (
              <div className="treasury-section">
                <p className="text-muted">No token balances found</p>
              </div>
            )}

            {/* Refresh Button & Last Updated */}
            <div className="treasury-footer">
              <button className="btn btn-secondary" onClick={fetchBalances}>
                Refresh
              </button>
              {lastUpdated && (
                <span className="treasury-updated">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </div>
          </>
        )}
      </div>

      <Footer />
    </div>
  )
}
