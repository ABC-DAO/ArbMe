'use client'

import { useEffect } from 'react'
import { useAppState } from '@/store/AppContext'
import { useWallet } from '@/hooks/useWallet'
import { fetchPools } from '@/services/api'
import { FEATURED_POOLS, type FeaturedPoolConfig } from '@/utils/constants'
import type { Pool } from '@/utils/types'
import { AppHeader } from '@/components/AppHeader'
import PoolCard from '@/components/PoolCard'
import Link from 'next/link'

export default function HomePage() {
  const { state, setState } = useAppState()
  const { pools, loading, error } = state
  const wallet = useWallet()

  useEffect(() => {
    if (!loading && pools.length === 0) {
      loadPools()
    }
  }, [])

  async function loadPools() {
    setState({ loading: true, error: null })

    try {
      const data = await fetchPools()
      setState({
        pools: data.pools,
        globalStats: {
          arbmePrice: data.arbmePrice,
          totalTvl: data.totalTvl,
        },
        loading: false
      })
    } catch (err) {
      console.error('[Home] Failed to load pools:', err)
      setState({
        error: 'Failed to load pools. Please try again.',
        loading: false,
      })
    }
  }

  function matchesTokenPair(pool: Pool, config: FeaturedPoolConfig): boolean {
    if (!pool.token0 || !pool.token1) return false

    const p0 = pool.token0.toLowerCase()
    const p1 = pool.token1.toLowerCase()
    const c0 = config.token0Address.toLowerCase()
    const c1 = config.token1Address.toLowerCase()

    return (p0 === c0 && p1 === c1) || (p0 === c1 && p1 === c0)
  }

  function getFeaturedPools(): Pool[] {
    const featuredPools: Pool[] = []

    for (const config of FEATURED_POOLS) {
      const match = pools.find(p => matchesTokenPair(p, config))
      if (match) {
        featuredPools.push(match)
      }
    }

    return featuredPools.sort((a, b) => {
      const aConfig = FEATURED_POOLS.find(c => matchesTokenPair(a, c))
      const bConfig = FEATURED_POOLS.find(c => matchesTokenPair(b, c))
      return (aConfig?.priority || 999) - (bConfig?.priority || 999)
    })
  }

  const featuredPools = getFeaturedPools()

  return (
    <div className="home-page">
      <AppHeader />

      {error && <div className="error-banner">{error}</div>}

      <div className="pools-grid">
        {loading || featuredPools.length === 0
          ? FEATURED_POOLS.map((_, i) => <PoolCard key={i} pool={null} />)
          : featuredPools.map(pool => <PoolCard key={pool.id} pool={pool} />)
        }
      </div>

      {wallet && (
        <div className="home-actions">
          <Link href="/positions" className="button-secondary">View My Positions</Link>
          <Link href="/create-pool" className="button-secondary">Create New Pool</Link>
        </div>
      )}
    </div>
  )
}
