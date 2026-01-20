/**
 * Farcaster wallet integration
 */

import { sdk } from '@farcaster/miniapp-sdk';

/**
 * Get wallet address from Farcaster context
 * @returns Wallet address or null if not available
 */
export async function getWalletAddress(): Promise<string | null> {
  try {
    const context = await sdk.context;

    if (!context?.user) {
      console.log('[Wallet] No user in context');
      return null;
    }

    // SDK types are incomplete, so we use any here
    const user = context.user as any;

    // Try verified addresses first
    if (user.verifiedAddresses?.ethAddresses?.length > 0) {
      return user.verifiedAddresses.ethAddresses[0];
    }

    // Fall back to custody address
    if (user.custodyAddress) {
      return user.custodyAddress;
    }

    console.log('[Wallet] No wallet address found');
    return null;
  } catch (error) {
    console.error('[Wallet] Error getting wallet:', error);
    return null;
  }
}
