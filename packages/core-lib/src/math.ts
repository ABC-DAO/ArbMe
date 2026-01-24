/**
 * Uniswap V3/V4 Math Utilities
 * Price, tick, and liquidity calculations
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

export const Q96 = BigInt(2) ** BigInt(96);
export const Q128 = BigInt(2) ** BigInt(128);
const PRICE_SCALE = BigInt(10) ** BigInt(18);

// Tick bounds
export const MIN_TICK = -887272;
export const MAX_TICK = 887272;

// ═══════════════════════════════════════════════════════════════════════════════
// SQRT PRICE X96 UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Convert sqrtPriceX96 to raw price (no decimal adjustment)
 * price = (sqrtPriceX96 / 2^96)^2
 */
export function sqrtPriceX96ToRawPrice(sqrtPriceX96: bigint): number {
  if (sqrtPriceX96 === BigInt(0)) return 0;
  const priceScaled = (sqrtPriceX96 * sqrtPriceX96 * PRICE_SCALE) / (Q96 * Q96);
  return Number(priceScaled) / 1e18;
}

/**
 * Convert sqrtPriceX96 to price adjusted for token decimals
 * Returns price of token0 in terms of token1
 */
export function sqrtPriceX96ToPrice(
  sqrtPriceX96: bigint,
  decimals0: number,
  decimals1: number
): number {
  const rawPrice = sqrtPriceX96ToRawPrice(sqrtPriceX96);
  const decimalAdjustment = Math.pow(10, decimals0 - decimals1);
  return rawPrice * decimalAdjustment;
}

/**
 * Convert price to sqrtPriceX96
 * sqrtPriceX96 = sqrt(price) * 2^96
 */
export function priceToSqrtPriceX96(price: number): bigint {
  if (price <= 0) return BigInt(0);
  const sqrtPrice = Math.sqrt(price);
  return BigInt(Math.floor(sqrtPrice * Number(Q96)));
}

/**
 * Convert price to sqrtPriceX96 with decimal adjustment
 */
export function priceToSqrtPriceX96WithDecimals(
  price: number,
  decimals0: number,
  decimals1: number
): bigint {
  const adjustedPrice = price / Math.pow(10, decimals0 - decimals1);
  return priceToSqrtPriceX96(adjustedPrice);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TICK UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Convert sqrtPriceX96 to tick
 * tick = floor(log(price) / log(1.0001))
 */
export function sqrtPriceX96ToTick(sqrtPriceX96: bigint): number {
  if (sqrtPriceX96 <= BigInt(0)) return 0;
  const sqrtPriceFloat = Number(sqrtPriceX96) / Number(Q96);
  const price = sqrtPriceFloat * sqrtPriceFloat;
  return Math.floor(Math.log(price) / Math.log(1.0001));
}

/**
 * Convert tick to sqrtPriceX96
 * sqrtPriceX96 = sqrt(1.0001^tick) * 2^96
 */
export function tickToSqrtPriceX96(tick: number): bigint {
  const sqrtRatio = Math.sqrt(Math.pow(1.0001, tick));
  return BigInt(Math.floor(sqrtRatio * Number(Q96)));
}

/**
 * Get tick from price (with decimal adjustment)
 */
export function priceToTick(price: number, decimals0: number, decimals1: number): number {
  const adjustedPrice = price / Math.pow(10, decimals0 - decimals1);
  return Math.floor(Math.log(adjustedPrice) / Math.log(1.0001));
}

/**
 * Get price from tick (with decimal adjustment)
 */
export function tickToPrice(tick: number, decimals0: number, decimals1: number): number {
  const rawPrice = Math.pow(1.0001, tick);
  return rawPrice * Math.pow(10, decimals0 - decimals1);
}

/**
 * Round tick down to nearest tick spacing
 */
export function roundTickDown(tick: number, tickSpacing: number): number {
  return Math.floor(tick / tickSpacing) * tickSpacing;
}

/**
 * Round tick up to nearest tick spacing
 */
export function roundTickUp(tick: number, tickSpacing: number): number {
  return Math.ceil(tick / tickSpacing) * tickSpacing;
}

/**
 * Get nearest valid tick (rounds to nearest)
 */
export function nearestUsableTick(tick: number, tickSpacing: number): number {
  const rounded = Math.round(tick / tickSpacing) * tickSpacing;
  return Math.max(MIN_TICK, Math.min(MAX_TICK, rounded));
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEE TIER / TICK SPACING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get tick spacing for a fee tier
 */
export function getTickSpacingForFee(fee: number): number {
  switch (fee) {
    case 100: return 1;
    case 500: return 10;
    case 3000: return 60;
    case 10000: return 200;
    default: return 60; // Default to 0.3% fee tier spacing
  }
}

/**
 * Get full range ticks for a fee tier
 */
export function getFullRangeTicks(fee: number): { tickLower: number; tickUpper: number } {
  const tickSpacing = getTickSpacingForFee(fee);
  const tickLower = Math.ceil(MIN_TICK / tickSpacing) * tickSpacing;
  const tickUpper = Math.floor(MAX_TICK / tickSpacing) * tickSpacing;
  return { tickLower, tickUpper };
}

/**
 * Validate fee tier
 */
export function isValidFeeTier(fee: number): boolean {
  return [100, 500, 3000, 10000].includes(fee);
}

/**
 * Format fee tier for display
 */
export function formatFeeTier(fee: number): string {
  return (fee / 10000).toFixed(fee >= 10000 ? 0 : 2) + '%';
}

// ═══════════════════════════════════════════════════════════════════════════════
// LIQUIDITY CALCULATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate liquidity from token amounts
 * Returns the maximum liquidity that can be minted with given amounts
 */
export function calculateLiquidityFromAmounts(
  sqrtPriceX96: bigint,
  sqrtPriceLower: bigint,
  sqrtPriceUpper: bigint,
  amount0: bigint,
  amount1: bigint
): bigint {
  if (sqrtPriceX96 <= sqrtPriceLower) {
    // Current price below range - only token0 needed
    if (amount0 === BigInt(0)) return BigInt(0);
    const diff = sqrtPriceUpper - sqrtPriceLower;
    if (diff === BigInt(0)) return BigInt(0);
    return (amount0 * sqrtPriceLower * sqrtPriceUpper) / (diff * Q96);
  } else if (sqrtPriceX96 >= sqrtPriceUpper) {
    // Current price above range - only token1 needed
    if (amount1 === BigInt(0)) return BigInt(0);
    const diff = sqrtPriceUpper - sqrtPriceLower;
    if (diff === BigInt(0)) return BigInt(0);
    return (amount1 * Q96) / diff;
  } else {
    // Current price in range - both tokens needed
    const liquidity0 = amount0 > BigInt(0)
      ? (amount0 * sqrtPriceX96 * sqrtPriceUpper) / ((sqrtPriceUpper - sqrtPriceX96) * Q96)
      : BigInt(0);
    const liquidity1 = amount1 > BigInt(0)
      ? (amount1 * Q96) / (sqrtPriceX96 - sqrtPriceLower)
      : BigInt(0);

    // Return minimum to ensure we don't promise more than we have
    if (liquidity0 === BigInt(0)) return liquidity1;
    if (liquidity1 === BigInt(0)) return liquidity0;
    return liquidity0 < liquidity1 ? liquidity0 : liquidity1;
  }
}

/**
 * Calculate token amounts from liquidity
 * Returns the amounts of token0 and token1 for a given liquidity
 */
export function calculateAmountsFromLiquidity(
  sqrtPriceX96: bigint,
  sqrtPriceLower: bigint,
  sqrtPriceUpper: bigint,
  liquidity: bigint
): { amount0: bigint; amount1: bigint } {
  let amount0 = BigInt(0);
  let amount1 = BigInt(0);

  if (sqrtPriceX96 <= sqrtPriceLower) {
    // Current price below range - position is entirely token0
    amount0 = (liquidity * Q96 * (sqrtPriceUpper - sqrtPriceLower)) / (sqrtPriceLower * sqrtPriceUpper);
  } else if (sqrtPriceX96 >= sqrtPriceUpper) {
    // Current price above range - position is entirely token1
    amount1 = (liquidity * (sqrtPriceUpper - sqrtPriceLower)) / Q96;
  } else {
    // Current price in range - position has both tokens
    amount0 = (liquidity * Q96 * (sqrtPriceUpper - sqrtPriceX96)) / (sqrtPriceX96 * sqrtPriceUpper);
    amount1 = (liquidity * (sqrtPriceX96 - sqrtPriceLower)) / Q96;
  }

  return { amount0, amount1 };
}

/**
 * Calculate the amounts with tick bounds instead of sqrtPrice bounds
 */
export function calculateAmountsFromLiquidityWithTicks(
  sqrtPriceX96: bigint,
  tickLower: number,
  tickUpper: number,
  liquidity: bigint
): { amount0: bigint; amount1: bigint } {
  const sqrtPriceLower = tickToSqrtPriceX96(tickLower);
  const sqrtPriceUpper = tickToSqrtPriceX96(tickUpper);
  return calculateAmountsFromLiquidity(sqrtPriceX96, sqrtPriceLower, sqrtPriceUpper, liquidity);
}

// ═══════════════════════════════════════════════════════════════════════════════
// POSITION UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if position is in range at current tick
 */
export function isPositionInRange(currentTick: number, tickLower: number, tickUpper: number): boolean {
  return currentTick >= tickLower && currentTick < tickUpper;
}

/**
 * Calculate what percentage of range the current tick is at
 * Returns 0 if below range, 100 if above range
 */
export function getPositionRangePercentage(currentTick: number, tickLower: number, tickUpper: number): number {
  if (currentTick <= tickLower) return 0;
  if (currentTick >= tickUpper) return 100;
  return ((currentTick - tickLower) / (tickUpper - tickLower)) * 100;
}

/**
 * Calculate pool share percentage
 */
export function calculatePoolShare(positionLiquidity: bigint, totalLiquidity: bigint): number {
  if (totalLiquidity === BigInt(0)) return 0;
  return Number((positionLiquidity * BigInt(10000)) / totalLiquidity) / 100;
}

/**
 * Estimate position value in terms of token1
 */
export function estimatePositionValue(
  sqrtPriceX96: bigint,
  tickLower: number,
  tickUpper: number,
  liquidity: bigint,
  decimals0: number,
  decimals1: number
): { amount0: number; amount1: number; totalInToken1: number } {
  const { amount0, amount1 } = calculateAmountsFromLiquidityWithTicks(
    sqrtPriceX96,
    tickLower,
    tickUpper,
    liquidity
  );

  const amount0Formatted = Number(amount0) / Math.pow(10, decimals0);
  const amount1Formatted = Number(amount1) / Math.pow(10, decimals1);

  const price = sqrtPriceX96ToPrice(sqrtPriceX96, decimals0, decimals1);
  const totalInToken1 = amount0Formatted * price + amount1Formatted;

  return {
    amount0: amount0Formatted,
    amount1: amount1Formatted,
    totalInToken1,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// V2 UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate V2 output amount (constant product formula)
 * amountOut = (amountIn * reserveOut * 997) / (reserveIn * 1000 + amountIn * 997)
 */
export function calculateV2AmountOut(
  amountIn: bigint,
  reserveIn: bigint,
  reserveOut: bigint
): bigint {
  if (amountIn === BigInt(0) || reserveIn === BigInt(0) || reserveOut === BigInt(0)) {
    return BigInt(0);
  }

  const amountInWithFee = amountIn * BigInt(997);
  const numerator = amountInWithFee * reserveOut;
  const denominator = reserveIn * BigInt(1000) + amountInWithFee;

  return numerator / denominator;
}

/**
 * Calculate V2 input amount needed for desired output
 * amountIn = (reserveIn * amountOut * 1000) / ((reserveOut - amountOut) * 997) + 1
 */
export function calculateV2AmountIn(
  amountOut: bigint,
  reserveIn: bigint,
  reserveOut: bigint
): bigint {
  if (amountOut === BigInt(0) || reserveIn === BigInt(0) || amountOut >= reserveOut) {
    return BigInt(0);
  }

  const numerator = reserveIn * amountOut * BigInt(1000);
  const denominator = (reserveOut - amountOut) * BigInt(997);

  return numerator / denominator + BigInt(1);
}

/**
 * Calculate V2 price from reserves
 */
export function calculateV2Price(
  reserve0: bigint,
  reserve1: bigint,
  decimals0: number,
  decimals1: number
): number {
  if (reserve0 === BigInt(0)) return 0;

  const r0 = Number(reserve0) / Math.pow(10, decimals0);
  const r1 = Number(reserve1) / Math.pow(10, decimals1);

  return r1 / r0;
}
