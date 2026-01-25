/**
 * Token metadata service
 *
 * For pricing, use ./pricing.ts instead
 */
export interface TokenMetadata {
    symbol: string;
    decimals: number;
    address: string;
}
export declare const KNOWN_TOKENS: Record<string, TokenMetadata>;
/**
 * Fetch token metadata (symbol, decimals) from chain or cache
 */
export declare function getTokenMetadata(tokenAddress: string, alchemyKey?: string): Promise<TokenMetadata>;
/**
 * Format token amount with proper decimals
 */
export declare function formatTokenAmount(amount: bigint, decimals: number): string;
/**
 * Calculate USD value from token amount
 */
export declare function calculateUsdValue(amount: bigint, decimals: number, priceUsd: number): number;
/**
 * Clear the token metadata cache
 */
export declare function clearTokenCache(): void;
