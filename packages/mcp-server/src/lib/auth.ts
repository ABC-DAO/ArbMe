import { keccak256, toBytes } from "viem";
import type { PrivateKeyAccount } from "viem/accounts";
import { CHAIN_ID, REGISTRY, AGENT_ID, USDC_BASE } from "./config.js";
import { assertPaymentAmount, assertPayToAddress } from "./payment-guard.js";

// ── EIP-712 Domains & Types ───────────────────────────────────────────

const authDomain = {
  name: "ERC8004AgentRegistry",
  version: "1",
  chainId: CHAIN_ID,
  verifyingContract: REGISTRY,
} as const;

const authTypes = {
  AgentRequest: [
    { name: "agentId", type: "uint256" },
    { name: "timestamp", type: "uint256" },
    { name: "method", type: "string" },
    { name: "path", type: "string" },
    { name: "bodyHash", type: "bytes32" },
  ],
} as const;

const usdcDomain = {
  name: "USD Coin",
  version: "2",
  chainId: CHAIN_ID,
  verifyingContract: USDC_BASE,
} as const;

const usdcTypes = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
} as const;

// ── Auth Header ───────────────────────────────────────────────────────

export async function createAuthHeader(
  account: PrivateKeyAccount,
  method: string,
  path: string,
  body: string,
): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000);
  const bodyHash = keccak256(toBytes(body));

  const signature = await account.signTypedData({
    domain: authDomain,
    types: authTypes,
    primaryType: "AgentRequest",
    message: {
      agentId: AGENT_ID,
      timestamp: BigInt(timestamp),
      method,
      path,
      bodyHash,
    },
  });

  return `ERC-8004 ${CHAIN_ID}:${REGISTRY}:${AGENT_ID}:${timestamp}:${signature}`;
}

// ── Payment Header (x402 USDC TransferWithAuthorization) ──────────────

export async function createPaymentHeader(
  account: PrivateKeyAccount,
  requirements: {
    resource: string;
    accepts: Array<{ payTo: string; amount: string; [k: string]: unknown }>;
  },
): Promise<string> {
  const accept = requirements.accepts[0];
  const payTo = accept.payTo as `0x${string}`;
  const amount = BigInt(accept.amount);

  assertPayToAddress(payTo);
  assertPaymentAmount(amount);

  const validAfter = 0n;
  const validBefore = BigInt(Math.floor(Date.now() / 1000) + 3600);
  const nonce = keccak256(
    toBytes(Date.now().toString() + Math.random().toString()),
  );

  const signature = await account.signTypedData({
    domain: usdcDomain,
    types: usdcTypes,
    primaryType: "TransferWithAuthorization",
    message: {
      from: account.address,
      to: payTo,
      value: amount,
      validAfter,
      validBefore,
      nonce,
    },
  });

  const payload = {
    x402Version: 2,
    resource: requirements.resource,
    accepted: accept,
    payload: {
      signature,
      authorization: {
        from: account.address,
        to: payTo,
        value: amount.toString(),
        validAfter: validAfter.toString(),
        validBefore: validBefore.toString(),
        nonce,
      },
    },
  };

  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

// ── POST with 402 Payment Flow ────────────────────────────────────────

export async function postWithPayment(
  account: PrivateKeyAccount,
  endpoint: string,
  body: string,
): Promise<Response> {
  const method = "POST";
  const path = "/" + endpoint;

  let authHeader = await createAuthHeader(account, method, path, body);
  let response = await fetch(`https://news.clanker.ai/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
    body,
  });

  if (response.status === 402) {
    const paymentRequired = response.headers.get("PAYMENT-REQUIRED");
    if (!paymentRequired) throw new Error("No PAYMENT-REQUIRED header in 402 response");

    const requirements = JSON.parse(
      Buffer.from(paymentRequired, "base64").toString(),
    );
    const paymentHeader = await createPaymentHeader(account, requirements);

    // Retry with payment
    authHeader = await createAuthHeader(account, method, path, body);
    response = await fetch(`https://news.clanker.ai/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
        "PAYMENT-SIGNATURE": paymentHeader,
      },
      body,
    });
  }

  return response;
}
