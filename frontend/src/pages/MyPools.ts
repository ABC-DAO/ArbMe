/**
 * My Pools Page - User's LP positions
 */

import { store } from '../store';
import { fetchPositions } from '../services/api';
import { formatUsd, truncateAddress } from '../utils/format';
import { ROUTES } from '../utils/constants';
import type { Position } from '../utils/types';
import { AppHeader } from '../components/AppHeader';

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
function PositionCard(position: Position, index: number): string {
  const inRangeBadge = position.inRange !== undefined
    ? position.inRange
      ? '<span class="badge badge-success">In Range</span>'
      : '<span class="badge badge-warning">Out of Range</span>'
    : '';

  return `
    <div class="position-card-container">
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
            <span class="stat-label text-secondary">Uncollected Fees</span>
            <span class="stat-value text-positive">${formatUsd(position.feesEarnedUsd)}</span>
          </div>
        </div>

        ${inRangeBadge}

        <div class="position-arrow">→</div>
      </a>
      <button
        class="collect-fees-btn"
        data-position-id="${position.id}"
        data-position-index="${index}"
        ${position.feesEarnedUsd === 0 ? 'disabled' : ''}
      >
        Collect Fees
      </button>
    </div>
  `;
}

// Pagination state
const POSITIONS_PER_PAGE = 10;
let currentPage = 1;

// Setup pagination event listener
if (typeof window !== 'undefined') {
  window.addEventListener('changePage', ((e: CustomEvent) => {
    const direction = e.detail?.direction;
    if (direction === 'prev' && currentPage > 1) {
      currentPage--;
      store.setState({}); // Trigger rerender
    } else if (direction === 'next') {
      const { positions } = store.getState();
      const totalPages = Math.ceil(positions.length / POSITIONS_PER_PAGE);
      if (currentPage < totalPages) {
        currentPage++;
        store.setState({}); // Trigger rerender
      }
    }
  }) as EventListener);
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

  // Calculate pagination
  const totalPages = Math.ceil(positions.length / POSITIONS_PER_PAGE);
  const startIndex = (currentPage - 1) * POSITIONS_PER_PAGE;
  const endIndex = startIndex + POSITIONS_PER_PAGE;
  const paginatedPositions = positions.slice(startIndex, endIndex);

  if (!wallet) {
    return `
      <div class="my-pools-page">
        ${AppHeader()}

        <div class="page-subheader">
          <a href="#${ROUTES.HOME}" class="back-button">← Back</a>
          <h2>My Positions</h2>
        </div>

        <div class="empty-state">
          <p class="text-secondary">Wallet not connected</p>
          <p class="text-muted">Connect your Farcaster wallet to view positions</p>
        </div>
      </div>
    `;
  }

  return `
    <div class="my-pools-page">
      ${AppHeader()}

      <div class="page-subheader">
        <a href="#${ROUTES.HOME}" class="back-button">← Back</a>
        <h2>My Positions</h2>
      </div>

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
        <div class="positions-header">
          <p class="text-secondary">${positions.length} position${positions.length !== 1 ? 's' : ''} found</p>
        </div>
        <div class="positions-list">
          ${paginatedPositions.map((pos, idx) => PositionCard(pos, startIndex + idx)).join('')}
        </div>
        ${totalPages > 1 ? `
          <div class="pagination">
            <button
              id="prev-page-btn"
              class="pagination-btn"
              ${currentPage === 1 ? 'disabled' : ''}
            >← Previous</button>
            <span class="pagination-info">Page ${currentPage} of ${totalPages}</span>
            <button
              id="next-page-btn"
              class="pagination-btn"
              ${currentPage === totalPages ? 'disabled' : ''}
            >Next →</button>
          </div>
        ` : ''}
      ` : ''}
    </div>
  `;
}
