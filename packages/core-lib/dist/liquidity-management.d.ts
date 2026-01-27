/**
 * Build transactions for managing liquidity in Uniswap V3/V4 positions
 *
 * V3: Uses NonfungiblePositionManager direct functions
 * V4: Uses PositionManager.modifyLiquidities() with action codes
 *     (V4 has no individual increase/decrease/burn functions)
 */
import { Address } from 'viem';
export interface Transaction {
    to: Address;
    data: `0x${string}`;
    value: string;
}
export interface IncreaseLiquidityParams {
    positionId: string;
    amount0Desired: string;
    amount1Desired: string;
    slippageTolerance?: number;
    currency0?: string;
    currency1?: string;
}
/**
 * Build transaction to add liquidity to an existing position
 */
export declare function buildIncreaseLiquidityTransaction(params: IncreaseLiquidityParams): Transaction;
export interface DecreaseLiquidityParams {
    positionId: string;
    liquidityPercentage: number;
    currentLiquidity: string;
    slippageTolerance?: number;
    recipient?: string;
    currency0?: string;
    currency1?: string;
}
/**
 * Build transaction to remove liquidity from a position
 */
export declare function buildDecreaseLiquidityTransaction(params: DecreaseLiquidityParams): Transaction;
export interface BurnPositionParams {
    positionId: string;
    recipient?: string;
    currency0?: string;
    currency1?: string;
}
/**
 * Build transaction to burn (close) a position NFT
 * NOTE: Position must have 0 liquidity before burning
 * User must call decreaseLiquidity(100%) first, then collect fees, then burn
 */
export declare function buildBurnPositionTransaction(params: BurnPositionParams): Transaction;
