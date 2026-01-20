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
 * Setup event listeners for action buttons
 */
export function setupActionListeners(): void {
  // Buy ARBME button
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
  });
}
