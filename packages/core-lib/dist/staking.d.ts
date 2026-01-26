/**
 * Staking Module
 * Handles $RATCHET staking contract interactions
 */
import type { Address } from './pool-creation.js';
interface Transaction {
    to: Address;
    data: string;
    value: string;
}
export interface StakingInfo {
    staked: string;
    earned: string;
    totalStaked: string;
    rewardRate: string;
    periodFinish: number;
    apr: number;
}
export declare const RATCHET_TOKEN_ADDRESS: Address;
export declare const RATCHET_STAKING_ADDRESS: Address;
export declare const STAKING_DURATION: number;
export declare const STAKING_ABI: readonly [{
    readonly name: "totalSupply";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "balanceOf";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly name: "account";
        readonly type: "address";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "earned";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly name: "account";
        readonly type: "address";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "rewardRate";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "periodFinish";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "rewardsDuration";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "stake";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly name: "amount";
        readonly type: "uint256";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "withdraw";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly name: "amount";
        readonly type: "uint256";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "getReward";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [];
    readonly outputs: readonly [];
}, {
    readonly name: "exit";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [];
    readonly outputs: readonly [];
}];
export declare const ERC20_APPROVE_ABI: readonly [{
    readonly name: "approve";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly name: "spender";
        readonly type: "address";
    }, {
        readonly name: "amount";
        readonly type: "uint256";
    }];
    readonly outputs: readonly [{
        readonly type: "bool";
    }];
}, {
    readonly name: "allowance";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly name: "owner";
        readonly type: "address";
    }, {
        readonly name: "spender";
        readonly type: "address";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}];
/**
 * Set the Alchemy API key for RPC calls
 */
export declare function setStakingAlchemyKey(key: string | undefined): void;
/**
 * Build approval transaction for staking contract
 * @param amount Amount to approve (wei string), defaults to max uint256
 */
export declare function buildStakingApprovalTransaction(amount?: string): Transaction;
/**
 * Build stake transaction
 * @param amount Amount to stake in wei
 */
export declare function buildStakeTransaction(amount: string): Transaction;
/**
 * Build withdraw transaction
 * @param amount Amount to withdraw in wei
 */
export declare function buildWithdrawTransaction(amount: string): Transaction;
/**
 * Build get reward transaction
 */
export declare function buildGetRewardTransaction(): Transaction;
/**
 * Build exit transaction (withdraw all + claim rewards)
 */
export declare function buildExitTransaction(): Transaction;
/**
 * Get staking info for a user
 * @param userAddress User's wallet address
 */
export declare function getStakingInfo(userAddress: Address): Promise<StakingInfo>;
/**
 * Get token allowance for staking contract
 * @param owner Owner address
 */
export declare function getStakingAllowance(owner: Address): Promise<bigint>;
/**
 * Get user's $RATCHET token balance
 * @param owner Owner address
 */
export declare function getRatchetBalance(owner: Address): Promise<bigint>;
export {};
