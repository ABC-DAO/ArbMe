/**
 * Pool card component
 * Displays pool information in a card format
 */

'use client';

import Link from 'next/link';
import { formatUsd, formatPrice, formatChange } from '../utils/format';
import { buildTradeHref } from '../utils/trade-links';
import type { Pool } from '../utils/types';

interface PoolCardProps {
  pool: Pool | null;
}

export default function PoolCard({ pool }: PoolCardProps) {
  if (!pool) {
    return (
      <div className="pool-card loading">
        <div className="spinner"></div>
        <p className="text-secondary">Loading pool...</p>
      </div>
    );
  }

  const changeClass = pool.priceChange24h >= 0 ? 'text-positive' : 'text-negative';
  const tradeHref = buildTradeHref(pool);

  return (
    <div className="pool-card">
      <div className="pool-header">
        <h3>{pool.pair}</h3>
        <span className="pool-dex text-secondary">{pool.dex}</span>
      </div>

      <div className="pool-price">
        <span className="price-value">{formatPrice(pool.priceUsd)}</span>
        <span className={`price-change ${changeClass}`}>
          {formatChange(pool.priceChange24h)}
        </span>
      </div>

      <div className="pool-stats">
        <div className="stat">
          <span className="stat-label text-secondary">TVL</span>
          <span className="stat-value">{formatUsd(pool.tvl)}</span>
        </div>
        <div className="stat">
          <span className="stat-label text-secondary">24h Volume</span>
          <span className="stat-value">{formatUsd(pool.volume24h)}</span>
        </div>
      </div>

      {tradeHref ? (
        <Link href={tradeHref} className="pool-link">
          Trade →
        </Link>
      ) : (
        <a href={pool.url} target="_blank" rel="noopener noreferrer" className="pool-link">
          Chart →
        </a>
      )}
    </div>
  );
}
