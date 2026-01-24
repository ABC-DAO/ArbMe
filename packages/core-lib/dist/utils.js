/**
 * Utility functions for token operations, amounts, and transactions
 */
import { createPublicClient, http, formatUnits, parseUnits } from 'viem';
import { base } from 'viem/chains';
import { BASE_RPCS_FALLBACK } from './constants.js';
// ═══════════════════════════════════════════════════════════════════════════════
// TRANSACTION CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════
export const TX_CONSTANTS = {
    // Approval buffer: Approve 10% more than needed
    APPROVAL_BUFFER: 1.10,
    APPROVAL_BUFFER_BPS: BigInt(110),
    APPROVAL_DIVISOR: BigInt(100),
    // Slippage tolerance: Accept 5% less than expected
    SLIPPAGE_TOLERANCE: 0.05,
    SLIPPAGE_MULTIPLIER: 0.95,
    SLIPPAGE_NUMERATOR: BigInt(95),
    SLIPPAGE_DIVISOR: BigInt(100),
    // Transaction deadline: 20 minutes
    DEADLINE_SECONDS: 1200,
    // Gas limits by operation type
    GAS_LIMITS: {
        APPROVE: '0x15F90', // 90,000
        SIMPLE_TRANSFER: '0x5208', // 21,000
        ADD_LIQUIDITY_V2: '0x7A120', // 500,000
        ADD_LIQUIDITY_V3: '0x7A120', // 500,000
        ADD_LIQUIDITY_V4: '0x7A120', // 500,000
        CREATE_POOL_V4: '0xF4240', // 1,000,000
        REMOVE_LIQUIDITY_V2: '0x7A120',
        REMOVE_LIQUIDITY_V3: '0x61A80', // 400,000
        REMOVE_LIQUIDITY_V4: '0x61A80',
        COLLECT_FEES: '0x30D40', // 200,000
    },
};
export const AMOUNT_VALIDATION = {
    MIN_AMOUNT: 0.000001,
    MAX_AMOUNT: 1e15,
    MAX_UINT128: BigInt('0xffffffffffffffffffffffffffffffff'),
    MAX_UINT256: BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'),
};
// ═══════════════════════════════════════════════════════════════════════════════
// VIEM CLIENT HELPER
// ═══════════════════════════════════════════════════════════════════════════════
function getClient(alchemyKey) {
    const rpcUrl = alchemyKey
        ? `https://base-mainnet.g.alchemy.com/v2/${alchemyKey}`
        : BASE_RPCS_FALLBACK[0];
    return createPublicClient({
        chain: base,
        transport: http(rpcUrl),
    });
}
// ═══════════════════════════════════════════════════════════════════════════════
// BALANCE FETCHING
// ═══════════════════════════════════════════════════════════════════════════════
const ERC20_BALANCE_ABI = [
    {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
    },
];
/**
 * Fetch ERC20 token balance for a wallet
 */
export async function fetchTokenBalance(token, wallet, alchemyKey) {
    const client = getClient(alchemyKey);
    try {
        const balance = await client.readContract({
            address: token,
            abi: ERC20_BALANCE_ABI,
            functionName: 'balanceOf',
            args: [wallet],
        });
        return balance;
    }
    catch (error) {
        console.error(`[Utils] Failed to fetch balance for ${token}:`, error);
        return BigInt(0);
    }
}
/**
 * Fetch multiple token balances in parallel
 */
export async function fetchTokenBalances(tokens, wallet, alchemyKey) {
    const results = await Promise.all(tokens.map(token => fetchTokenBalance(token, wallet, alchemyKey)));
    const balances = new Map();
    tokens.forEach((token, i) => {
        balances.set(token.toLowerCase(), results[i]);
    });
    return balances;
}
/**
 * Fetch native ETH balance
 */
export async function fetchEthBalance(wallet, alchemyKey) {
    const client = getClient(alchemyKey);
    try {
        return await client.getBalance({ address: wallet });
    }
    catch (error) {
        console.error(`[Utils] Failed to fetch ETH balance:`, error);
        return BigInt(0);
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// ALLOWANCE CHECKING
// ═══════════════════════════════════════════════════════════════════════════════
const ERC20_ALLOWANCE_ABI = [
    {
        name: 'allowance',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' },
        ],
        outputs: [{ name: '', type: 'uint256' }],
    },
];
/**
 * Check token allowance for a spender
 */
export async function checkTokenAllowance(token, owner, spender, alchemyKey) {
    const client = getClient(alchemyKey);
    try {
        const allowance = await client.readContract({
            address: token,
            abi: ERC20_ALLOWANCE_ABI,
            functionName: 'allowance',
            args: [owner, spender],
        });
        return allowance;
    }
    catch (error) {
        console.error(`[Utils] Failed to check allowance:`, error);
        return BigInt(0);
    }
}
/**
 * Check if token is approved for at least the specified amount
 */
export async function isTokenApproved(token, owner, spender, amount, alchemyKey) {
    const allowance = await checkTokenAllowance(token, owner, spender, alchemyKey);
    return allowance >= amount;
}
/**
 * Check allowances for multiple tokens
 */
export async function checkMultipleAllowances(tokens, owner, spender, alchemyKey) {
    const results = await Promise.all(tokens.map(token => checkTokenAllowance(token, owner, spender, alchemyKey)));
    const allowances = new Map();
    tokens.forEach((token, i) => {
        allowances.set(token.toLowerCase(), results[i]);
    });
    return allowances;
}
// ═══════════════════════════════════════════════════════════════════════════════
// AMOUNT CONVERSION
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Convert raw token amount (bigint) to human-readable number
 */
export function formatFromRaw(raw, decimals) {
    if (raw === null || raw === undefined)
        return 0;
    if (decimals < 0 || decimals > 24)
        return 0;
    try {
        const rawBigint = typeof raw === 'string' ? BigInt(raw) : raw;
        return parseFloat(formatUnits(rawBigint, decimals));
    }
    catch {
        return 0;
    }
}
/**
 * Convert human-readable amount to raw token amount (bigint)
 */
export function toRawAmount(amount, decimals) {
    if (amount === null || amount === undefined)
        return BigInt(0);
    if (decimals < 0 || decimals > 24)
        return BigInt(0);
    try {
        const amountStr = typeof amount === 'number' ? amount.toString() : amount;
        return parseUnits(amountStr, decimals);
    }
    catch {
        return BigInt(0);
    }
}
/**
 * Convert human-readable amount to raw with buffer multiplier
 */
export function toRawAmountWithBuffer(amount, decimals, buffer = 1.0) {
    if (buffer <= 0)
        buffer = 1.0;
    const amountNum = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (!Number.isFinite(amountNum))
        return BigInt(0);
    return toRawAmount(amountNum * buffer, decimals);
}
// ═══════════════════════════════════════════════════════════════════════════════
// SLIPPAGE AND BUFFER HELPERS
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Apply approval buffer (10% extra) to an amount
 */
export function applyApprovalBuffer(amount) {
    return (amount * TX_CONSTANTS.APPROVAL_BUFFER_BPS) / TX_CONSTANTS.APPROVAL_DIVISOR;
}
/**
 * Apply slippage tolerance (5% less) to an amount
 */
export function applySlippage(amount) {
    return (amount * TX_CONSTANTS.SLIPPAGE_NUMERATOR) / TX_CONSTANTS.SLIPPAGE_DIVISOR;
}
/**
 * Apply custom slippage percentage to an amount
 * @param amount The amount to apply slippage to
 * @param slippagePercent Slippage as percentage (e.g., 0.5 for 0.5%)
 */
export function applyCustomSlippage(amount, slippagePercent) {
    const multiplier = BigInt(Math.floor((100 - slippagePercent) * 100));
    return (amount * multiplier) / BigInt(10000);
}
/**
 * Get transaction deadline timestamp (20 minutes from now)
 */
export function getDeadline() {
    return BigInt(Math.floor(Date.now() / 1000) + TX_CONSTANTS.DEADLINE_SECONDS);
}
/**
 * Get custom deadline timestamp
 * @param secondsFromNow Seconds from now until deadline
 */
export function getCustomDeadline(secondsFromNow) {
    return BigInt(Math.floor(Date.now() / 1000) + secondsFromNow);
}
// ═══════════════════════════════════════════════════════════════════════════════
// ADDRESS UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Compare two addresses (case-insensitive)
 * Returns -1 if a < b, 1 if a > b, 0 if equal
 */
export function compareAddresses(a, b) {
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();
    if (aLower < bLower)
        return -1;
    if (aLower > bLower)
        return 1;
    return 0;
}
/**
 * Sort two addresses in ascending order (required for Uniswap pool keys)
 */
export function sortAddresses(addr0, addr1) {
    return compareAddresses(addr0, addr1) < 0 ? [addr0, addr1] : [addr1, addr0];
}
/**
 * Check if address a is less than address b
 */
export function isAddressLessThan(a, b) {
    return compareAddresses(a, b) < 0;
}
/**
 * Validate Ethereum address format
 */
export function isValidAddress(address) {
    if (!address || typeof address !== 'string')
        return false;
    return /^0x[0-9a-fA-F]{40}$/.test(address);
}
/**
 * Normalize address to lowercase with checksum validation
 */
export function normalizeAddress(address) {
    if (!isValidAddress(address))
        return null;
    return address.toLowerCase();
}
/**
 * Classify an error for appropriate user feedback
 */
export function classifyError(error) {
    const message = error instanceof Error ? error.message : String(error);
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('user rejected') || lowerMessage.includes('user denied')) {
        return { type: 'user_rejected', message: 'Transaction rejected by user', recoverable: true };
    }
    if (lowerMessage.includes('insufficient funds') || lowerMessage.includes('insufficient balance')) {
        return { type: 'insufficient_funds', message: 'Insufficient funds for transaction', recoverable: false };
    }
    if (lowerMessage.includes('network') || lowerMessage.includes('timeout') || lowerMessage.includes('fetch')) {
        return { type: 'network', message: 'Network error - please try again', recoverable: true };
    }
    if (lowerMessage.includes('revert') || lowerMessage.includes('execution reverted')) {
        return { type: 'contract', message: 'Transaction would fail - check amounts and approvals', recoverable: false };
    }
    return { type: 'unknown', message, recoverable: false };
}
/**
 * Execute function with automatic retry for transient failures
 */
export async function withRetry(fn, maxRetries = 3, delayMs = 1000) {
    let lastError = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            const classified = classifyError(error);
            // Don't retry non-recoverable errors
            if (!classified.recoverable)
                throw lastError;
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, delayMs * (attempt + 1)));
            }
        }
    }
    throw lastError || new Error('Retry failed');
}
