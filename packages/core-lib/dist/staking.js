/**
 * Staking Module
 * Handles $RATCHET staking contract interactions
 */
import { encodeFunctionData } from 'viem';
import { BASE_RPCS_FALLBACK } from './constants.js';
// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════
// $RATCHET token address on Base
export const RATCHET_TOKEN_ADDRESS = '0x392bc5DeEa227043d69Af0e67BadCbBAeD511B07';
// RatchetStaking contract address on Base
export const RATCHET_STAKING_ADDRESS = '0x9Bf5fc3C400c619B9c73CE4D4c847c4707baE5E7';
// Staking rewards duration (365 days)
export const STAKING_DURATION = 365 * 24 * 60 * 60;
// ═══════════════════════════════════════════════════════════════════════════════
// Contract ABI (minimal for our needs)
// ═══════════════════════════════════════════════════════════════════════════════
export const STAKING_ABI = [
    // Read functions
    {
        name: 'totalSupply',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ type: 'uint256' }],
    },
    {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ type: 'uint256' }],
    },
    {
        name: 'earned',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ type: 'uint256' }],
    },
    {
        name: 'rewardRate',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ type: 'uint256' }],
    },
    {
        name: 'periodFinish',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ type: 'uint256' }],
    },
    {
        name: 'rewardsDuration',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ type: 'uint256' }],
    },
    // Write functions
    {
        name: 'stake',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [{ name: 'amount', type: 'uint256' }],
        outputs: [],
    },
    {
        name: 'withdraw',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [{ name: 'amount', type: 'uint256' }],
        outputs: [],
    },
    {
        name: 'getReward',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [],
        outputs: [],
    },
    {
        name: 'exit',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [],
        outputs: [],
    },
];
// ERC20 ABI for approval
export const ERC20_APPROVE_ABI = [
    {
        name: 'approve',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' },
        ],
        outputs: [{ type: 'bool' }],
    },
    {
        name: 'allowance',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' },
        ],
        outputs: [{ type: 'uint256' }],
    },
];
// ═══════════════════════════════════════════════════════════════════════════════
// Module-level Alchemy key for RPC calls
// ═══════════════════════════════════════════════════════════════════════════════
let _alchemyKey;
/**
 * Set the Alchemy API key for RPC calls
 */
export function setStakingAlchemyKey(key) {
    _alchemyKey = key;
}
function getRpcUrl() {
    if (_alchemyKey) {
        return `https://base-mainnet.g.alchemy.com/v2/${_alchemyKey}`;
    }
    return BASE_RPCS_FALLBACK[0];
}
async function rpcCall(method, params) {
    const url = getRpcUrl();
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    });
    if (!response.ok) {
        throw new Error(`RPC error: ${response.status}`);
    }
    const data = await response.json();
    if (data.error) {
        throw new Error(data.error.message);
    }
    return data.result;
}
// ═══════════════════════════════════════════════════════════════════════════════
// Transaction Builders
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Build approval transaction for staking contract
 * @param amount Amount to approve (wei string), defaults to max uint256
 */
export function buildStakingApprovalTransaction(amount) {
    const approvalAmount = amount
        ? BigInt(amount)
        : BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
    const data = encodeFunctionData({
        abi: ERC20_APPROVE_ABI,
        functionName: 'approve',
        args: [RATCHET_STAKING_ADDRESS, approvalAmount],
    });
    return {
        to: RATCHET_TOKEN_ADDRESS,
        data,
        value: '0',
    };
}
/**
 * Build stake transaction
 * @param amount Amount to stake in wei
 */
export function buildStakeTransaction(amount) {
    const data = encodeFunctionData({
        abi: STAKING_ABI,
        functionName: 'stake',
        args: [BigInt(amount)],
    });
    return {
        to: RATCHET_STAKING_ADDRESS,
        data,
        value: '0',
    };
}
/**
 * Build withdraw transaction
 * @param amount Amount to withdraw in wei
 */
export function buildWithdrawTransaction(amount) {
    const data = encodeFunctionData({
        abi: STAKING_ABI,
        functionName: 'withdraw',
        args: [BigInt(amount)],
    });
    return {
        to: RATCHET_STAKING_ADDRESS,
        data,
        value: '0',
    };
}
/**
 * Build get reward transaction
 */
export function buildGetRewardTransaction() {
    // getReward() - 0x3d18b912
    const data = '0x3d18b912';
    return {
        to: RATCHET_STAKING_ADDRESS,
        data,
        value: '0',
    };
}
/**
 * Build exit transaction (withdraw all + claim rewards)
 */
export function buildExitTransaction() {
    // exit() - 0xe9fad8ee
    const data = '0xe9fad8ee';
    return {
        to: RATCHET_STAKING_ADDRESS,
        data,
        value: '0',
    };
}
// ═══════════════════════════════════════════════════════════════════════════════
// Read Functions
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Get staking info for a user
 * @param userAddress User's wallet address
 */
export async function getStakingInfo(userAddress) {
    // Build multicall data
    const calls = [
        // totalSupply()
        { to: RATCHET_STAKING_ADDRESS, data: '0x18160ddd' },
        // balanceOf(address)
        { to: RATCHET_STAKING_ADDRESS, data: '0x70a08231' + userAddress.slice(2).padStart(64, '0') },
        // earned(address)
        { to: RATCHET_STAKING_ADDRESS, data: '0x008cc262' + userAddress.slice(2).padStart(64, '0') },
        // rewardRate()
        { to: RATCHET_STAKING_ADDRESS, data: '0x7b0a47ee' },
        // periodFinish()
        { to: RATCHET_STAKING_ADDRESS, data: '0xebe2b12b' },
    ];
    // Execute calls in parallel
    const results = await Promise.all(calls.map(call => rpcCall('eth_call', [call, 'latest'])));
    const totalStaked = BigInt(results[0]);
    const staked = BigInt(results[1]);
    const earned = BigInt(results[2]);
    const rewardRate = BigInt(results[3]);
    const periodFinish = parseInt(results[4], 16);
    // Calculate APR
    // APR = (rewardRate * secondsPerYear / totalStaked) * 100
    let apr = 0;
    if (totalStaked > 0n) {
        const secondsPerYear = 365n * 24n * 60n * 60n;
        const yearlyRewards = rewardRate * secondsPerYear;
        // Scale by 10000 for precision (result is in basis points)
        apr = Number((yearlyRewards * 10000n) / totalStaked) / 100;
    }
    return {
        staked: staked.toString(),
        earned: earned.toString(),
        totalStaked: totalStaked.toString(),
        rewardRate: rewardRate.toString(),
        periodFinish,
        apr,
    };
}
/**
 * Get token allowance for staking contract
 * @param owner Owner address
 */
export async function getStakingAllowance(owner) {
    const data = '0xdd62ed3e' +
        owner.slice(2).padStart(64, '0') +
        RATCHET_STAKING_ADDRESS.slice(2).padStart(64, '0');
    const result = await rpcCall('eth_call', [
        { to: RATCHET_TOKEN_ADDRESS, data },
        'latest'
    ]);
    return BigInt(result);
}
/**
 * Get user's $RATCHET token balance
 * @param owner Owner address
 */
export async function getRatchetBalance(owner) {
    const data = '0x70a08231' + owner.slice(2).padStart(64, '0');
    const result = await rpcCall('eth_call', [
        { to: RATCHET_TOKEN_ADDRESS, data },
        'latest'
    ]);
    return BigInt(result);
}
