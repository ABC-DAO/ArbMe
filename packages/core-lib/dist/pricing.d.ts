/**
 * Token Pricing Service
 *
 * Primary: GeckoTerminal API (good coverage, fast)
 * Fallback: On-chain pool reserves (for unlisted tokens)
 */
/**
 * Get price for a single token
 */
export declare function getTokenPrice(tokenAddress: string, alchemyKey?: string): Promise<number>;
/**
 * Get prices for multiple tokens (batched, cached)
 */
export declare function getTokenPrices(tokenAddresses: string[], alchemyKey?: string): Promise<Map<string, number>>;
/**
 * Get WETH price in USD
 */
export declare function getWethPrice(): Promise<number>;
/**
 * Clear the price cache (useful for testing)
 */
export declare function clearPriceCache(): void;
/**
 * Get cache stats (useful for debugging)
 */
export declare function getPriceCacheStats(): {
    size: number;
    entries: Array<{
        address: string;
        price: number;
        age: number;
        source: string;
    }>;
};
/**
 * Legacy function - accepts array of {address, decimals} objects
 * Now just extracts addresses and calls getTokenPrices
 */
export declare function getTokenPricesOnChain(tokens: Array<{
    address: string;
    decimals: number;
}>, alchemyKey?: string): Promise<Map<string, number>>;
export declare function getTokenPriceOnChain(tokenAddress: string, _decimals: number, _wethPrice: number, alchemyKey?: string): Promise<number>;
