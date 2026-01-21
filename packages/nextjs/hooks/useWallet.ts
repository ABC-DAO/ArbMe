/**
 * Wallet connection hook
 * Integrates with Farcaster SDK for wallet access
 */

'use client';

import { useEffect } from 'react';
import { useAppState } from '../store/AppContext';
import sdk from '@farcaster/miniapp-sdk';

export function useWallet() {
  const { state, setState } = useAppState();

  useEffect(() => {
    async function loadWallet() {
      try {
        console.log('[useWallet] Getting Ethereum provider...');

        const provider = await sdk.wallet.getEthereumProvider();
        if (!provider) {
          console.log('[useWallet] No Ethereum provider available');
          return;
        }

        console.log('[useWallet] Provider available, requesting accounts...');

        // Try eth_accounts first (Farcaster miniapps have pre-authorized access)
        let accounts: string[] = [];
        try {
          accounts = await provider.request({
            method: 'eth_accounts'
          }) as string[];

          if (accounts && accounts.length > 0) {
            console.log('[useWallet] Connected:', accounts[0]);
            setState({ wallet: accounts[0] });
            return;
          }
        } catch (err) {
          console.log('[useWallet] eth_accounts failed:', err);
        }

        // Fallback: try eth_requestAccounts (for browser wallet connect)
        try {
          accounts = await provider.request({
            method: 'eth_requestAccounts'
          }) as string[];

          if (accounts && accounts.length > 0) {
            console.log('[useWallet] Connected via eth_requestAccounts:', accounts[0]);
            setState({ wallet: accounts[0] });
          }
        } catch (err) {
          console.log('[useWallet] eth_requestAccounts failed:', err);
        }
      } catch (error) {
        console.error('[useWallet] Error getting wallet:', error);
      }
    }

    if (!state.wallet) {
      loadWallet();
    }
  }, [state.wallet, setState]);

  return state.wallet;
}
