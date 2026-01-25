# Pool Creation Architecture

This document describes how the ArbMe application creates Uniswap V2/V3/V4 pools and adds liquidity.

## Overview

The pool creation system builds raw transaction data for Uniswap protocol interactions. It does NOT send transactions directly - it returns transaction objects that the frontend sends via the user's wallet.

**Core file:** `src/pool-creation.ts` (531 lines)

## Contract Addresses (Base Mainnet)

| Protocol | Contract | Address |
|----------|----------|---------|
| V2 | Factory | `0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6` |
| V2 | Router | `0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24` |
| V3 | Factory | `0x33128a8fC17869897dcE68Ed026d694621f6FDfD` |
| V3 | Position Manager | `0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1` |
| V4 | Pool Manager | `0x498581ff718922c3f8e6a244956af099b2652b2b` |
| V4 | Position Manager | `0x7c5f5a4bbd8fd63184577525326123b519429bdc` |
| V4 | State View | `0xa3c0c9b65bad0b08107aa264b0f3db444b867a71` |

## Transaction Flow

### Frontend Flow (NextJS App)

```
User Input -> Check Pool Exists -> Build Transactions -> Send via Wallet
```

**File:** `packages/nextjs/app/add-liquidity/page.tsx`

1. User selects protocol version (V2/V3/V4)
2. User selects token pair
3. User selects fee tier (V3/V4 only)
4. User enters deposit amounts
5. Frontend checks if pool exists via `/api/check-pool-exists`
6. On submit, frontend calls `/api/build-create-pool`
7. Frontend sends returned transactions sequentially via Farcaster wallet SDK

### API Endpoint Flow

**Endpoint:** `/api/build-create-pool`

**Request:**
```json
{
  "version": "v2" | "v3" | "v4",
  "token0": "0x...",
  "token1": "0x...",
  "amount0": "1000000000000000000",
  "amount1": "500000000000000000",
  "fee": 3000,           // V3/V4 only
  "price": 0.5,          // Initial price ratio
  "recipient": "0x..."
}
```

**Response:**
```json
{
  "transactions": [
    { "to": "0x...", "data": "0x...", "value": "0" },
    { "to": "0x...", "data": "0x...", "value": "0" }
  ]
}
```

## V2 Pool Creation

### Single Transaction

V2 uses a single `addLiquidity` call that creates the pool if it doesn't exist.

```typescript
// Function: buildV2CreatePoolTransaction()
// Contract: V2_ROUTER
// Selector: 0xe8e33700 (addLiquidity)
```

**Function signature:**
```solidity
addLiquidity(
  address tokenA,
  address tokenB,
  uint256 amountADesired,
  uint256 amountBDesired,
  uint256 amountAMin,
  uint256 amountBMin,
  address to,
  uint256 deadline
)
```

**Key characteristics:**
- Token order doesn't matter (router sorts internally)
- Pool is created automatically if it doesn't exist
- Initial price set by `amountA / amountB` ratio
- LP tokens sent to `to` address

### Pool Existence Check

```typescript
// Function: checkV2PoolExists()
// Contract: V2_FACTORY
// Selector: 0xe6a43905 (getPair)
```

Returns zero address if pool doesn't exist.

## V3 Pool Creation

### Two Transactions Required

1. **Initialize pool** (if new)
2. **Mint position**

### Transaction 1: Initialize Pool

```typescript
// Function: buildV3InitializePoolTransaction()
// Contract: V3_POSITION_MANAGER
// Selector: 0x13ead562 (createAndInitializePoolIfNecessary)
```

**Function signature:**
```solidity
createAndInitializePoolIfNecessary(
  address token0,
  address token1,
  uint24 fee,
  uint160 sqrtPriceX96
)
```

**Key characteristics:**
- Tokens MUST be sorted (`token0 < token1` lexicographically)
- Price encoded as sqrtPriceX96 format
- No-op if pool already exists with same sqrtPriceX96

### Transaction 2: Mint Position

```typescript
// Function: buildV3MintPositionTransaction()
// Contract: V3_POSITION_MANAGER
// Selector: 0x88316456 (mint)
```

**Function signature:**
```solidity
mint(MintParams calldata params)

struct MintParams {
  address token0;
  address token1;
  uint24 fee;
  int24 tickLower;
  int24 tickUpper;
  uint256 amount0Desired;
  uint256 amount1Desired;
  uint256 amount0Min;
  uint256 amount1Min;
  address recipient;
  uint256 deadline;
}
```

**Key characteristics:**
- Creates full-range position (minTick to maxTick)
- Tick range calculated from fee tier's tick spacing
- Returns NFT position token to recipient

### Pool Existence Check

```typescript
// Function: checkV3PoolExists()
// Contract: V3_FACTORY
// Selector: 0x1698ee82 (getPool)
```

## V4 Pool Creation

### Two Transactions Required

1. **Initialize pool**
2. **Mint position via modifyLiquidities**

### Transaction 1: Initialize Pool

```typescript
// Function: buildV4InitializePoolTransaction()
// Contract: V4_POOL_MANAGER
// Selector: 0x16569d93 (initialize)
```

**Function signature:**
```solidity
initialize(PoolKey calldata key, uint160 sqrtPriceX96)

struct PoolKey {
  Currency currency0;
  Currency currency1;
  uint24 fee;
  int24 tickSpacing;
  IHooks hooks;
}
```

**Key characteristics:**
- Tokens MUST be sorted
- Requires tick spacing (derived from fee tier)
- Hooks address (currently hardcoded to zero address)

### Transaction 2: Mint Position

```typescript
// Function: buildV4MintPositionTransaction()
// Contract: V4_POSITION_MANAGER
// Selector: 0x8436b6f5 (modifyLiquidities)
```

V4 uses a different paradigm - actions are batched and executed atomically.

**Key characteristics:**
- Uses action encoding (not direct function params)
- Full-range position (calculated from tick spacing)
- More complex encoding than V3

### Pool Existence Check

```typescript
// Function: checkV4PoolExists()
// Contract: V4_STATE_VIEW
// Selector: 0x98e5b12a (getSlot0)
```

Requires calculating poolId from PoolKey hash:
```typescript
poolId = keccak256(abi.encode(token0, token1, fee, tickSpacing, hooks))
```

Pool exists if `sqrtPriceX96 > 0`.

## Mathematical Utilities

### Token Sorting

```typescript
// Function: sortTokens()
// V3/V4 REQUIRE token0 < token1 (lowercase comparison)
function sortTokens(tokenA, tokenB): [token0, token1] {
  return tokenA.toLowerCase() < tokenB.toLowerCase()
    ? [tokenA, tokenB]
    : [tokenB, tokenA];
}
```

### sqrtPriceX96 Calculation

```typescript
// Function: calculateSqrtPriceX96()
// Converts price ratio to Q64.96 fixed-point format
sqrtPriceX96 = sqrt(price) * 2^96
```

**Implementation uses scaling to avoid precision loss:**
```typescript
const Q64 = 2n ** 64n;
const scaledPrice = price * Number(Q64);
const sqrtScaledPrice = Math.sqrt(scaledPrice);
return BigInt(Math.floor(sqrtScaledPrice)) * Q64;
```

### Tick Range Calculation

```typescript
// Function: getTickRange()
// Full-range positions use min/max valid ticks for the spacing
const MAX_TICK = 887272;
const minTick = Math.ceil(-MAX_TICK / tickSpacing) * tickSpacing;
const maxTick = Math.floor(MAX_TICK / tickSpacing) * tickSpacing;
```

## Fee Tier to Tick Spacing Mapping

```typescript
const FEE_TO_TICK_SPACING = {
  100: 1,      // 0.01%
  500: 10,     // 0.05%
  3000: 60,    // 0.30%
  10000: 200,  // 1.00%
}
```

## Approval Handling

Before adding liquidity, tokens must be approved for the appropriate spender:

```typescript
// Function: buildApproveTransaction()
// Approves max uint256 for spender
data = '0x095ea7b3' + spender.padStart(64, '0') + 'f'.repeat(64)
```

**Spenders by version:**
- V2: V2_ROUTER
- V3: V3_POSITION_MANAGER
- V4: V4_POSITION_MANAGER

## Known Issues

### 1. Approval Flow Not Implemented

The frontend has a TODO comment at line 167:
```typescript
// TODO: Check and handle approvals
// For now, go straight to creating
```

**Impact:** Users may see failed transactions if they haven't pre-approved tokens.

**Fix needed:**
1. Check current allowance via `getTokenAllowance()`
2. If insufficient, prepend approval transaction(s) to the transaction array

### 2. No Transaction Confirmation Handling

The frontend sends transactions sequentially but doesn't wait for confirmation:
```typescript
for (const tx of transactions) {
  await sendTransaction(tx)  // Returns hash, doesn't wait for confirmation
}
```

**Impact:** Second transaction (mint) may fail if first (initialize) hasn't been mined yet.

**Fix needed:** Wait for transaction receipt before sending next transaction.

### 3. V4 Hook Support Hardcoded to Zero

```typescript
// In buildV4InitializePoolTransaction():
'0000000000000000000000000000000000000000000000000000000000000000'; // hooks = 0x0
```

**Impact:** Cannot create pools with custom hooks.

### 4. Slippage Calculation Issues

```typescript
const amount0Min = BigInt(Math.floor(Number(params.amount0) * slippageMultiplier));
```

**Potential issue:** `Number()` conversion may lose precision for large token amounts.

### 5. RPC Fallback Mechanism

```typescript
const BASE_RPCS_FALLBACK = [...];
let fallbackRpcIndex = 0;

// Only rotates index on non-Alchemy failures
if (!_alchemyKey) {
  fallbackRpcIndex = (fallbackRpcIndex + 1) % BASE_RPCS_FALLBACK.length;
}
```

**Issue:** Index rotation is global state, not per-request. Concurrent requests may conflict.

## Frontend Integration

### State Management

```typescript
// add-liquidity/page.tsx
const [version, setVersion] = useState<Version>('V3')
const [token0Address, setToken0Address] = useState(ARBME_ADDRESS)
const [token1Address, setToken1Address] = useState(WETH_ADDRESS)
const [amount0, setAmount0] = useState('')
const [amount1, setAmount1] = useState('')
const [fee, setFee] = useState(3000)  // 0.3% default
const [poolExists, setPoolExists] = useState<boolean | null>(null)
```

### Transaction Status

```typescript
type TxStatus = 'idle' | 'checking' | 'approving' | 'creating' | 'success' | 'error'
```

### Wallet Integration

Uses Farcaster MiniApp SDK:
```typescript
const provider = await sdk.wallet.getEthereumProvider()
const txHash = await provider.request({
  method: 'eth_sendTransaction',
  params: [{ from, to, data, value }]
})
```

## Recommendations for Improvement

1. **Implement approval flow**: Check allowances, prepend approval txs
2. **Wait for confirmations**: Use receipt polling between transactions
3. **Add transaction simulation**: Use `eth_call` to catch errors before sending
4. **Support custom hooks**: Allow V4 hooks address parameter
5. **Use BigInt throughout**: Avoid Number() for token amounts
6. **Add retry logic**: Handle RPC failures gracefully
7. **Validate inputs**: Check token addresses, amounts > 0, valid fee tiers
8. **Show gas estimates**: Help users understand transaction costs
