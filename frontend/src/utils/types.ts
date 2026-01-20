/**
 * Core type definitions for ArbMe miniapp
 */

export interface Pool {
  pair: string;
  pairAddress: string;
  dex: string;
  tvl: number;
  volume24h: number;
  priceUsd: string;
  priceChange24h: number;
  url: string;
  source: string;
  token0?: string;
  token1?: string;
  token0Logo?: string;
  token1Logo?: string;
  fee?: number;
}

export interface PoolsResponse {
  token: string;
  poolCount: number;
  totalTvl: number;
  arbmePrice: string;
  tokenPrices: {
    PAGE: number;
    OINC: number;
    CLANKER: number;
  };
  pools: Pool[];
  lastUpdated: string;
}

export interface Position {
  id: string;
  version: 'V2' | 'V3' | 'V4';
  pair: string;
  token0: string;
  token1: string;
  liquidity: string;
  liquidityUsd: number;
  feesEarned: string;
  feesEarnedUsd: number;
  priceRangeLow?: string;
  priceRangeHigh?: string;
  inRange?: boolean;
}

export interface AppState {
  wallet: string | null;
  pools: Pool[];
  positions: Position[];
  loading: boolean;
  error: string | null;
}
