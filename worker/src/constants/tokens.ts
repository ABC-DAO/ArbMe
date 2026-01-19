/**
 * TOKEN_METADATA - Single Source of Truth for all token data
 *
 * All token decimals, symbols, icons, and colors are defined HERE and nowhere else.
 * V2/V3/V4 pool configs reference this data. Frontend receives it via injection.
 */

export interface TokenMetadata {
  address: string;
  symbol: string;
  decimals: number;
  icon: string | null;
  color: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// THE SINGLE SOURCE OF TRUTH FOR ALL TOKEN METADATA
// ═══════════════════════════════════════════════════════════════════════════════

export const TOKEN_METADATA: Record<string, TokenMetadata> = {
  ARBME: {
    address: "0xC647421C5Dc78D1c3960faA7A33f9aEFDF4B7B07",
    symbol: "ARBME",
    decimals: 18,
    icon: "https://arbme.epicdylan.com/arbie.png",
    color: "#10b981"
  },
  USDC: {
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    symbol: "USDC",
    decimals: 6,  // CRITICAL: USDC has 6 decimals, not 18!
    icon: "https://assets.coingecko.com/coins/images/6319/small/usdc.png",
    color: "#2775ca"
  },
  WETH: {
    address: "0x4200000000000000000000000000000000000006",
    symbol: "WETH",
    decimals: 18,
    icon: "https://assets.coingecko.com/coins/images/2518/small/weth.png",
    color: "#627eea"
  },
  PAGE: {
    address: "0xc4730f86d1F86cE0712a7b17EE919Db7dEFad7FE",
    symbol: "PAGE",
    decimals: 8,  // PAGE has 8 decimals
    icon: "https://arbme.epicdylan.com/pagedaologo.png",
    color: "#ff6b35"
  },
  OINC: {
    address: "0x59e058780dd8a6017061596a62288b6438edbe68",
    symbol: "OINC",
    decimals: 18,
    icon: "https://pbs.twimg.com/profile_images/1879950923135967232/8LPTu2Ow_400x400.jpg",
    color: "#ff69b4"
  },
  cbBTC: {
    address: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf",
    symbol: "cbBTC",
    decimals: 8,  // cbBTC has 8 decimals
    icon: "https://assets.coingecko.com/coins/images/40143/small/cbbtc.webp",
    color: "#f7931a"
  },
  CLANKER: {
    address: "0x1bc0c42215582d5a085795f4badbac3ff36d1bcb",
    symbol: "CLANKER",
    decimals: 18,
    icon: null,
    color: "#7a7a8f"
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// DERIVED LOOKUPS (computed from single source)
// ═══════════════════════════════════════════════════════════════════════════════

// Lookup by address (lowercase normalized)
export const TOKEN_BY_ADDRESS: Record<string, TokenMetadata> =
  Object.fromEntries(
    Object.values(TOKEN_METADATA).map(t => [t.address.toLowerCase(), t])
  );

// Legacy compatibility: address → symbol
export const TOKEN_SYMBOLS: Record<string, string> =
  Object.fromEntries(
    Object.values(TOKEN_METADATA).map(t => [t.address.toLowerCase(), t.symbol])
  );

// Legacy compatibility: simple address map
export const TOKENS = {
  PAGE: TOKEN_METADATA.PAGE.address,
  OINC: TOKEN_METADATA.OINC.address,
  CLANKER: TOKEN_METADATA.CLANKER.address,
};

// ═══════════════════════════════════════════════════════════════════════════════
// SAFE LOOKUP FUNCTIONS - Never default to 18!
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get token decimals by address.
 * Returns null if unknown - NEVER defaults to 18.
 * Caller must handle null case explicitly.
 */
export function getTokenDecimals(address: string): number | null {
  if (!address) return null;
  const token = TOKEN_BY_ADDRESS[address.toLowerCase()];
  return token?.decimals ?? null;
}

/**
 * Get token symbol by address.
 * Returns truncated address if unknown.
 */
export function getTokenSymbol(address: string): string {
  if (!address) return "???";
  const token = TOKEN_BY_ADDRESS[address.toLowerCase()];
  return token?.symbol ?? `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Alias for backwards compatibility
export function getTokenSymbolBackend(address: string): string {
  return getTokenSymbol(address);
}

/**
 * Get full token metadata by address.
 * Returns null if unknown.
 */
export function getTokenMetadata(address: string): TokenMetadata | null {
  if (!address) return null;
  return TOKEN_BY_ADDRESS[address.toLowerCase()] ?? null;
}

/**
 * Get token icon URL by symbol or address.
 */
export function getTokenIcon(symbolOrAddress: string): string | null {
  // Try by symbol first
  const bySymbol = TOKEN_METADATA[symbolOrAddress.toUpperCase()];
  if (bySymbol?.icon) return bySymbol.icon;

  // Try by address
  const byAddress = TOKEN_BY_ADDRESS[symbolOrAddress.toLowerCase()];
  return byAddress?.icon ?? null;
}

/**
 * Get token color by symbol or address.
 */
export function getTokenColor(symbolOrAddress: string): string {
  const bySymbol = TOKEN_METADATA[symbolOrAddress.toUpperCase()];
  if (bySymbol?.color) return bySymbol.color;

  const byAddress = TOKEN_BY_ADDRESS[symbolOrAddress.toLowerCase()];
  return byAddress?.color ?? "#7a7a8f"; // Default gray
}
