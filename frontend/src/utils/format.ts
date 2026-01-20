/**
 * Formatting utilities for numbers and currencies
 */

/**
 * Formats a USD value with appropriate precision
 * @param value - Number to format
 * @returns Formatted string like "$1.23K" or "$1.23M"
 */
export function formatUsd(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(2)}K`;
  }
  if (value >= 1) {
    return `$${value.toFixed(2)}`;
  }
  return `$${value.toFixed(4)}`;
}

/**
 * Formats a price with appropriate precision
 */
export function formatPrice(price: string | number): string {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(num)) return '—';

  if (num >= 1) {
    return `$${num.toFixed(4)}`;
  }
  if (num >= 0.0001) {
    return `$${num.toFixed(6)}`;
  }
  return `$${num.toExponential(2)}`;
}

/**
 * Formats a percentage change with sign
 */
export function formatChange(change: number): string {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}%`;
}

/**
 * Truncates an Ethereum address
 */
export function truncateAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Formats a number with commas
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
}
