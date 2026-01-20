# ArbMe Miniapp Architecture

> **Quality First:** This miniapp is designed to be publishable open-source software with clean architecture, proper separation of concerns, and maintainable code.

## Tech Stack

- **Build Tool:** Vite (fast, modern, simple)
- **Framework:** Vanilla TypeScript (no framework overhead, direct control)
- **Styling:** CSS modules (scoped, maintainable)
- **State:** Simple reactive store pattern
- **Routing:** Hash-based client-side routing
- **SDK:** Farcaster Miniapp SDK
- **RPC:** Viem for Ethereum interactions

## Directory Structure

```
frontend/
├── src/
│   ├── main.ts                 # App entry point, SDK initialization
│   ├── router.ts               # Client-side routing
│   ├── store.ts                # Global state management
│   │
│   ├── pages/
│   │   ├── Home.ts             # ARBME/WETH & ARBME/CLANKER pools
│   │   ├── MyPools.ts          # User's LP positions
│   │   └── PositionDetail.ts  # Single position details
│   │
│   ├── components/
│   │   ├── PoolCard.ts         # Reusable pool display
│   │   ├── PositionCard.ts     # Reusable position display
│   │   ├── Header.ts           # App header with navigation
│   │   └── LoadingSpinner.ts  # Loading state
│   │
│   ├── services/
│   │   ├── api.ts              # API calls to Railway backend
│   │   ├── wallet.ts           # Farcaster wallet integration
│   │   └── contracts.ts        # Smart contract interactions
│   │
│   ├── utils/
│   │   ├── format.ts           # Number/currency formatting
│   │   ├── constants.ts        # Token addresses, pool configs
│   │   └── types.ts            # TypeScript interfaces
│   │
│   └── styles/
│       ├── global.css          # Global styles, CSS variables
│       ├── Home.module.css     # Page-specific styles
│       ├── MyPools.module.css
│       └── PositionDetail.module.css
│
├── public/
│   ├── arbie.png               # Favicon and logos
│   └── share-image.png
│
├── index.html                  # Entry HTML
├── vite.config.ts              # Vite configuration
├── tsconfig.json               # TypeScript configuration
└── package.json                # Dependencies
```

## Core Principles

### 1. Component-Based Architecture
Each component is a TypeScript function that returns an HTML string:

```typescript
interface PoolCardProps {
  pair: string;
  tvl: number;
  volume24h: number;
  priceUsd: string;
}

export function PoolCard(props: PoolCardProps): string {
  return `
    <div class="pool-card">
      <h3>${props.pair}</h3>
      <div class="pool-stats">
        <span>TVL: ${formatUsd(props.tvl)}</span>
        <span>24h Vol: ${formatUsd(props.volume24h)}</span>
      </div>
    </div>
  `;
}
```

### 2. Simple State Management
Reactive store pattern with subscribers:

```typescript
// store.ts
class Store {
  private state = {
    wallet: null as string | null,
    pools: [] as Pool[],
    positions: [] as Position[],
  };

  private subscribers = new Set<() => void>();

  subscribe(fn: () => void) {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }

  setState(partial: Partial<typeof this.state>) {
    this.state = { ...this.state, ...partial };
    this.subscribers.forEach(fn => fn());
  }

  getState() {
    return this.state;
  }
}

export const store = new Store();
```

### 3. Hash-Based Routing
Simple, works in iframes, no server config needed:

```typescript
// router.ts
const routes = {
  '/': () => HomePage(),
  '/positions': () => MyPoolsPage(),
  '/position/:id': (id: string) => PositionDetailPage(id),
};

export function navigate(path: string) {
  window.location.hash = path;
}

window.addEventListener('hashchange', () => {
  const path = window.location.hash.slice(1) || '/';
  render(path);
});
```

### 4. Farcaster SDK Integration
Call `ready()` immediately, load data async:

```typescript
// main.ts
import { sdk } from '@farcaster/miniapp-sdk';

async function init() {
  // CRITICAL: Signal ready immediately
  await sdk.actions.ready();

  // Then load data
  const context = await sdk.context;
  if (context?.user) {
    const wallet = getWalletAddress(context.user);
    store.setState({ wallet });
  }

  // Initialize routing
  initRouter();
}

init();
```

## Pages

### Home Page (`/`)
**Purpose:** Show the two primary ARBME pools

**Data:**
- ARBME/WETH pool (fetch from `/pools` API)
- ARBME/CLANKER pool (fetch from `/pools` API)

**Display:**
- Pool pair name
- Current price
- 24h price change
- Total TVL
- 24h volume
- Link to add liquidity (future feature)

**Layout:**
```
┌─────────────────────────────────┐
│  ArbMe                    [Menu]│
├─────────────────────────────────┤
│  Primary Pools                  │
│                                 │
│  ┌─────────────────────────┐   │
│  │ ARBME / WETH            │   │
│  │ $0.000001234            │   │
│  │ +5.2% · TVL: $15.2k     │   │
│  │ 24h Vol: $2.1k          │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │ ARBME / CLANKER         │   │
│  │ 1 ARBME = 0.00003 CLNKR │   │
│  │ -2.1% · TVL: $8.4k      │   │
│  │ 24h Vol: $890           │   │
│  └─────────────────────────┘   │
│                                 │
│  [View All Pools] [My Pools]   │
└─────────────────────────────────┘
```

### My Pools Page (`/positions`)
**Purpose:** Show user's LP positions across all pools

**Data:**
- Fetch user positions from `/api/positions?wallet={address}`
- Display V2, V3, V4 positions
- Show current value and P&L

**Layout:**
```
┌─────────────────────────────────┐
│  ← Back      My Positions       │
├─────────────────────────────────┤
│  Connected: 0x1234...5678       │
│                                 │
│  ┌─────────────────────────┐   │
│  │ ARBME / WETH (V4)       │   │
│  │ Liquidity: $125.50      │   │
│  │ Fees Earned: $2.34      │   │
│  │ Range: $0.0001 - $0.001 │   │
│  │ [View Details →]        │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │ ARBME / CLANKER (V2)    │   │
│  │ Liquidity: $50.00       │   │
│  │ Fees Earned: $0.15      │   │
│  │ [View Details →]        │   │
│  └─────────────────────────┘   │
└─────────────────────────────────┘
```

### Position Detail Page (`/position/:id`)
**Purpose:** Detailed view of a single position

**Data:**
- Position details (tokens, amounts, range)
- Current value
- Fees earned
- Historical performance (if available)

**Actions:**
- Add more liquidity
- Remove liquidity
- Collect fees

**Layout:**
```
┌─────────────────────────────────┐
│  ← Back    Position #12345      │
├─────────────────────────────────┤
│  ARBME / WETH · Uniswap V4      │
│                                 │
│  Your Liquidity: $125.50        │
│  Uncollected Fees: $2.34        │
│                                 │
│  Position Details:              │
│  • 1,000,000 ARBME              │
│  • 0.05 WETH                    │
│                                 │
│  Price Range:                   │
│  • Min: 1 ARBME = 0.00001 WETH  │
│  • Max: 1 ARBME = 0.0001 WETH   │
│  • Current: 1 ARBME = 0.00005   │
│                                 │
│  In Range: ✓ Yes                │
│                                 │
│  [Add Liquidity]                │
│  [Remove Liquidity]             │
│  [Collect Fees]                 │
└─────────────────────────────────┘
```

## API Integration

All data comes from Railway backend:

### Endpoints
- `GET /pools` - All ARBME pools with metrics
- `GET /api/positions?wallet={address}` - User's positions
- `GET /api/position/{id}` - Single position details

### Error Handling
```typescript
async function fetchPools(): Promise<Pool[]> {
  try {
    const res = await fetch('/pools');
    if (!res.ok) throw new Error('Failed to fetch');
    return await res.json();
  } catch (err) {
    console.error('Fetch pools error:', err);
    // Show user-friendly error
    showError('Unable to load pools. Please try again.');
    return [];
  }
}
```

## Styling Strategy

### CSS Variables (Dark Theme)
```css
:root {
  --bg-primary: #0a0a0f;
  --bg-secondary: #0f0f18;
  --bg-card: #12121c;
  --border: #1f1f2f;
  --text-primary: #e8e8f2;
  --text-secondary: #7a7a8f;
  --accent: #10b981;
  --positive: #22c55e;
  --negative: #ef4444;
}
```

### Mobile-First Responsive
```css
/* Base: Mobile */
.pool-card {
  padding: 1rem;
}

/* Desktop */
@media (min-width: 768px) {
  .pool-card {
    padding: 1.5rem;
  }
}
```

## Build Process

### Development
```bash
npm run dev
# Vite dev server at http://localhost:5173
# Hot reload enabled
```

### Production Build
```bash
npm run build
# Output to dist/
# Single bundled JS file
# Minified and optimized
```

### Deploy to Railway
```bash
# Copy built files to bot/public/
cp -r frontend/dist/* bot/public/app/

# Server serves from bot/public/app/
# URL: arbme.epicdylan.com/app
```

## Testing Strategy

### Manual Testing Checklist
- [ ] Farcaster SDK ready() called immediately
- [ ] Wallet auto-connects from Farcaster context
- [ ] Pools load and display correctly
- [ ] Navigation between pages works
- [ ] Mobile responsive (320px - 1200px)
- [ ] Error states show user-friendly messages
- [ ] Loading states prevent layout shift

### Browser Testing
- [ ] Chrome (latest)
- [ ] Safari iOS (Farcaster mobile)
- [ ] Warpcast desktop client

## Documentation

### Code Comments
Every function has JSDoc:
```typescript
/**
 * Formats a USD value with appropriate precision
 * @param value - Number to format
 * @returns Formatted string like "$1.23K" or "$1.23M"
 */
export function formatUsd(value: number): string {
  // Implementation
}
```

### README.md
- Quick start guide
- Development setup
- Architecture overview
- Deployment instructions

## Future Enhancements

Phase 2:
- Add liquidity flow
- Remove liquidity flow
- Swap interface

Phase 3:
- Historical charts
- Position analytics
- Notifications

## Success Criteria

- [ ] Clean, readable code (<200 lines per file)
- [ ] No console errors in production
- [ ] Fast load time (<2s)
- [ ] Smooth navigation
- [ ] Works reliably in Farcaster iframe
- [ ] Publishable on GitHub with confidence
