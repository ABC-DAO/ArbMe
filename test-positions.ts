/**
 * Test script to debug position fetching
 * Run with: npx ts-node test-positions.ts
 */

import { fetchUserPositions } from './packages/core-lib/dist/positions.js';

const WALLET = '0x18A85ad341b2D6A2bd67fbb104B4827B922a2A3c';
const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY;

async function main() {
  console.log('=== Position Fetch Test ===');
  console.log(`Wallet: ${WALLET}`);
  console.log(`Alchemy Key: ${ALCHEMY_KEY ? 'Present' : 'MISSING'}`);
  console.log('');

  try {
    console.log('Fetching positions...');
    const positions = await fetchUserPositions(WALLET, ALCHEMY_KEY);

    console.log(`\n=== Results ===`);
    console.log(`Total positions: ${positions.length}`);

    if (positions.length > 0) {
      for (const pos of positions) {
        console.log(`\n[${pos.version}] ${pos.pair}`);
        console.log(`  Token0: ${pos.token0.symbol} - ${pos.token0.amount}`);
        console.log(`  Token1: ${pos.token1.symbol} - ${pos.token1.amount}`);
        console.log(`  USD: $${pos.liquidityUsd.toFixed(2)}`);
        if (pos.priceRange) {
          console.log(`  Range: ${pos.priceRange.min} - ${pos.priceRange.max}`);
        }
      }
    } else {
      console.log('No positions found for this wallet');
    }
  } catch (error) {
    console.error('Error fetching positions:', error);
  }
}

main();
