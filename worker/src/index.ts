/**
 * ArbMe API Worker
 * Caching proxy for DexScreener API to minimize external API calls
 */

interface Env {
  ARBME_TOKEN: string;
  CACHE_TTL: string;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // Route: /pools - Get all ARBME pools from DexScreener
    if (url.pathname === "/pools" || url.pathname === "/") {
      return handlePools(request, env, ctx);
    }

    // Route: /health - Health check
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ status: "ok", token: env.ARBME_TOKEN }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    return new Response("Not Found", { status: 404, headers: CORS_HEADERS });
  },
};

async function handlePools(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const cache = caches.default;
  const cacheKey = new Request(new URL("/pools", request.url).toString(), request);
  const cacheTtl = parseInt(env.CACHE_TTL) || 60;

  // Check cache first
  let response = await cache.match(cacheKey);
  if (response) {
    // Add cache hit header
    const headers = new Headers(response.headers);
    headers.set("X-Cache", "HIT");
    return new Response(response.body, { headers });
  }

  // Fetch from DexScreener
  try {
    const dexScreenerUrl = `https://api.dexscreener.com/latest/dex/tokens/${env.ARBME_TOKEN}`;
    const apiResponse = await fetch(dexScreenerUrl, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "ArbMe-API/1.0",
      },
    });

    if (!apiResponse.ok) {
      throw new Error(`DexScreener API error: ${apiResponse.status}`);
    }

    const data = await apiResponse.json() as { pairs?: DexScreenerPair[] };

    // Transform the data for our frontend
    const pools = (data.pairs || []).map((pair: DexScreenerPair) => ({
      pair: `${pair.baseToken?.symbol || "?"}/${pair.quoteToken?.symbol || "?"}`,
      pairAddress: pair.pairAddress,
      dex: pair.dexId || "Unknown",
      tvl: pair.liquidity?.usd || 0,
      volume24h: pair.volume?.h24 || 0,
      priceUsd: pair.priceUsd || "0",
      priceChange24h: pair.priceChange?.h24 || 0,
      url: pair.url || `https://dexscreener.com/base/${pair.pairAddress}`,
      baseToken: pair.baseToken,
      quoteToken: pair.quoteToken,
    }));

    // Sort by TVL descending
    pools.sort((a: Pool, b: Pool) => (b.tvl || 0) - (a.tvl || 0));

    const responseData = {
      token: env.ARBME_TOKEN,
      poolCount: pools.length,
      totalTvl: pools.reduce((sum: number, p: Pool) => sum + (p.tvl || 0), 0),
      pools,
      lastUpdated: new Date().toISOString(),
    };

    response = new Response(JSON.stringify(responseData), {
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/json",
        "Cache-Control": `public, max-age=${cacheTtl}`,
        "X-Cache": "MISS",
      },
    });

    // Store in cache
    ctx.waitUntil(cache.put(cacheKey, response.clone()));

    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Failed to fetch pool data", details: errorMessage }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
}

interface DexScreenerPair {
  pairAddress: string;
  baseToken?: { symbol: string; address: string; name: string };
  quoteToken?: { symbol: string; address: string; name: string };
  dexId?: string;
  liquidity?: { usd: number };
  volume?: { h24: number };
  priceUsd?: string;
  priceChange?: { h24: number };
  url?: string;
}

interface Pool {
  tvl: number;
}
