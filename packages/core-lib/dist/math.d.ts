/**
 * Uniswap V3/V4 Math Utilities
 * Price, tick, and liquidity calculations
 */
export declare const Q96: bigint;
export declare const Q128: bigint;
export declare const MIN_TICK = -887272;
export declare const MAX_TICK = 887272;
/**
 * Convert sqrtPriceX96 to raw price (no decimal adjustment)
 * price = (sqrtPriceX96 / 2^96)^2
 */
export declare function sqrtPriceX96ToRawPrice(sqrtPriceX96: bigint): number;
/**
 * Convert sqrtPriceX96 to price adjusted for token decimals
 * Returns price of token0 in terms of token1
 */
export declare function sqrtPriceX96ToPrice(sqrtPriceX96: bigint, decimals0: number, decimals1: number): number;
/**
 * Convert price to sqrtPriceX96
 * sqrtPriceX96 = sqrt(price) * 2^96
 */
export declare function priceToSqrtPriceX96(price: number): bigint;
/**
 * Convert price to sqrtPriceX96 with decimal adjustment
 */
export declare function priceToSqrtPriceX96WithDecimals(price: number, decimals0: number, decimals1: number): bigint;
/**
 * Convert sqrtPriceX96 to tick
 * tick = floor(log(price) / log(1.0001))
 */
export declare function sqrtPriceX96ToTick(sqrtPriceX96: bigint): number;
/**
 * Convert tick to sqrtPriceX96
 * sqrtPriceX96 = sqrt(1.0001^tick) * 2^96
 */
export declare function tickToSqrtPriceX96(tick: number): bigint;
/**
 * Get tick from price (with decimal adjustment)
 */
export declare function priceToTick(price: number, decimals0: number, decimals1: number): number;
/**
 * Get price from tick (with decimal adjustment)
 */
export declare function tickToPrice(tick: number, decimals0: number, decimals1: number): number;
/**
 * Round tick down to nearest tick spacing
 */
export declare function roundTickDown(tick: number, tickSpacing: number): number;
/**
 * Round tick up to nearest tick spacing
 */
export declare function roundTickUp(tick: number, tickSpacing: number): number;
/**
 * Get nearest valid tick (rounds to nearest)
 */
export declare function nearestUsableTick(tick: number, tickSpacing: number): number;
/**
 * Get tick spacing for a fee tier
 */
export declare function getTickSpacingForFee(fee: number): number;
/**
 * Get full range ticks for a fee tier
 */
export declare function getFullRangeTicks(fee: number): {
    tickLower: number;
    tickUpper: number;
};
/**
 * Validate fee tier
 */
export declare function isValidFeeTier(fee: number): boolean;
/**
 * Format fee tier for display
 */
export declare function formatFeeTier(fee: number): string;
/**
 * Calculate liquidity from token amounts
 * Returns the maximum liquidity that can be minted with given amounts
 */
export declare function calculateLiquidityFromAmounts(sqrtPriceX96: bigint, sqrtPriceLower: bigint, sqrtPriceUpper: bigint, amount0: bigint, amount1: bigint): bigint;
/**
 * Calculate token amounts from liquidity
 * Returns the amounts of token0 and token1 for a given liquidity
 */
export declare function calculateAmountsFromLiquidity(sqrtPriceX96: bigint, sqrtPriceLower: bigint, sqrtPriceUpper: bigint, liquidity: bigint): {
    amount0: bigint;
    amount1: bigint;
};
/**
 * Calculate the amounts with tick bounds instead of sqrtPrice bounds
 */
export declare function calculateAmountsFromLiquidityWithTicks(sqrtPriceX96: bigint, tickLower: number, tickUpper: number, liquidity: bigint): {
    amount0: bigint;
    amount1: bigint;
};
/**
 * Check if position is in range at current tick
 */
export declare function isPositionInRange(currentTick: number, tickLower: number, tickUpper: number): boolean;
/**
 * Calculate what percentage of range the current tick is at
 * Returns 0 if below range, 100 if above range
 */
export declare function getPositionRangePercentage(currentTick: number, tickLower: number, tickUpper: number): number;
/**
 * Calculate pool share percentage
 */
export declare function calculatePoolShare(positionLiquidity: bigint, totalLiquidity: bigint): number;
/**
 * Estimate position value in terms of token1
 */
export declare function estimatePositionValue(sqrtPriceX96: bigint, tickLower: number, tickUpper: number, liquidity: bigint, decimals0: number, decimals1: number): {
    amount0: number;
    amount1: number;
    totalInToken1: number;
};
/**
 * Calculate V2 output amount (constant product formula)
 * amountOut = (amountIn * reserveOut * 997) / (reserveIn * 1000 + amountIn * 997)
 */
export declare function calculateV2AmountOut(amountIn: bigint, reserveIn: bigint, reserveOut: bigint): bigint;
/**
 * Calculate V2 input amount needed for desired output
 * amountIn = (reserveIn * amountOut * 1000) / ((reserveOut - amountOut) * 997) + 1
 */
export declare function calculateV2AmountIn(amountOut: bigint, reserveIn: bigint, reserveOut: bigint): bigint;
/**
 * Calculate V2 price from reserves
 */
export declare function calculateV2Price(reserve0: bigint, reserve1: bigint, decimals0: number, decimals1: number): number;
