/**
 * Swap Transaction Builders + Quote Functions
 *
 * V2: Uses Uniswap V2 Router swapExactTokensForTokens
 * V3: Uses SwapRouter02 exactInputSingle
 * V4: Uses Universal Router with V4_SWAP command
 */
import { Address } from 'viem';
export declare const V2_SWAP_ROUTER: Address;
export declare const V3_SWAP_ROUTER: Address;
export declare const V4_UNIVERSAL_ROUTER: Address;
export interface SwapTransaction {
    to: Address;
    data: `0x${string}`;
    value: string;
}
export interface SwapQuote {
    amountOut: string;
    priceImpact: number;
    executionPrice: number;
}
export interface SwapParams {
    poolAddress: string;
    version: 'V2' | 'V3' | 'V4';
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    minAmountOut: string;
    recipient: string;
    fee?: number;
    tickSpacing?: number;
    slippageTolerance?: number;
}
export interface QuoteParams {
    poolAddress: string;
    version: 'V2' | 'V3' | 'V4';
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    fee?: number;
    tickSpacing?: number;
    reserve0?: string;
    reserve1?: string;
    sqrtPriceX96?: string;
    decimals0?: number;
    decimals1?: number;
}
/**
 * Get V2 swap quote using constant product formula
 */
export declare function getV2SwapQuote(params: QuoteParams): SwapQuote;
/**
 * Get V3 swap quote using sqrtPriceX96
 */
export declare function getV3SwapQuote(params: QuoteParams): SwapQuote;
/**
 * Get V4 swap quote (similar to V3 with StateView data)
 */
export declare function getV4SwapQuote(params: QuoteParams): SwapQuote;
/**
 * Unified quote function that routes to correct version
 */
export declare function getSwapQuote(params: QuoteParams): SwapQuote;
/**
 * Build V2 swap transaction
 * Uses swapExactTokensForTokens(amountIn, amountOutMin, path, to, deadline)
 */
export declare function buildV2SwapTransaction(params: SwapParams): SwapTransaction;
/**
 * Build V3 swap transaction
 * Uses exactInputSingle on SwapRouter02
 */
export declare function buildV3SwapTransaction(params: SwapParams): SwapTransaction;
/**
 * Build V4 swap transaction
 * Uses Universal Router execute(commands, inputs, deadline)
 * Command 0x10 = V4_SWAP
 */
export declare function buildV4SwapTransaction(params: SwapParams): SwapTransaction;
/**
 * Unified swap transaction builder that routes to correct version
 */
export declare function buildSwapTransaction(params: SwapParams): SwapTransaction;
