# ArbMe Miniapp

A Farcaster miniapp for managing liquidity pool positions on Base.

## Features

- **Pool Overview**: View key ARBME pools (ARBME/WETH, ARBME/CLANKER)
- **My Positions**: Track your liquidity provider positions
- **Position Details**: Detailed view of individual positions with metrics
- **Wallet Integration**: Auto-connects via Farcaster SDK

## Tech Stack

- **TypeScript**: Strict type safety
- **Vite**: Modern build tooling
- **Farcaster SDK**: Native miniapp integration
- **Vanilla JS**: No framework overhead
- **Hash-based Routing**: Works in iframe contexts

## Project Structure

```
frontend/
├── src/
│   ├── main.ts              # App entry point
│   ├── router.ts            # Hash-based routing
│   ├── store.ts             # State management
│   ├── pages/               # Page components
│   │   ├── Home.ts          # Pool overview
│   │   ├── MyPools.ts       # User positions
│   │   └── PositionDetail.ts
│   ├── services/            # External integrations
│   │   ├── api.ts           # Backend API
│   │   └── wallet.ts        # Farcaster wallet
│   ├── utils/               # Utilities
│   │   ├── types.ts         # TypeScript types
│   │   ├── constants.ts     # App constants
│   │   └── format.ts        # Formatters
│   └── styles/              # CSS modules
│       ├── global.css
│       └── components.css
├── index.html               # Entry HTML
├── vite.config.ts           # Build config
└── package.json
```

## Development

```bash
# Install dependencies
npm install

# Start dev server (proxies to Railway backend)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed design documentation.

## Quality Standards

Every file follows these principles:
- ✅ Under 200 lines
- ✅ Full TypeScript types
- ✅ JSDoc comments
- ✅ Single responsibility
- ✅ No framework bloat
- ✅ Mobile-first design

## Deployment

Built files in `dist/` are deployed to Railway alongside the bot and API.

## License

MIT
