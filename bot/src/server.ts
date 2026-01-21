/**
 * ArbMe Unified Server - SIMPLIFIED
 * - Serves API endpoints (/pools)
 * - Serves Farcaster miniapp (/app)
 * - Serves landing page (/)
 * - NO BOT, NO TRANSACTIONS - Pure display only
 * Updated: 2026-01-21
 */

import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { fetchPools } from '@arbme/core-lib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

console.log('[Server] Running as display-only miniapp (bot disabled)');

// ═══════════════════════════════════════════════════════════════════════════════
// API ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'display-only',
    uptime: process.uptime()
  });
});

// Version check
app.get('/version', (req, res) => {
  res.json({
    version: '2.0.0-simplified',
    features: {
      displayOnly: true,
      botDisabled: true,
    },
    env: {
      hasAlchemyKey: !!process.env.ALCHEMY_API_KEY,
    },
  });
});

// Pools API - Only endpoint we need
const poolsHandler = async (req: any, res: any) => {
  try {
    const alchemyKey = process.env.ALCHEMY_API_KEY;
    const data = await fetchPools(alchemyKey);
    res.json(data);
  } catch (error) {
    console.error('[Server] Failed to fetch pools:', error);
    res.status(500).json({ error: 'Failed to fetch pools' });
  }
};
app.get('/pools', poolsHandler);
app.get('/app/api/pools', poolsHandler);

// ═══════════════════════════════════════════════════════════════════════════════
// FARCASTER MINIAPP
// ═══════════════════════════════════════════════════════════════════════════════

// Farcaster manifest
app.get('/.well-known/farcaster.json', (req, res) => {
  res.json({
    accountAssociation: {
      header: "eyJmaWQiOjg1NzMsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHg1Mjk0MjMzMTViMTVEQTk2OTFBYkM1QjdjMWNiMEQwNDUwOUIyMmIwIn0",
      payload: "eyJkb21haW4iOiJhcmJtZS5lcGljZHlsYW4uY29tIn0",
      signature: "jj5/abViEfDDlZ8R3d/AkrX/DfG1T6hrwCTfE2zyWSFLmmGvuwRylt5OUc4ndbwI4eQ9xjAlL3Y7TFsEELUjExw="
    },
    miniapp: {
      version: "1",
      name: "ArbMe",
      iconUrl: "https://arbme.epicdylan.com/arbie.png",
      homeUrl: "https://arbme.epicdylan.com/app",
      imageUrl: "https://arbme.epicdylan.com/share-image.png",
      splashImageUrl: "https://arbme.epicdylan.com/arbie.png",
      splashBackgroundColor: "#0a0a0f",
      buttonTitle: "View Pools",
      subtitle: "Permissionless Arb Routes",
      description: "An ERC20 token that pairs with other tokens to create arb routes. View pools and track $ARBME.",
      primaryCategory: "finance",
      tags: ["defi", "arbitrage", "liquidity", "base"],
      tagline: "LP to earn. Arb to profit.",
      heroImageUrl: "https://arbme.epicdylan.com/share-image.png",
      screenshotUrls: ["https://arbme.epicdylan.com/share-image.png"],
      ogTitle: "ArbMe - Permissionless Arb",
      ogDescription: "An ERC20 token that pairs with other tokens to create arb routes. No deals. No permission. Just LP.",
      ogImageUrl: "https://arbme.epicdylan.com/share-image.png"
    }
  });
});

// Start Next.js server in background
let nextProcess: any = null;

function startNextServer() {
  console.log('[Server] Starting Next.js server...');

  nextProcess = spawn('node', ['packages/nextjs/.next/standalone/packages/nextjs/server.js'], {
    cwd: path.join(__dirname, '../..'),
    stdio: 'inherit',
    env: { ...process.env, PORT: '3001', HOSTNAME: 'localhost' }
  });

  nextProcess.on('exit', (code: number) => {
    console.log(`[Server] Next.js server exited with code ${code}`);
    if (code !== 0) {
      console.log('[Server] Restarting Next.js server in 5 seconds...');
      setTimeout(startNextServer, 5000);
    }
  });
}

startNextServer();

// Proxy /_next/* static assets to Next.js
app.use('/_next', createProxyMiddleware({
  target: 'http://localhost:3001',
  changeOrigin: true,
}));

// Proxy /app/* requests to Next.js
app.use('/app', createProxyMiddleware({
  target: 'http://localhost:3001',
  changeOrigin: true,
  pathRewrite: {
    '^/app': '', // Strip /app prefix
  },
}));

// ═══════════════════════════════════════════════════════════════════════════════
// LANDING PAGE
// ═══════════════════════════════════════════════════════════════════════════════

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Root - landing page
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ═══════════════════════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, () => {
  console.log(`[Server] ArbMe server running on port ${PORT}`);
  console.log(`[Server] Mode: Display-only (bot disabled)`);
  console.log(`[Server] API: http://localhost:${PORT}/pools`);
  console.log(`[Server] Miniapp: http://localhost:${PORT}/app`);
  console.log(`[Server] Landing: http://localhost:${PORT}/`);
});
