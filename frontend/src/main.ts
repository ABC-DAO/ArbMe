/**
 * ArbMe Miniapp - Main Entry Point
 */

import { sdk } from '@farcaster/miniapp-sdk';
import { route, initRouter, rerender } from './router';
import { store } from './store';
import { getWalletAddress } from './services/wallet';
import { setupActionListeners } from './services/actions';
import { HomePage } from './pages/Home';
import { MyPoolsPage } from './pages/MyPools';
import { PositionDetailPage } from './pages/PositionDetail';
import { CreatePoolPage } from './pages/CreatePool';
import { ROUTES } from './utils/constants';
import './styles/global.css';
import './styles/components.css';

/**
 * Initialize the application
 */
async function init(): Promise<void> {
  console.log('[ArbMe] Initializing miniapp...');

  try {
    // CRITICAL: Signal ready immediately to Farcaster
    await sdk.actions.ready();
    console.log('[ArbMe] SDK ready signal sent');

    // Get wallet address from Farcaster context
    const wallet = await getWalletAddress();
    if (wallet) {
      console.log('[ArbMe] Wallet connected:', wallet);
      store.setState({ wallet });
    } else {
      console.log('[ArbMe] No wallet found');
    }

    // Register routes
    route(ROUTES.HOME, HomePage);
    route(ROUTES.MY_POOLS, MyPoolsPage);
    route(ROUTES.CREATE_POOL, CreatePoolPage);
    route(`${ROUTES.POSITION_DETAIL}/:id`, PositionDetailPage);

    // Subscribe to store changes to trigger re-renders
    store.subscribe(() => {
      rerender();
    });

    // Initialize router and render
    initRouter();

    // Setup action button listeners (Buy, Tip, etc.)
    setupActionListeners();

    console.log('[ArbMe] Initialization complete');
  } catch (error) {
    console.error('[ArbMe] Initialization error:', error);
    const app = document.getElementById('app');
    if (app) {
      app.innerHTML = `
        <div class="error-page">
          <h1>Error</h1>
          <p>Failed to initialize app. Please reload.</p>
        </div>
      `;
    }
  }
}

// Start the app
init();
