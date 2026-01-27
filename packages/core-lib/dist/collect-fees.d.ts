/**
 * Build transactions for collecting fees from Uniswap positions
 *
 * V3: Uses NonfungiblePositionManager.collect()
 * V4: Uses PositionManager.modifyLiquidities() with DECREASE_LIQUIDITY(0) + TAKE_PAIR
 *     (V4 has no collect() function — fees are collected by decreasing with 0 liquidity)
 */
import { Address } from 'viem';
export interface CollectFeesParams {
    positionId: string;
    recipient: string;
    currency0?: string;
    currency1?: string;
}
export interface CollectFeesTransaction {
    to: Address;
    data: `0x${string}`;
    value: string;
}
/**
 * Build a transaction to collect fees from a position
 */
export declare function buildCollectFeesTransaction(params: CollectFeesParams): CollectFeesTransaction;
/**
 * V2 positions don't have separate fee collection - fees are in the LP token value
 */
export declare function canCollectFees(positionVersion: string): boolean;
