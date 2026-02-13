# @arbme/mcp-server

## Environment variables

Create a `.env` file in this package directory based on `.env.example`.

Required for most runs:
- `CN_AGENT_PRIVATE_KEY`: ERC-8004 agent private key (hex, with or without `0x`).
- `NEYNAR_API_KEY`: Neynar API key.
- `NEYNAR_SIGNER_UUID`: Neynar managed signer UUID.
- `NEYNAR_FID`: Farcaster FID used for notifications.
- `ARBME_PRIVATE_KEY`: Private key for DeFi wallet (hex, with or without `0x`).

Optional / defaults:
- `CN_MAX_CROSSPOST`: Max posts to crosspost per run. Defaults to `3`.
- `CN_CHANNEL_ID`: Farcaster channel ID for crosspost. Optional.
- `BASE_RPC_URL`: Base RPC URL for on-chain reads. Defaults to `https://mainnet.base.org`.
