/**
 * Token metadata service
 *
 * For pricing, use ./pricing.ts instead
 */

import { createPublicClient, http, Address, formatUnits } from 'viem';
import { base } from 'viem/chains';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface TokenMetadata {
  symbol: string;
  decimals: number;
  address: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Token Registry
// ═══════════════════════════════════════════════════════════════════════════════

// Token metadata cache
const tokenCache = new Map<string, TokenMetadata>();

// Known token addresses on Base (lowercase keys)
export const KNOWN_TOKENS: Record<string, TokenMetadata> = {
  '0xc647421c5dc78d1c3960faa7a33f9aefdf4b7b07': {
    symbol: 'ARBME',
    decimals: 18,
    address: '0xC647421C5Dc78D1c3960faA7A33f9aEFDF4B7B07',
  },
  '0x4200000000000000000000000000000000000006': {
    symbol: 'WETH',
    decimals: 18,
    address: '0x4200000000000000000000000000000000000006',
  },
  '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': {
    symbol: 'USDC',
    decimals: 6,
    address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
  },
  '0x1bc0c42215582d5a085795f4badbac3ff36d1bcb': {
    symbol: 'CLANKER',
    decimals: 18,
    address: '0x1bc0c42215582d5a085795f4badbac3ff36d1bcb',
  },
  '0xc4730f86d1f86ce0712a7b17ee919db7defad7fe': {
    symbol: 'PAGE',
    decimals: 18,
    address: '0xc4730f86d1F86cE0712a7b17EE919Db7dEFad7FE',
  },
  '0x4ed4e862860bed51a9570b96d89af5e1b0efefed': {
    symbol: 'DEGEN',
    decimals: 18,
    address: '0x4ed4e862860bed51a9570b96d89af5e1b0efefed',
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// ABI
// ═══════════════════════════════════════════════════════════════════════════════

const ERC20_ABI = [
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
] as const;

// ═══════════════════════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch token metadata (symbol, decimals) from chain or cache
 */
export async function getTokenMetadata(
  tokenAddress: string,
  alchemyKey?: string
): Promise<TokenMetadata> {
  const normalizedAddress = tokenAddress.toLowerCase();

  // Check known tokens first
  if (KNOWN_TOKENS[normalizedAddress]) {
    return KNOWN_TOKENS[normalizedAddress];
  }

  // Check cache
  if (tokenCache.has(normalizedAddress)) {
    return tokenCache.get(normalizedAddress)!;
  }

  // Fetch from chain
  const rpcUrl = alchemyKey
    ? `https://base-mainnet.g.alchemy.com/v2/${alchemyKey}`
    : 'https://mainnet.base.org';

  const client = createPublicClient({
    chain: base,
    transport: http(rpcUrl),
  });

  try {
    const [symbol, decimals] = await Promise.all([
      client.readContract({
        address: tokenAddress as Address,
        abi: ERC20_ABI,
        functionName: 'symbol',
      }),
      client.readContract({
        address: tokenAddress as Address,
        abi: ERC20_ABI,
        functionName: 'decimals',
      }),
    ]);

    const metadata: TokenMetadata = {
      symbol: symbol as string,
      decimals: Number(decimals),
      address: tokenAddress,
    };

    // Cache it
    tokenCache.set(normalizedAddress, metadata);

    return metadata;
  } catch (error) {
    console.error(`[Tokens] Failed to fetch metadata for ${tokenAddress}:`, error);
    // Return fallback
    return {
      symbol: 'UNKNOWN',
      decimals: 18,
      address: tokenAddress,
    };
  }
}

/**
 * Format token amount with proper decimals
 */
export function formatTokenAmount(amount: bigint, decimals: number): string {
  return formatUnits(amount, decimals);
}

/**
 * Calculate USD value from token amount
 */
export function calculateUsdValue(amount: bigint, decimals: number, priceUsd: number): number {
  const tokenAmount = parseFloat(formatUnits(amount, decimals));
  return tokenAmount * priceUsd;
}

/**
 * Clear the token metadata cache
 */
export function clearTokenCache(): void {
  tokenCache.clear();
}
