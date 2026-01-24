/**
 * Quick RPC test for balance and allowance functions
 * Run with: npx tsx test-rpc.ts
 */

import { config } from 'dotenv';
config({ path: '../../.env' });

import {
  fetchTokenBalance,
  fetchTokenBalances,
  fetchEthBalance,
  checkTokenAllowance,
  isTokenApproved,
  formatFromRaw,
} from './src/index.js';

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY;
console.log(`Using Alchemy: ${ALCHEMY_KEY ? 'YES' : 'NO (will use public RPC)'}\n`);

const ARBME = '0xC647421C5Dc78D1c3960faA7A33f9aEFDF4B7B07';
const WETH = '0x4200000000000000000000000000000000000006';
const USDC = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
const V4_POSITION_MANAGER = '0x7c5f5a4bbd8fd63184577525326123b519429bdc';

// Use a known whale address (vitalik.eth has WETH on Base)
const TEST_WALLET = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

async function main() {
  console.log('=== Testing RPC Functions ===\n');

  // Test ETH balance
  console.log('Fetching ETH balance...');
  const ethBalance = await fetchEthBalance(TEST_WALLET, ALCHEMY_KEY);
  console.log(`  ETH balance: ${formatFromRaw(ethBalance, 18)} ETH`);

  // Test single token balance
  console.log('\nFetching WETH balance...');
  const wethBalance = await fetchTokenBalance(WETH, TEST_WALLET, ALCHEMY_KEY);
  console.log(`  WETH balance: ${formatFromRaw(wethBalance, 18)} WETH`);

  // Test multiple token balances
  console.log('\nFetching multiple balances...');
  const balances = await fetchTokenBalances([WETH, USDC, ARBME], TEST_WALLET, ALCHEMY_KEY);
  console.log(`  WETH: ${formatFromRaw(balances.get(WETH.toLowerCase()) || BigInt(0), 18)}`);
  console.log(`  USDC: ${formatFromRaw(balances.get(USDC.toLowerCase()) || BigInt(0), 6)}`);
  console.log(`  ARBME: ${formatFromRaw(balances.get(ARBME.toLowerCase()) || BigInt(0), 18)}`);

  // Test allowance checking
  console.log('\nChecking WETH allowance for V4 Position Manager...');
  const allowance = await checkTokenAllowance(WETH, TEST_WALLET, V4_POSITION_MANAGER, ALCHEMY_KEY);
  console.log(`  Allowance: ${formatFromRaw(allowance, 18)} WETH`);

  // Test isTokenApproved
  const testAmount = BigInt('1000000000000000000'); // 1 WETH
  const isApproved = await isTokenApproved(WETH, TEST_WALLET, V4_POSITION_MANAGER, testAmount, ALCHEMY_KEY);
  console.log(`  Is approved for 1 WETH: ${isApproved}`);

  console.log('\n=== All RPC tests passed! ===');
}

main().catch(console.error);
