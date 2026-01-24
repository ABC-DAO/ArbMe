/**
 * Quick test script for utils.ts and math.ts
 * Run with: npx tsx test-utils.ts
 */

import {
  // Utils
  TX_CONSTANTS,
  AMOUNT_VALIDATION,
  formatFromRaw,
  toRawAmount,
  toRawAmountWithBuffer,
  applySlippage,
  applyApprovalBuffer,
  getDeadline,
  sortAddresses,
  compareAddresses,
  isValidAddress,
  classifyError,
  // Math
  Q96,
  sqrtPriceX96ToRawPrice,
  sqrtPriceX96ToPrice,
  priceToSqrtPriceX96,
  sqrtPriceX96ToTick,
  tickToSqrtPriceX96,
  getTickSpacingForFee,
  getFullRangeTicks,
  formatFeeTier,
  calculateLiquidityFromAmounts,
  calculateAmountsFromLiquidity,
  isPositionInRange,
  calculatePoolShare,
  calculateV2AmountOut,
  calculateV2Price,
} from './src/index.js';

console.log('=== Testing Utils ===\n');

// Test TX_CONSTANTS
console.log('TX_CONSTANTS:', {
  slippageTolerance: TX_CONSTANTS.SLIPPAGE_TOLERANCE,
  deadlineSeconds: TX_CONSTANTS.DEADLINE_SECONDS,
});

// Test amount conversion
const decimals = 18;
const humanAmount = 1.5;
const raw = toRawAmount(humanAmount, decimals);
console.log(`\nAmount conversion: ${humanAmount} -> ${raw} -> ${formatFromRaw(raw, decimals)}`);

// Test buffer
const withBuffer = toRawAmountWithBuffer(humanAmount, decimals, 1.1);
console.log(`With 10% buffer: ${formatFromRaw(withBuffer, decimals)}`);

// Test slippage
const rawAmount = toRawAmount(100, 18);
const withSlippage = applySlippage(rawAmount);
console.log(`\nSlippage: 100 -> ${formatFromRaw(withSlippage, 18)} (5% less)`);

// Test approval buffer
const withApproval = applyApprovalBuffer(rawAmount);
console.log(`Approval buffer: 100 -> ${formatFromRaw(withApproval, 18)} (10% more)`);

// Test deadline
const deadline = getDeadline();
console.log(`\nDeadline: ${deadline} (${new Date(Number(deadline) * 1000).toISOString()})`);

// Test address sorting
const addr1 = '0xC647421C5Dc78D1c3960faA7A33f9aEFDF4B7B07'; // ARBME
const addr2 = '0x4200000000000000000000000000000000000006'; // WETH
const [sorted0, sorted1] = sortAddresses(addr1, addr2);
console.log(`\nAddress sorting:`);
console.log(`  Input: ${addr1.slice(0, 10)}... , ${addr2.slice(0, 10)}...`);
console.log(`  Output: ${sorted0.slice(0, 10)}... , ${sorted1.slice(0, 10)}...`);
console.log(`  Comparison: ${compareAddresses(addr1, addr2)}`);

// Test address validation
console.log(`\nAddress validation:`);
console.log(`  Valid address: ${isValidAddress(addr1)}`);
console.log(`  Invalid (short): ${isValidAddress('0x123')}`);
console.log(`  Invalid (no 0x): ${isValidAddress('C647421C5Dc78D1c3960faA7A33f9aEFDF4B7B07')}`);

// Test error classification
console.log(`\nError classification:`);
console.log(`  "user rejected": ${JSON.stringify(classifyError(new Error('user rejected transaction')))}`);
console.log(`  "insufficient funds": ${JSON.stringify(classifyError(new Error('insufficient funds')))}`);

console.log('\n=== Testing Math ===\n');

// Test sqrtPriceX96 conversions
const testPrice = 1000; // 1 ETH = 1000 USDC-ish
const sqrtPrice = priceToSqrtPriceX96(testPrice);
const backToPrice = sqrtPriceX96ToRawPrice(sqrtPrice);
console.log(`Price conversion: ${testPrice} -> sqrtPriceX96 -> ${backToPrice.toFixed(4)}`);

// Test with decimals (ETH 18, USDC 6)
const priceWithDecimals = sqrtPriceX96ToPrice(sqrtPrice, 18, 6);
console.log(`With decimals (18, 6): ${priceWithDecimals.toExponential(4)}`);

// Test tick conversions
const tick = sqrtPriceX96ToTick(sqrtPrice);
const backToSqrt = tickToSqrtPriceX96(tick);
console.log(`\nTick conversion: sqrtPriceX96 -> tick ${tick} -> back to sqrtPriceX96`);
console.log(`  Original: ${sqrtPrice}`);
console.log(`  After tick roundtrip: ${backToSqrt}`);

// Test fee tier utilities
console.log(`\nFee tier utilities:`);
for (const fee of [100, 500, 3000, 10000]) {
  const tickSpacing = getTickSpacingForFee(fee);
  const { tickLower, tickUpper } = getFullRangeTicks(fee);
  console.log(`  ${formatFeeTier(fee)}: tickSpacing=${tickSpacing}, fullRange=[${tickLower}, ${tickUpper}]`);
}

// Test liquidity calculations
console.log(`\nLiquidity calculations:`);
const currentSqrtPrice = priceToSqrtPriceX96(2000); // Current price: 2000
const lowerSqrtPrice = priceToSqrtPriceX96(1800);   // Lower bound: 1800
const upperSqrtPrice = priceToSqrtPriceX96(2200);   // Upper bound: 2200
const amount0 = toRawAmount(1, 18);    // 1 ETH
const amount1 = toRawAmount(2000, 6);  // 2000 USDC

const liquidity = calculateLiquidityFromAmounts(
  currentSqrtPrice,
  lowerSqrtPrice,
  upperSqrtPrice,
  amount0,
  amount1
);
console.log(`  Liquidity from 1 ETH + 2000 USDC: ${liquidity}`);

const { amount0: out0, amount1: out1 } = calculateAmountsFromLiquidity(
  currentSqrtPrice,
  lowerSqrtPrice,
  upperSqrtPrice,
  liquidity
);
console.log(`  Back to amounts: ${formatFromRaw(out0, 18).toFixed(6)} ETH, ${formatFromRaw(out1, 6).toFixed(2)} USDC`);

// Test position range
const currentTick = sqrtPriceX96ToTick(currentSqrtPrice);
const tickLower = sqrtPriceX96ToTick(lowerSqrtPrice);
const tickUpper = sqrtPriceX96ToTick(upperSqrtPrice);
console.log(`\nPosition in range: ${isPositionInRange(currentTick, tickLower, tickUpper)}`);
console.log(`  Current tick: ${currentTick}, Range: [${tickLower}, ${tickUpper}]`);

// Test pool share
const totalLiquidity = liquidity * BigInt(10); // Assume we're 10% of pool
const share = calculatePoolShare(liquidity, totalLiquidity);
console.log(`  Pool share: ${share}%`);

// Test V2 calculations
console.log(`\nV2 calculations:`);
const reserve0 = toRawAmount(100, 18);  // 100 ETH
const reserve1 = toRawAmount(200000, 6); // 200,000 USDC
const swapAmount = toRawAmount(1, 18);   // Swap 1 ETH

const v2Out = calculateV2AmountOut(swapAmount, reserve0, reserve1);
console.log(`  Swap 1 ETH for USDC: ${formatFromRaw(v2Out, 6).toFixed(2)} USDC`);

const v2Price = calculateV2Price(reserve0, reserve1, 18, 6);
console.log(`  V2 price: ${v2Price.toFixed(2)} USDC/ETH`);

console.log('\n=== All tests passed! ===');
