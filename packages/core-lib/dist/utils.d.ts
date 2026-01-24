/**
 * Utility functions for token operations, amounts, and transactions
 */
export declare const TX_CONSTANTS: {
    readonly APPROVAL_BUFFER: 1.1;
    readonly APPROVAL_BUFFER_BPS: bigint;
    readonly APPROVAL_DIVISOR: bigint;
    readonly SLIPPAGE_TOLERANCE: 0.05;
    readonly SLIPPAGE_MULTIPLIER: 0.95;
    readonly SLIPPAGE_NUMERATOR: bigint;
    readonly SLIPPAGE_DIVISOR: bigint;
    readonly DEADLINE_SECONDS: 1200;
    readonly GAS_LIMITS: {
        readonly APPROVE: "0x15F90";
        readonly SIMPLE_TRANSFER: "0x5208";
        readonly ADD_LIQUIDITY_V2: "0x7A120";
        readonly ADD_LIQUIDITY_V3: "0x7A120";
        readonly ADD_LIQUIDITY_V4: "0x7A120";
        readonly CREATE_POOL_V4: "0xF4240";
        readonly REMOVE_LIQUIDITY_V2: "0x7A120";
        readonly REMOVE_LIQUIDITY_V3: "0x61A80";
        readonly REMOVE_LIQUIDITY_V4: "0x61A80";
        readonly COLLECT_FEES: "0x30D40";
    };
};
export declare const AMOUNT_VALIDATION: {
    readonly MIN_AMOUNT: 0.000001;
    readonly MAX_AMOUNT: 1000000000000000;
    readonly MAX_UINT128: bigint;
    readonly MAX_UINT256: bigint;
};
/**
 * Fetch ERC20 token balance for a wallet
 */
export declare function fetchTokenBalance(token: string, wallet: string, alchemyKey?: string): Promise<bigint>;
/**
 * Fetch multiple token balances in parallel
 */
export declare function fetchTokenBalances(tokens: string[], wallet: string, alchemyKey?: string): Promise<Map<string, bigint>>;
/**
 * Fetch native ETH balance
 */
export declare function fetchEthBalance(wallet: string, alchemyKey?: string): Promise<bigint>;
/**
 * Check token allowance for a spender
 */
export declare function checkTokenAllowance(token: string, owner: string, spender: string, alchemyKey?: string): Promise<bigint>;
/**
 * Check if token is approved for at least the specified amount
 */
export declare function isTokenApproved(token: string, owner: string, spender: string, amount: bigint, alchemyKey?: string): Promise<boolean>;
/**
 * Check allowances for multiple tokens
 */
export declare function checkMultipleAllowances(tokens: string[], owner: string, spender: string, alchemyKey?: string): Promise<Map<string, bigint>>;
/**
 * Convert raw token amount (bigint) to human-readable number
 */
export declare function formatFromRaw(raw: bigint | string | null | undefined, decimals: number): number;
/**
 * Convert human-readable amount to raw token amount (bigint)
 */
export declare function toRawAmount(amount: number | string | null | undefined, decimals: number): bigint;
/**
 * Convert human-readable amount to raw with buffer multiplier
 */
export declare function toRawAmountWithBuffer(amount: number | string, decimals: number, buffer?: number): bigint;
/**
 * Apply approval buffer (10% extra) to an amount
 */
export declare function applyApprovalBuffer(amount: bigint): bigint;
/**
 * Apply slippage tolerance (5% less) to an amount
 */
export declare function applySlippage(amount: bigint): bigint;
/**
 * Apply custom slippage percentage to an amount
 * @param amount The amount to apply slippage to
 * @param slippagePercent Slippage as percentage (e.g., 0.5 for 0.5%)
 */
export declare function applyCustomSlippage(amount: bigint, slippagePercent: number): bigint;
/**
 * Get transaction deadline timestamp (20 minutes from now)
 */
export declare function getDeadline(): bigint;
/**
 * Get custom deadline timestamp
 * @param secondsFromNow Seconds from now until deadline
 */
export declare function getCustomDeadline(secondsFromNow: number): bigint;
/**
 * Compare two addresses (case-insensitive)
 * Returns -1 if a < b, 1 if a > b, 0 if equal
 */
export declare function compareAddresses(a: string, b: string): number;
/**
 * Sort two addresses in ascending order (required for Uniswap pool keys)
 */
export declare function sortAddresses(addr0: string, addr1: string): [string, string];
/**
 * Check if address a is less than address b
 */
export declare function isAddressLessThan(a: string, b: string): boolean;
/**
 * Validate Ethereum address format
 */
export declare function isValidAddress(address: string): boolean;
/**
 * Normalize address to lowercase with checksum validation
 */
export declare function normalizeAddress(address: string): string | null;
export interface ClassifiedError {
    type: 'network' | 'user_rejected' | 'insufficient_funds' | 'contract' | 'unknown';
    message: string;
    recoverable: boolean;
}
/**
 * Classify an error for appropriate user feedback
 */
export declare function classifyError(error: unknown): ClassifiedError;
/**
 * Execute function with automatic retry for transient failures
 */
export declare function withRetry<T>(fn: () => Promise<T>, maxRetries?: number, delayMs?: number): Promise<T>;
