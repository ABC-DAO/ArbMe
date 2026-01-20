# ArbMe Miniapp Deployment Guide

## What Was Built

A production-ready Farcaster miniapp with:
- Clean TypeScript architecture
- Vite build system
- Hash-based routing (iframe-compatible)
- Three pages: Home, My Pools, Position Detail
- Farcaster SDK integration
- Mobile-first responsive design

## Current Status

✅ **Completed:**
- Frontend architecture and build system
- All pages implemented
- Farcaster SDK integrated (ready() called immediately)
- Built and deployed to `bot/public/app/`
- Server updated to serve miniapp at `/app`
- Placeholder API endpoints added

🔄 **In Progress:**
- Needs testing in Farcaster environment
- Needs real position data from Uniswap subgraph

## Deployment Steps

### 1. Build Frontend

```bash
cd frontend
npm install
npm run build
```

This creates optimized files in `frontend/dist/`.

### 2. Copy to Bot Public Directory

```bash
cp -r frontend/dist/* bot/public/app/
```

### 3. Build and Deploy Bot

```bash
cd bot
npm run build
git add .
git commit -m "Deploy miniapp"
git push railway main
```

## Server Configuration

The server (`bot/src/server.ts`) is configured to:

1. Serve miniapp at `/app` → `public/app/index.html`
2. Serve static assets from `public/`
3. Provide API endpoints:
   - `/pools` - Pool data (working)
   - `/api/positions?wallet=0x...` - User positions (placeholder)
   - `/api/position/:id` - Position detail (placeholder)

## Testing

### Local Testing

```bash
cd bot
npm run dev
# Visit http://localhost:3000/app
```

### Farcaster Testing

1. Deploy to Railway
2. Visit miniapp in Farcaster at configured URL
3. Check browser console for `[ArbMe]` logs
4. Verify SDK ready() is called
5. Check wallet connection
6. Verify pools load correctly

## What to Check

- [ ] Miniapp loads in Farcaster iframe
- [ ] No "ready not called" error in Farcaster debugger
- [ ] Console shows `[ArbMe] SDK ready signal sent`
- [ ] Wallet address appears (if connected)
- [ ] ARBME/WETH and ARBME/CLANKER pools display
- [ ] Navigation works (Home ↔ My Pools)
- [ ] Responsive design works on mobile

## Next Steps

1. **Test in Farcaster**: Deploy to Railway and test in actual Farcaster environment
2. **Implement Positions API**: Add real position fetching from Uniswap subgraph
3. **Add Position Detail**: Implement actual position data fetching
4. **Add Actions**: Implement add/remove liquidity and fee collection

## File Locations

```
frontend/                  # Miniapp source
├── dist/                  # Built files (after npm run build)
├── src/
│   ├── main.ts           # Entry point
│   ├── pages/            # Page components
│   ├── services/         # API and wallet
│   └── styles/           # CSS
└── package.json

bot/
├── public/
│   └── app/              # Deployed miniapp (copy of frontend/dist)
├── src/
│   └── server.ts         # Express server
└── dist/                 # Compiled server (after npm run build)
```

## Troubleshooting

**Miniapp not loading:**
- Check Railway logs for errors
- Verify `/app` endpoint is serving correct file
- Check browser console for errors

**JavaScript not executing:**
- Verify build completed successfully
- Check that `assets/*.js` files are accessible
- Verify Vite build includes all dependencies

**SDK errors:**
- Ensure `sdk.actions.ready()` is called early in init()
- Check Farcaster manifest is configured correctly
- Verify miniapp URL matches manifest

## Architecture Principles

Every file follows:
- Under 200 lines
- Full TypeScript types
- JSDoc comments
- Single responsibility
- No framework bloat
- Mobile-first design

Quality is not just the aim, it's the path we take to get there.
