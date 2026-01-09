import { ONE_YEAR_MS } from "@shared/const";
import { SignJWT, jwtVerify } from "jose";
import { ENV } from "./env";

/**
 * Custom JWT session management for email-based sign-ups.
 * This module provides JWT signing and verification independent of Manus SDK,
 * while maintaining compatibility with the same JWT_SECRET.
 */

// Type definitions for session payloads
export type CustomSessionPayload = {
  openId: string;
  name: string;
  type: "custom";
};

export type VerifiedSession = {
  openId: string;
  name: string;
  type?: string;
  appId?: string;
};

/**
 * Helper function to get the JWT secret as a Uint8Array for jose library
 */
function getSessionSecret(): Uint8Array {
  const secret = ENV.cookieSecret;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }
  return new TextEncoder().encode(secret);
}

/**
 * Sign a custom session token for email-based sign-ups
 * 
 * @param openId - User's unique identifier (e.g., email:hash)
 * @param name - User's display name
 * @param expiresInMs - Token expiration time in milliseconds (default: 1 year)
 * @returns JWT token string
 * 
 * @example
 * const token = await signCustomSessionToken("email:abc123", "John Doe", ONE_YEAR_MS);
 */
export async function signCustomSessionToken(
  openId: string,
  name: string,
  expiresInMs: number = ONE_YEAR_MS
): Promise<string> {
  const issuedAt = Date.now();
  const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
  const secretKey = getSessionSecret();

  return new SignJWT({
    openId,
    name,
    type: "custom",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expirationSeconds)
    .setIssuedAt(Math.floor(issuedAt / 1000))
    .sign(secretKey);
}

/**
 * Verify a session token (works with both custom and Manus tokens)
 * 
 * @param token - JWT token string from cookie
 * @returns Verified session payload or null if invalid
 * 
 * @example
 * const session = await verifySessionToken(cookieValue);
 * if (session) {
 *   console.log("User openId:", session.openId);
 * }
 */
export async function verifySessionToken(
  token: string | undefined | null
): Promise<VerifiedSession | null> {
  if (!token) {
    console.warn("[JWT] Missing session token");
    return null;
  }

  try {
    const secretKey = getSessionSecret();
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ["HS256"],
    });

    const { openId, name, type, appId } = payload as Record<string, unknown>;

    // Validate required fields
    if (typeof openId !== "string" || !openId) {
      console.warn("[JWT] Session payload missing openId");
      return null;
    }

    if (typeof name !== "string" || !name) {
      console.warn("[JWT] Session payload missing name");
      return null;
    }

    // Handle custom tokens (email sign-ups)
    if (type === "custom") {
      return {
        openId,
        name,
        type: "custom",
      };
    }

    // Handle Manus OAuth tokens (have appId)
    if (typeof appId === "string" && appId) {
      return {
        openId,
        name,
        appId,
      };
    }

    // If neither type is present, it might be a legacy token
    // Return basic session info
    return {
      openId,
      name,
    };
  } catch (error) {
    console.warn("[JWT] Session verification failed:", String(error));
    return null;
  }
}

