/**
 * Farcaster action handlers (Buy, Tip, etc.)
 */

import { sdk } from '@farcaster/miniapp-sdk';
import { ARBME_ADDRESS } from '../utils/constants';

// Tip jar wallet address
const TIP_JAR_ADDRESS = '0x2C421b1c21bB88F1418cC525934E62F2c48C19df';

/**
 * Launch Farcaster's swap widget to buy $ARBME
 */
export async function buyArbme(): Promise<void> {
  try {
    console.log('[Actions] Opening buy widget for ARBME...');

    // CAIP-19 format: eip155:<chainId>/erc20:<tokenAddress>
    // Base = chain 8453
    const arbmeToken = `eip155:8453/erc20:${ARBME_ADDRESS}`;

    const result = await sdk.actions.swapToken({
      buyToken: arbmeToken,
    });

    if (result.success) {
      console.log('[Actions] Swap completed:', result.swap.transactions);
      // Optionally show success message to user
    } else {
      console.log('[Actions] Swap cancelled or failed:', result.reason);
    }
  } catch (error) {
    console.error('[Actions] Error opening buy widget:', error);
  }
}

/**
 * Send tip in $ARBME to the tip jar
 */
export async function sendTip(amountArbme: string = '1'): Promise<void> {
  try {
    console.log(`[Actions] Sending ${amountArbme} ARBME tip...`);

    // CAIP-19 format for ARBME on Base
    const arbmeToken = `eip155:8453/erc20:${ARBME_ADDRESS}`;

    // Convert to wei (18 decimals)
    const amountWei = (parseFloat(amountArbme) * 1e18).toString();

    const result = await sdk.actions.sendToken({
      token: arbmeToken,
      amount: amountWei,
      recipientAddress: TIP_JAR_ADDRESS,
    });

    if (result.success) {
      console.log('[Actions] Tip sent:', result.send.transaction);
      // Optionally show success message
    } else {
      console.log('[Actions] Tip cancelled or failed:', result.reason);
    }
  } catch (error) {
    console.error('[Actions] Error sending tip:', error);
  }
}

/**
 * Collect fees from a Uniswap position
 */
export async function collectFees(positionId: string): Promise<void> {
  try {
    console.log(`[Actions] Collecting fees for position ${positionId}...`);

    // TODO: Implement V4 fee collection using Farcaster SDK
    // For now, show a message
    alert('Fee collection coming soon! V4 position fees will be collectable via Farcaster SDK.');

    // V4 fee collection will likely use sdk.actions.signTransaction() with
    // the PositionManager's decrease/collect functions
  } catch (error) {
    console.error('[Actions] Error collecting fees:', error);
  }
}

/**
 * Setup event listeners for action buttons
 */
export function setupActionListeners(): void {
  // Buy ARBME button, Tip Jar, Pagination, Collect Fees
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;

    if (target.id === 'buy-arbme-btn' || target.closest('#buy-arbme-btn')) {
      e.preventDefault();
      buyArbme();
    }

    if (target.id === 'tip-jar-btn' || target.closest('#tip-jar-btn')) {
      e.preventDefault();
      sendTip('1'); // Default 1 ARBME tip
    }

    // Pagination buttons
    if (target.id === 'prev-page-btn' || target.closest('#prev-page-btn')) {
      e.preventDefault();
      const event = new CustomEvent('changePage', { detail: { direction: 'prev' } });
      window.dispatchEvent(event);
    }

    if (target.id === 'next-page-btn' || target.closest('#next-page-btn')) {
      e.preventDefault();
      const event = new CustomEvent('changePage', { detail: { direction: 'next' } });
      window.dispatchEvent(event);
    }

    // Collect fees button
    if (target.classList.contains('collect-fees-btn')) {
      e.preventDefault();
      const positionId = target.getAttribute('data-position-id');
      if (positionId) {
        collectFees(positionId);
      }
    }
  });
}
