/** Maximum USDC payment per transaction: 1 USDC (6 decimals) */
export const MAX_PAYMENT_AMOUNT = 1_000_000n;

/**
 * Throws if the payment amount exceeds the safety cap.
 */
export function assertPaymentAmount(amount: bigint): void {
  if (amount > MAX_PAYMENT_AMOUNT) {
    throw new Error(
      `Payment amount ${amount} exceeds maximum allowed ${MAX_PAYMENT_AMOUNT} (1 USDC). Refusing to sign.`,
    );
  }
  if (amount <= 0n) {
    throw new Error(`Payment amount must be positive, got ${amount}.`);
  }
}

/**
 * Validates that a payTo address looks like a valid Ethereum address.
 */
export function assertPayToAddress(address: string): void {
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    throw new Error(
      `Invalid payTo address: "${address}". Expected 0x-prefixed 40-hex-char address.`,
    );
  }
}
