/**
 * Build transactions for managing liquidity in Uniswap V3/V4 positions
 */

import { encodeFunctionData, Address } from 'viem';

const V3_POSITION_MANAGER = '0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1';
const V4_POSITION_MANAGER = '0x7c5f5a4bbd8fd63184577525326123b519429bdc';

// V3 Position Manager ABIs
const V3_INCREASE_LIQUIDITY_ABI = [
  {
    name: 'increaseLiquidity',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenId', type: 'uint256' },
          { name: 'amount0Desired', type: 'uint256' },
          { name: 'amount1Desired', type: 'uint256' },
          { name: 'amount0Min', type: 'uint256' },
          { name: 'amount1Min', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
        ],
      },
    ],
    outputs: [
      { name: 'liquidity', type: 'uint128' },
      { name: 'amount0', type: 'uint256' },
      { name: 'amount1', type: 'uint256' },
    ],
  },
] as const;

const V3_DECREASE_LIQUIDITY_ABI = [
  {
    name: 'decreaseLiquidity',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenId', type: 'uint256' },
          { name: 'liquidity', type: 'uint128' },
          { name: 'amount0Min', type: 'uint256' },
          { name: 'amount1Min', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
        ],
      },
    ],
    outputs: [
      { name: 'amount0', type: 'uint256' },
      { name: 'amount1', type: 'uint256' },
    ],
  },
] as const;

const V3_BURN_ABI = [
  {
    name: 'burn',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [],
  },
] as const;

// V4 Position Manager ABIs
const V4_INCREASE_LIQUIDITY_ABI = [
  {
    name: 'increaseLiquidity',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'liquidity', type: 'uint256' },
      { name: 'amount0Max', type: 'uint128' },
      { name: 'amount1Max', type: 'uint128' },
      { name: 'hookData', type: 'bytes' },
    ],
    outputs: [],
  },
] as const;

const V4_DECREASE_LIQUIDITY_ABI = [
  {
    name: 'decreaseLiquidity',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'liquidity', type: 'uint256' },
      { name: 'amount0Min', type: 'uint128' },
      { name: 'amount1Min', type: 'uint128' },
      { name: 'hookData', type: 'bytes' },
    ],
    outputs: [],
  },
] as const;

const V4_BURN_ABI = [
  {
    name: 'burn',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'amount0Min', type: 'uint128' },
      { name: 'amount1Min', type: 'uint128' },
      { name: 'hookData', type: 'bytes' },
    ],
    outputs: [],
  },
] as const;

export interface Transaction {
  to: Address;
  data: `0x${string}`;
  value: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INCREASE LIQUIDITY
// ═══════════════════════════════════════════════════════════════════════════════

export interface IncreaseLiquidityParams {
  positionId: string; // Format: "v3-12345" or "v4-67890"
  amount0Desired: string; // Token0 amount in wei
  amount1Desired: string; // Token1 amount in wei
  slippageTolerance?: number; // 0-100, default 0.5%
}

/**
 * Build transaction to add liquidity to an existing position
 */
export function buildIncreaseLiquidityTransaction(params: IncreaseLiquidityParams): Transaction {
  const { positionId, amount0Desired, amount1Desired, slippageTolerance = 0.5 } = params;

  const [version, tokenIdStr] = positionId.split('-');
  const tokenId = BigInt(tokenIdStr);

  // Calculate minimum amounts with slippage tolerance
  const slippageMultiplier = 1 - slippageTolerance / 100;
  const amount0Min = BigInt(Math.floor(Number(amount0Desired) * slippageMultiplier));
  const amount1Min = BigInt(Math.floor(Number(amount1Desired) * slippageMultiplier));

  // Deadline: 20 minutes from now
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);

  if (version === 'v3') {
    const increaseParams = {
      tokenId,
      amount0Desired: BigInt(amount0Desired),
      amount1Desired: BigInt(amount1Desired),
      amount0Min,
      amount1Min,
      deadline,
    };

    const data = encodeFunctionData({
      abi: V3_INCREASE_LIQUIDITY_ABI,
      functionName: 'increaseLiquidity',
      args: [increaseParams],
    });

    return {
      to: V3_POSITION_MANAGER as Address,
      data,
      value: '0',
    };
  } else if (version === 'v4') {
    // V4 uses liquidity amount instead of token amounts
    // For simplicity, we'll use amount0 as liquidity (this may need adjustment)
    const liquidity = BigInt(amount0Desired);
    const amount0Max = BigInt(amount0Desired);
    const amount1Max = BigInt(amount1Desired);

    const data = encodeFunctionData({
      abi: V4_INCREASE_LIQUIDITY_ABI,
      functionName: 'increaseLiquidity',
      args: [
        tokenId,
        liquidity,
        BigInt(amount0Max),
        BigInt(amount1Max),
        '0x' as `0x${string}`, // Empty hookData
      ],
    });

    return {
      to: V4_POSITION_MANAGER as Address,
      data,
      value: '0',
    };
  } else {
    throw new Error(`Unsupported position version: ${version}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DECREASE LIQUIDITY
// ═══════════════════════════════════════════════════════════════════════════════

export interface DecreaseLiquidityParams {
  positionId: string; // Format: "v3-12345" or "v4-67890"
  liquidityPercentage: number; // 0-100, percentage of liquidity to remove
  currentLiquidity: string; // Current liquidity value from position
  slippageTolerance?: number; // 0-100, default 0.5%
}

/**
 * Build transaction to remove liquidity from a position
 */
export function buildDecreaseLiquidityTransaction(params: DecreaseLiquidityParams): Transaction {
  const { positionId, liquidityPercentage, currentLiquidity, slippageTolerance = 0.5 } = params;

  const [version, tokenIdStr] = positionId.split('-');
  const tokenId = BigInt(tokenIdStr);

  // Calculate liquidity to remove
  const totalLiquidity = BigInt(currentLiquidity);
  const liquidityToRemove = (totalLiquidity * BigInt(Math.floor(liquidityPercentage * 100))) / BigInt(10000);

  // Minimum amounts with slippage (set to 0 for simplicity - real impl should calculate from pool price)
  const amount0Min = BigInt(0);
  const amount1Min = BigInt(0);

  // Deadline: 20 minutes from now
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);

  if (version === 'v3') {
    const decreaseParams = {
      tokenId,
      liquidity: liquidityToRemove,
      amount0Min,
      amount1Min,
      deadline,
    };

    const data = encodeFunctionData({
      abi: V3_DECREASE_LIQUIDITY_ABI,
      functionName: 'decreaseLiquidity',
      args: [decreaseParams],
    });

    return {
      to: V3_POSITION_MANAGER as Address,
      data,
      value: '0',
    };
  } else if (version === 'v4') {
    const data = encodeFunctionData({
      abi: V4_DECREASE_LIQUIDITY_ABI,
      functionName: 'decreaseLiquidity',
      args: [
        tokenId,
        liquidityToRemove,
        BigInt(amount0Min),
        BigInt(amount1Min),
        '0x' as `0x${string}`, // Empty hookData
      ],
    });

    return {
      to: V4_POSITION_MANAGER as Address,
      data,
      value: '0',
    };
  } else {
    throw new Error(`Unsupported position version: ${version}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// BURN POSITION (Close completely)
// ═══════════════════════════════════════════════════════════════════════════════

export interface BurnPositionParams {
  positionId: string; // Format: "v3-12345" or "v4-67890"
}

/**
 * Build transaction to burn (close) a position NFT
 * NOTE: Position must have 0 liquidity before burning
 * User must call decreaseLiquidity(100%) first, then collect fees, then burn
 */
export function buildBurnPositionTransaction(params: BurnPositionParams): Transaction {
  const { positionId } = params;

  const [version, tokenIdStr] = positionId.split('-');
  const tokenId = BigInt(tokenIdStr);

  if (version === 'v3') {
    const data = encodeFunctionData({
      abi: V3_BURN_ABI,
      functionName: 'burn',
      args: [tokenId],
    });

    return {
      to: V3_POSITION_MANAGER as Address,
      data,
      value: '0',
    };
  } else if (version === 'v4') {
    // V4 burn includes min amounts
    const data = encodeFunctionData({
      abi: V4_BURN_ABI,
      functionName: 'burn',
      args: [
        tokenId,
        BigInt(0), // amount0Min
        BigInt(0), // amount1Min
        '0x' as `0x${string}`, // Empty hookData
      ],
    });

    return {
      to: V4_POSITION_MANAGER as Address,
      data,
      value: '0',
    };
  } else {
    throw new Error(`Unsupported position version: ${version}`);
  }
}
