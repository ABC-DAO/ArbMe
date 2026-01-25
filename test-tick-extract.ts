/**
 * Debug tick extraction from V4 position info
 */

const packedInfo = BigInt('7468494178768465855957514388886954341957139940799047227985538275073506828288');
const packedHex = '0x' + packedInfo.toString(16);

console.log('Packed Info:', packedInfo.toString());
console.log('Packed Hex:', packedHex);
console.log('Hex length:', packedHex.length - 2, 'chars =', (packedHex.length - 2) * 4, 'bits');

// Original extraction (what we had - wrong)
console.log('\n=== Original extraction (WRONG) ===');
const tickLowerRaw1 = Number(packedInfo & BigInt(0xFFFFFF));
const tickUpperRaw1 = Number((packedInfo >> BigInt(24)) & BigInt(0xFFFFFF));
const tickLower1 = tickLowerRaw1 > 0x7FFFFF ? tickLowerRaw1 - 0x1000000 : tickLowerRaw1;
const tickUpper1 = tickUpperRaw1 > 0x7FFFFF ? tickUpperRaw1 - 0x1000000 : tickUpperRaw1;
console.log('tickLower:', tickLower1);
console.log('tickUpper:', tickUpper1);

// Try: Skip 8 bits for hasSubscriber first
console.log('\n=== Skip 8 bits first ===');
const shifted = packedInfo >> BigInt(8);
const tickLowerRaw2 = Number(shifted & BigInt(0xFFFFFF));
const tickUpperRaw2 = Number((shifted >> BigInt(24)) & BigInt(0xFFFFFF));
const tickLower2 = tickLowerRaw2 > 0x7FFFFF ? tickLowerRaw2 - 0x1000000 : tickLowerRaw2;
const tickUpper2 = tickUpperRaw2 > 0x7FFFFF ? tickUpperRaw2 - 0x1000000 : tickUpperRaw2;
console.log('tickLower:', tickLower2);
console.log('tickUpper:', tickUpper2);

// Try: Layout might be reversed (tickUpper first, then tickLower)
console.log('\n=== Swapped order ===');
const tickUpperRaw3 = Number(packedInfo & BigInt(0xFFFFFF));
const tickLowerRaw3 = Number((packedInfo >> BigInt(24)) & BigInt(0xFFFFFF));
const tickLower3 = tickLowerRaw3 > 0x7FFFFF ? tickLowerRaw3 - 0x1000000 : tickLowerRaw3;
const tickUpper3 = tickUpperRaw3 > 0x7FFFFF ? tickUpperRaw3 - 0x1000000 : tickUpperRaw3;
console.log('tickLower:', tickLower3);
console.log('tickUpper:', tickUpper3);

// Try: Skip 8 bits AND swap
console.log('\n=== Skip 8 bits + swapped ===');
const shifted2 = packedInfo >> BigInt(8);
const tickUpperRaw4 = Number(shifted2 & BigInt(0xFFFFFF));
const tickLowerRaw4 = Number((shifted2 >> BigInt(24)) & BigInt(0xFFFFFF));
const tickLower4 = tickLowerRaw4 > 0x7FFFFF ? tickLowerRaw4 - 0x1000000 : tickLowerRaw4;
const tickUpper4 = tickUpperRaw4 > 0x7FFFFF ? tickUpperRaw4 - 0x1000000 : tickUpperRaw4;
console.log('tickLower:', tickLower4);
console.log('tickUpper:', tickUpper4);

// Try: Different bit positions entirely
// Maybe the ticks are at the END of the uint256, not the beginning
console.log('\n=== Ticks from high bits ===');
const highPart = packedInfo >> BigInt(200); // Skip 200 bits of poolId
const tickLowerRaw5 = Number(highPart & BigInt(0xFFFFFF));
const tickUpperRaw5 = Number((highPart >> BigInt(24)) & BigInt(0xFFFFFF));
const tickLower5 = tickLowerRaw5 > 0x7FFFFF ? tickLowerRaw5 - 0x1000000 : tickLowerRaw5;
const tickUpper5 = tickUpperRaw5 > 0x7FFFFF ? tickUpperRaw5 - 0x1000000 : tickUpperRaw5;
console.log('tickLower:', tickLower5);
console.log('tickUpper:', tickUpper5);

// Let's look at the last few bytes in detail
console.log('\n=== Last bytes breakdown ===');
const lastBytes = packedHex.slice(-16);
console.log('Last 8 bytes (hex):', lastBytes);

// Break it down byte by byte
for (let i = 0; i < lastBytes.length; i += 2) {
  const byte = parseInt(lastBytes.slice(i, i + 2), 16);
  console.log(`Byte ${i/2}: 0x${lastBytes.slice(i, i + 2)} = ${byte}`);
}

// According to Uniswap V4 source, PositionInfo is:
// uint256 with: poolId (25 bytes = 200 bits) | tickUpper (3 bytes) | tickLower (3 bytes) | hasSubscriber (1 byte)
// So from LSB: hasSubscriber (8 bits) | tickLower (24 bits) | tickUpper (24 bits) | poolId (200 bits)
console.log('\n=== Per V4 spec: hasSubscriber | tickLower | tickUpper | poolId ===');
const hasSubscriber = Number(packedInfo & BigInt(0xFF));
const tickLowerSpec = Number((packedInfo >> BigInt(8)) & BigInt(0xFFFFFF));
const tickUpperSpec = Number((packedInfo >> BigInt(32)) & BigInt(0xFFFFFF));
const tickLowerSigned = tickLowerSpec > 0x7FFFFF ? tickLowerSpec - 0x1000000 : tickLowerSpec;
const tickUpperSigned = tickUpperSpec > 0x7FFFFF ? tickUpperSpec - 0x1000000 : tickUpperSpec;
console.log('hasSubscriber:', hasSubscriber);
console.log('tickLower (raw):', tickLowerSpec, '-> signed:', tickLowerSigned);
console.log('tickUpper (raw):', tickUpperSpec, '-> signed:', tickUpperSigned);
