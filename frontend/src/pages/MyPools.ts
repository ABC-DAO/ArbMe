/**
 * My Pools Page - User's LP positions
 */

import { store } from '../store';
import { fetchPositions } from '../services/api';
import { formatUsd, truncateAddress } from '../utils/format';
import { ROUTES } from '../utils/constants';
import type { Position } from '../utils/types';

/**
 * Load user positions
 */
async function loadPositions(): Promise<void> {
  const { wallet } = store.getState();

  console.log('[MyPools] loadPositions called, wallet:', wallet);

  if (!wallet) {
    console.log('[MyPools] No wallet connected');
    store.setState({ error: 'Wallet not connected' });
    return;
  }

  console.log('[MyPools] Fetching positions for wallet:', wallet);
  store.setState({ loading: true, error: null });

  try {
    const positions = await fetchPositions(wallet);
    console.log('[MyPools] Received positions:', positions);
    store.setState({ positions, loading: false });
  } catch (error) {
    console.error('[MyPools] Failed to load positions:', error);
    store.setState({
      error: 'Failed to load positions. Please try again.',
      loading: false,
    });
  }
}

/**
 * Render a position card
 */
function PositionCard(position: Position): string {
  const inRangeBadge = position.inRange !== undefined
    ? position.inRange
      ? '<span class="badge badge-success">In Range</span>'
      : '<span class="badge badge-warning">Out of Range</span>'
    : '';

  return `
    <a href="#${ROUTES.POSITION_DETAIL}/${position.id}" class="position-card">
      <div class="position-header">
        <h3>${position.pair}</h3>
        <span class="position-version text-secondary">${position.version}</span>
      </div>

      <div class="position-stats">
        <div class="stat">
          <span class="stat-label text-secondary">Liquidity</span>
          <span class="stat-value">${formatUsd(position.liquidityUsd)}</span>
        </div>
        <div class="stat">
          <span class="stat-label text-secondary">Fees Earned</span>
          <span class="stat-value text-positive">${formatUsd(position.feesEarnedUsd)}</span>
        </div>
      </div>

      ${inRangeBadge}

      <div class="position-arrow">→</div>
    </a>
  `;
}

/**
 * Render My Pools page
 */
export function MyPoolsPage(_params: Record<string, string>): string {
  const { wallet, positions, loading, error } = store.getState();

  console.log('[MyPools] Rendering page, wallet:', wallet, 'positions:', positions.length, 'loading:', loading);

  // Trigger data load
  if (wallet && !loading && positions.length === 0) {
    console.log('[MyPools] Triggering loadPositions...');
    loadPositions();
  }

  if (!wallet) {
    return `
      <div class="my-pools-page">
        <header class="page-header">
          <a href="#${ROUTES.HOME}" class="back-button">← Back</a>
          <h1>My Positions</h1>
        </header>

        <div class="empty-state">
          <p class="text-secondary">Wallet not connected</p>
          <p class="text-muted">Connect your Farcaster wallet to view positions</p>
        </div>
      </div>
    `;
  }

  return `
    <div class="my-pools-page">
      <header class="page-header">
        <a href="#${ROUTES.HOME}" class="back-button">← Back</a>
        <h1>My Positions</h1>
      </header>

      <div class="wallet-info">
        <span class="text-secondary">Connected:</span>
        <code>${truncateAddress(wallet)}</code>
      </div>

      ${error ? `<div class="error-banner">${error}</div>` : ''}

      ${loading ? `
        <div class="loading-state">
          <div class="spinner"></div>
          <p class="text-secondary">Loading positions...</p>
        </div>
      ` : ''}

      ${!loading && positions.length === 0 ? `
        <div class="empty-state">
          <p class="text-secondary">No positions found</p>
          <p class="text-muted">Add liquidity to get started</p>
          <a href="#${ROUTES.HOME}" class="button-secondary">Explore Pools</a>
        </div>
      ` : ''}

      ${!loading && positions.length > 0 ? `
        <div class="positions-list">
          ${positions.map(PositionCard).join('')}
        </div>
      ` : ''}
    </div>
  `;
}
