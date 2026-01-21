/**
 * API service for fetching data from Next.js API routes
 */

import type { PoolsResponse, Position } from '../utils/types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '/app/api';

/**
 * Fetch all ARBME pools
 */
export async function fetchPools(): Promise<PoolsResponse> {
  const res = await fetch(`${API_BASE}/pools`);
  if (!res.ok) {
    throw new Error(`Failed to fetch pools: ${res.statusText}`);
  }
  return res.json();
}

/**
 * Fetch user's LP positions
 */
export async function fetchPositions(wallet: string): Promise<Position[]> {
  const res = await fetch(`${API_BASE}/positions?wallet=${wallet}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch positions: ${res.statusText}`);
  }
  return res.json();
}

/**
 * Fetch single position details
 */
export async function fetchPosition(id: string, wallet: string): Promise<Position> {
  const res = await fetch(`${API_BASE}/position/${id}?wallet=${wallet}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch position: ${res.statusText}`);
  }
  return res.json();
}

/**
 * Build fee collection transaction
 */
export async function buildCollectFeesTransaction(positionId: string, recipient: string): Promise<{
  to: string;
  data: string;
  value: string;
}> {
  const res = await fetch(`${API_BASE}/collect-fees`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ positionId, recipient }),
  });

  if (!res.ok) {
    throw new Error(`Failed to build transaction: ${res.statusText}`);
  }

  return res.json();
}

/**
 * Build increase liquidity transaction
 */
export async function buildIncreaseLiquidityTransaction(
  positionId: string,
  amount0Desired: string,
  amount1Desired: string,
  slippageTolerance?: number
): Promise<{
  to: string;
  data: string;
  value: string;
}> {
  const res = await fetch(`${API_BASE}/increase-liquidity`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ positionId, amount0Desired, amount1Desired, slippageTolerance }),
  });

  if (!res.ok) {
    throw new Error(`Failed to build transaction: ${res.statusText}`);
  }

  return res.json();
}

/**
 * Build decrease liquidity transaction
 */
export async function buildDecreaseLiquidityTransaction(
  positionId: string,
  liquidityPercentage: number,
  currentLiquidity: string,
  slippageTolerance?: number
): Promise<{
  to: string;
  data: string;
  value: string;
}> {
  const res = await fetch(`${API_BASE}/decrease-liquidity`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ positionId, liquidityPercentage, currentLiquidity, slippageTolerance }),
  });

  if (!res.ok) {
    throw new Error(`Failed to build transaction: ${res.statusText}`);
  }

  return res.json();
}

/**
 * Build burn position transaction
 */
export async function buildBurnPositionTransaction(positionId: string): Promise<{
  to: string;
  data: string;
  value: string;
}> {
  const res = await fetch(`${API_BASE}/burn-position`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ positionId }),
  });

  if (!res.ok) {
    throw new Error(`Failed to build transaction: ${res.statusText}`);
  }

  return res.json();
}
