/**
 * Create Pool Page - Create new Uniswap V2/V3/V4 pools
 */

import { store } from '../store';
import { ROUTES, ARBME_ADDRESS } from '../utils/constants';
import { AppHeader } from '../components/AppHeader';
import { rerender } from '../router';

// Pool creation state
interface CreatePoolState {
  tokenA: {
    address: string;
    symbol: string;
    decimals: number;
    priceUsd?: number;
  } | null;
  tokenB: {
    address: string;
    symbol: string;
    decimals: number;
    priceUsd?: number;
  } | null;
  version: 'v2' | 'v3' | 'v4';
  feeTier: number; // in hundredths of bps (e.g., 3000 = 0.3%)
  amountA: string;
  amountB: string;
  isCreating: boolean;
}

const createState: CreatePoolState = {
  tokenA: null,
  tokenB: {
    address: ARBME_ADDRESS,
    symbol: 'ARBME',
    decimals: 18,
  },
  version: 'v4',
  feeTier: 3000, // 0.3% default
  amountA: '',
  amountB: '',
  isCreating: false,
};

// Common tokens on Base
const COMMON_TOKENS = [
  { address: ARBME_ADDRESS, symbol: 'ARBME', decimals: 18 },
  { address: '0x4200000000000000000000000000000000000006', symbol: 'WETH', decimals: 18 },
  { address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', symbol: 'USDC', decimals: 6 },
  { address: '0x1bc0c42215582d5a085795f4badbac3ff36d1bcb', symbol: 'CLANKER', decimals: 18 },
  { address: '0x60a3e35cc302bfa44cb288bc5a4f316fdb1adb42', symbol: 'PAGE', decimals: 18 },
  { address: '0x4ed4e862860bed51a9570b96d89af5e1b0efefed', symbol: 'DEGEN', decimals: 18 },
];

// Fee tiers with descriptions
const FEE_TIERS = [
  { value: 100, label: '0.01%', desc: 'Stablecoins' },
  { value: 500, label: '0.05%', desc: 'Correlated' },
  { value: 3000, label: '0.30%', desc: 'Standard' },
  { value: 10000, label: '1.00%', desc: 'Exotic' },
];

/**
 * Render token selector
 */
function TokenSelector(position: 'A' | 'B'): string {
  const token = position === 'A' ? createState.tokenA : createState.tokenB;

  return `
    <div class="token-selector-group">
      <div class="token-selector-label">Token ${position}</div>
      <select id="token-${position}-select" class="token-select">
        <option value="">Select token...</option>
        ${COMMON_TOKENS.map(t => `
          <option value="${t.address}" ${token?.address === t.address ? 'selected' : ''}>
            ${t.symbol}
          </option>
        `).join('')}
        <option value="custom">Custom Address...</option>
      </select>

      <input
        type="text"
        id="token-${position}-custom"
        class="token-custom-input"
        placeholder="0x..."
        style="display: none;"
      />

      ${token ? `
        <div class="token-selected-info">
          <span class="token-symbol">${token.symbol}</span>
          <span class="token-address">${token.address.slice(0, 6)}...${token.address.slice(-4)}</span>
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Render version selector
 */
function VersionSelector(): string {
  return `
    <div class="selector-group">
      <div class="selector-label">Pool Version</div>
      <div class="version-selector">
        <button
          class="version-btn ${createState.version === 'v2' ? 'selected' : ''}"
          data-version="v2"
        >
          <span class="version-badge v2">V2</span>
          <span class="version-desc">Simple AMM</span>
        </button>
        <button
          class="version-btn ${createState.version === 'v3' ? 'selected' : ''}"
          data-version="v3"
        >
          <span class="version-badge v3">V3</span>
          <span class="version-desc">Concentrated</span>
        </button>
        <button
          class="version-btn ${createState.version === 'v4' ? 'selected' : ''}"
          data-version="v4"
        >
          <span class="version-badge v4">V4</span>
          <span class="version-desc">Hooks</span>
        </button>
      </div>
    </div>
  `;
}

/**
 * Render fee tier selector (for V3/V4 only)
 */
function FeeTierSelector(): string {
  if (createState.version === 'v2') {
    return '';
  }

  return `
    <div class="selector-group">
      <div class="selector-label">Fee Tier</div>
      <div class="fee-tier-selector">
        ${FEE_TIERS.map(tier => `
          <button
            class="fee-tier-btn ${createState.feeTier === tier.value ? 'selected' : ''}"
            data-fee="${tier.value}"
          >
            <span class="fee-label">${tier.label}</span>
            <span class="fee-desc">${tier.desc}</span>
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

/**
 * Render amount inputs
 */
function AmountInputs(): string {
  const { tokenA, tokenB } = createState;

  if (!tokenA || !tokenB) {
    return '<div class="info-message">Select both tokens to continue</div>';
  }

  return `
    <div class="amount-inputs">
      <div class="input-group">
        <div class="input-label">
          <span>${tokenA.symbol} Amount</span>
          <span class="input-balance">Balance: --</span>
        </div>
        <div class="input-wrapper">
          <input
            type="number"
            id="amount-a-input"
            class="amount-input"
            placeholder="0.0"
            step="any"
            value="${createState.amountA}"
          />
          <span class="input-token-label">${tokenA.symbol}</span>
        </div>
      </div>

      <div class="input-group">
        <div class="input-label">
          <span>${tokenB.symbol} Amount</span>
          <span class="input-balance">Balance: --</span>
        </div>
        <div class="input-wrapper">
          <input
            type="number"
            id="amount-b-input"
            class="amount-input"
            placeholder="0.0"
            step="any"
            value="${createState.amountB}"
          />
          <span class="input-token-label">${tokenB.symbol}</span>
        </div>
      </div>

      ${createState.amountA && createState.amountB ? `
        <div class="initial-price-display">
          <span class="price-label">Initial Price:</span>
          <span class="price-value">
            1 ${tokenA.symbol} = ${(parseFloat(createState.amountB) / parseFloat(createState.amountA)).toFixed(6)} ${tokenB.symbol}
          </span>
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Setup event listeners for create pool page
 */
function setupCreatePoolListeners(): void {
  // Token A selector
  const tokenASelect = document.getElementById('token-A-select') as HTMLSelectElement;
  const tokenACustom = document.getElementById('token-A-custom') as HTMLInputElement;

  if (tokenASelect) {
    tokenASelect.addEventListener('change', (e) => {
      const value = (e.target as HTMLSelectElement).value;

      if (value === 'custom') {
        if (tokenACustom) tokenACustom.style.display = 'block';
      } else if (value === '') {
        createState.tokenA = null;
        if (tokenACustom) tokenACustom.style.display = 'none';
        rerender();
      } else {
        const token = COMMON_TOKENS.find(t => t.address === value);
        if (token) {
          createState.tokenA = { ...token };
          if (tokenACustom) tokenACustom.style.display = 'none';
          rerender();
        }
      }
    });
  }

  if (tokenACustom) {
    tokenACustom.addEventListener('blur', async () => {
      const address = tokenACustom.value.trim();
      if (address && address.startsWith('0x')) {
        // TODO: Fetch token metadata from blockchain
        createState.tokenA = {
          address,
          symbol: 'CUSTOM',
          decimals: 18,
        };
        rerender();
      }
    });
  }

  // Token B selector
  const tokenBSelect = document.getElementById('token-B-select') as HTMLSelectElement;
  const tokenBCustom = document.getElementById('token-B-custom') as HTMLInputElement;

  if (tokenBSelect) {
    tokenBSelect.addEventListener('change', (e) => {
      const value = (e.target as HTMLSelectElement).value;

      if (value === 'custom') {
        if (tokenBCustom) tokenBCustom.style.display = 'block';
      } else if (value === '') {
        createState.tokenB = null;
        if (tokenBCustom) tokenBCustom.style.display = 'none';
        rerender();
      } else {
        const token = COMMON_TOKENS.find(t => t.address === value);
        if (token) {
          createState.tokenB = { ...token };
          if (tokenBCustom) tokenBCustom.style.display = 'none';
          rerender();
        }
      }
    });
  }

  if (tokenBCustom) {
    tokenBCustom.addEventListener('blur', async () => {
      const address = tokenBCustom.value.trim();
      if (address && address.startsWith('0x')) {
        // TODO: Fetch token metadata from blockchain
        createState.tokenB = {
          address,
          symbol: 'CUSTOM',
          decimals: 18,
        };
        rerender();
      }
    });
  }

  // Version selector
  const versionBtns = document.querySelectorAll('.version-btn');
  versionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const version = btn.getAttribute('data-version') as 'v2' | 'v3' | 'v4';
      if (version) {
        createState.version = version;
        // Reset fee tier to default when changing version
        if (version === 'v2') {
          createState.feeTier = 3000; // V2 doesn't use fee tier, but keep default
        }
        rerender();
      }
    });
  });

  // Fee tier selector
  const feeTierBtns = document.querySelectorAll('.fee-tier-btn');
  feeTierBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const fee = btn.getAttribute('data-fee');
      if (fee) {
        createState.feeTier = parseInt(fee);
        rerender();
      }
    });
  });

  // Amount inputs with auto-balancing
  const amountAInput = document.getElementById('amount-a-input') as HTMLInputElement;
  const amountBInput = document.getElementById('amount-b-input') as HTMLInputElement;

  if (amountAInput) {
    amountAInput.addEventListener('input', (e) => {
      const value = (e.target as HTMLInputElement).value;
      createState.amountA = value;
      rerender();
    });
  }

  if (amountBInput) {
    amountBInput.addEventListener('input', (e) => {
      const value = (e.target as HTMLInputElement).value;
      createState.amountB = value;
      rerender();
    });
  }

  // Create pool button
  const createBtn = document.getElementById('create-pool-btn');
  if (createBtn) {
    createBtn.addEventListener('click', async () => {
      await handleCreatePool();
    });
  }
}

/**
 * Handle pool creation
 */
async function handleCreatePool(): Promise<void> {
  const { wallet } = store.getState();

  if (!wallet || !createState.tokenA || !createState.tokenB) {
    store.setState({ error: 'Missing required information' });
    return;
  }

  createState.isCreating = true;
  store.setState({ error: null });
  rerender();

  try {
    // TODO: Implement pool creation transaction
    console.log('[CreatePool] Creating pool:', {
      tokenA: createState.tokenA,
      tokenB: createState.tokenB,
      version: createState.version,
      feeTier: createState.feeTier,
      amountA: createState.amountA,
      amountB: createState.amountB,
    });

    // Placeholder for now
    store.setState({ error: 'Pool creation not yet implemented' });
  } catch (error) {
    console.error('[CreatePool] Failed to create pool:', error);
    store.setState({ error: 'Failed to create pool. Please try again.' });
  } finally {
    createState.isCreating = false;
    rerender();
  }
}

/**
 * Render Create Pool page
 */
export function CreatePoolPage(_params: Record<string, string>): string {
  const { wallet, error } = store.getState();

  // Setup listeners after render
  setTimeout(() => setupCreatePoolListeners(), 0);

  if (!wallet) {
    return `
      <div class="create-pool-page">
        ${AppHeader()}
        <div class="page-subheader">
          <a href="#${ROUTES.HOME}" class="back-button">← Back</a>
          <h2>Create New Pool</h2>
        </div>
        <div class="empty-state">
          <p class="text-secondary">Wallet not connected</p>
          <p class="text-muted">Connect your Farcaster wallet to create pools</p>
        </div>
      </div>
    `;
  }

  const canCreate = createState.tokenA && createState.tokenB &&
                     createState.amountA && createState.amountB &&
                     parseFloat(createState.amountA) > 0 &&
                     parseFloat(createState.amountB) > 0;

  return `
    <div class="create-pool-page">
      ${AppHeader()}

      <div class="page-subheader">
        <a href="#${ROUTES.HOME}" class="back-button">← Back</a>
        <h2>Create New Pool</h2>
      </div>

      ${error ? `<div class="error-banner">${error}</div>` : ''}

      <div class="create-pool-card">
        <div class="create-section">
          <h3 class="section-title">Select Tokens</h3>
          ${TokenSelector('A')}
          ${TokenSelector('B')}
        </div>

        <div class="create-section">
          ${VersionSelector()}
        </div>

        <div class="create-section">
          ${FeeTierSelector()}
        </div>

        <div class="create-section">
          <h3 class="section-title">Initial Liquidity</h3>
          ${AmountInputs()}
        </div>

        <div class="create-actions">
          <button
            id="create-pool-btn"
            class="button-primary"
            ${!canCreate || createState.isCreating ? 'disabled' : ''}
          >
            ${createState.isCreating ? 'Creating Pool...' : 'Create Pool & Add Liquidity'}
          </button>
        </div>

        <div class="create-info">
          <p class="text-secondary">
            Creating a new pool will initialize it with your chosen ratio and add your initial liquidity.
          </p>
        </div>
      </div>
    </div>
  `;
}
