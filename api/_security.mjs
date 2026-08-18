import { createHmac, timingSafeEqual } from "node:crypto";
import { getAddress, isAddress } from "ethers";

const MAX_BODY_BYTES = 140_000;
const MAX_AUCTION_ID = 1_000_000;

export function sendJson(response, status, body) {
  response.status(status).setHeader("Cache-Control", "no-store").json(body);
}

export function requirePost(request, response) {
  if (request.method === "POST") return true;
  response.setHeader("Allow", "POST");
  sendJson(response, 405, { error: "Method not allowed." });
  return false;
}

export function assertAllowedOrigin(request) {
  const origin = request.headers.origin;
  const configured = process.env.OJABID_ALLOWED_ORIGINS ?? "";
  const allowedOrigins = configured.split(",").map((value) => value.trim()).filter(Boolean);
  if (!origin || allowedOrigins.length === 0 || !allowedOrigins.includes(origin)) {
    throw new Error("This browser origin is not approved for OjaBid auction requests.");
  }
}

export async function readJson(request) {
  if (Buffer.isBuffer(request.body)) {
    if (request.body.length > MAX_BODY_BYTES) throw new Error("Request body is too large.");
    return JSON.parse(request.body.toString("utf8"));
  }
  if (request.body && typeof request.body === "object") return request.body;
  if (typeof request.body === "string") {
    if (request.body.length > MAX_BODY_BYTES) throw new Error("Request body is too large.");
    return JSON.parse(request.body);
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error("Request body is too large.");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export function requireString(value, field, maxLength = 512) {
  if (typeof value !== "string" || value.length === 0 || value.length > maxLength) {
    throw new Error(`Invalid ${field}.`);
  }
  return value;
}

export function requireAuctionId(value) {
  if (!Number.isInteger(value) || value < 0 || value > MAX_AUCTION_ID) throw new Error("Invalid auction ID.");
  return value;
}

export function requireAddress(value, field = "address") {
  if (typeof value !== "string" || !isAddress(value)) throw new Error(`Invalid ${field}.`);
  return getAddress(value);
}

export function requireHex(value, field, maxBytes) {
  const text = requireString(value, field, maxBytes * 2 + 2);
  if (!/^0x[0-9a-fA-F]*$/.test(text) || (text.length - 2) % 2 !== 0) throw new Error(`Invalid ${field}.`);
  if ((text.length - 2) / 2 > maxBytes) throw new Error(`Invalid ${field}.`);
  return text;
}

export function requireExactBytes32(value, field) {
  const text = requireHex(value, field, 32);
  if (text.length !== 66) throw new Error(`Invalid ${field}.`);
  return text;
}

function secret(name) {
  const value = process.env[name];
  if (!value || value.length < 32) throw new Error(`Missing secure ${name} configuration.`);
  return value;
}

function sign(payload) {
  return createHmac("sha256", secret("OJABID_SESSION_SECRET")).update(payload).digest("base64url");
}

function equal(left, right) {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

export function requireAccessCode(value) {
  const supplied = requireString(value, "auction access code", 128);
  const expected = secret("OJABID_TEST_ACCESS_CODE");
  if (!equal(supplied, expected)) throw new Error("Auction access could not be verified.");
}

export function createAuctionToken({ auctionId, bidderId }) {
  // Approval happens before the lot opens, so the scoped token must cover the seven-day test auction.
  // Production replaces this with revocable, authenticated buyer sessions.
  const payload = Buffer.from(JSON.stringify({ auctionId, bidderId, exp: Date.now() + 8 * 24 * 60 * 60_000 })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyAuctionToken(value, auctionId, bidderId) {
  const token = requireString(value, "access token", 4_096);
  const [payload, signature, ...extra] = token.split(".");
  if (!payload || !signature || extra.length > 0 || !equal(sign(payload), signature)) throw new Error("Auction access has expired. Register again.");
  let claims;
  try {
    claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    throw new Error("Auction access has expired. Register again.");
  }
  if (claims.auctionId !== auctionId || claims.bidderId !== bidderId || !Number.isFinite(claims.exp) || claims.exp < Date.now()) {
    throw new Error("Auction access has expired. Register again.");
  }
}

export function publicError(error) {
  if (error instanceof Error && /^(Invalid|Missing|Auction access|This browser|This auction|Encrypted|Registration|Request body|Method)/.test(error.message)) return error.message;
  return "The confidential auction request could not be completed.";
}
