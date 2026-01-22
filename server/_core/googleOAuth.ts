import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import { randomBytes } from "crypto";
import { parse as parseCookieHeader } from "cookie";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { signCustomSessionToken } from "./jwt";
import { ENV } from "./env";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const STATE_COOKIE_NAME = "google_oauth_state";
const STATE_COOKIE_MAX_AGE = 5 * 60 * 1000; // 5 minutes

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

function getRedirectUri(req: Request): string {
  const protocol = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.headers["x-forwarded-host"] || req.get("host");
  return `${protocol}://${host}/api/auth/google/callback`;
}

export function registerGoogleOAuthRoutes(app: Express) {
  // Route to initiate Google OAuth flow
  app.get("/api/auth/google", (req: Request, res: Response) => {
    // Check if Google OAuth is configured
    if (!ENV.googleClientId || !ENV.googleClientSecret) {
      console.error("[Google OAuth] Client ID or Secret not configured");
      res.redirect("/login?error=oauth_not_configured");
      return;
    }

    // Generate CSRF state token
    const state = randomBytes(32).toString("hex");

    // Store state in a short-lived cookie
    res.cookie(STATE_COOKIE_NAME, state, {
      httpOnly: true,
      secure: req.protocol === "https" || req.headers["x-forwarded-proto"] === "https",
      sameSite: "lax",
      maxAge: STATE_COOKIE_MAX_AGE,
      path: "/",
    });

    // Build Google OAuth authorization URL
    const redirectUri = getRedirectUri(req);
    const params = new URLSearchParams({
      client_id: ENV.googleClientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state: state,
      access_type: "online",
      prompt: "select_account",
    });

    const authUrl = `${GOOGLE_AUTH_URL}?${params.toString()}`;
    res.redirect(authUrl);
  });

  // Route to handle Google OAuth callback
  app.get("/api/auth/google/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    const error = getQueryParam(req, "error");

    // Handle errors from Google
    if (error) {
      console.error("[Google OAuth] Google returned error:", error);
      res.redirect(`/login?error=${error}`);
      return;
    }

    // Validate required parameters
    if (!code || !state) {
      console.error("[Google OAuth] Missing code or state parameter");
      res.redirect("/login?error=invalid_request");
      return;
    }

    // Validate state against cookie (CSRF protection)
    const cookies = parseCookieHeader(req.headers.cookie || "");
    const cookieState = cookies[STATE_COOKIE_NAME];
    if (!cookieState || state !== cookieState) {
      console.error("[Google OAuth] State mismatch - possible CSRF attack");
      res.redirect("/login?error=invalid_state");
      return;
    }

    // Clear the state cookie
    res.clearCookie(STATE_COOKIE_NAME, { path: "/" });

    try {
      // Exchange authorization code for access token
      const redirectUri = getRedirectUri(req);
      const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: ENV.googleClientId,
          client_secret: ENV.googleClientSecret,
          code: code,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error("[Google OAuth] Token exchange failed:", errorText);
        res.redirect("/login?error=auth_failed");
        return;
      }

      const tokenData = await tokenResponse.json() as {
        access_token: string;
        token_type: string;
        expires_in: number;
        id_token?: string;
      };

      // Fetch user info from Google
      const userInfoResponse = await fetch(GOOGLE_USERINFO_URL, {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });

      if (!userInfoResponse.ok) {
        const errorText = await userInfoResponse.text();
        console.error("[Google OAuth] User info fetch failed:", errorText);
        res.redirect("/login?error=profile_fetch_failed");
        return;
      }

      const userInfo = await userInfoResponse.json() as {
        id: string;
        email?: string;
        verified_email?: boolean;
        name?: string;
        given_name?: string;
        family_name?: string;
        picture?: string;
      };

      if (!userInfo.id) {
        console.error("[Google OAuth] No user ID in response");
        res.redirect("/login?error=profile_fetch_failed");
        return;
      }

      // Create openId in the format google:{googleUserId}
      const openId = `google:${userInfo.id}`;
      const userName = userInfo.name || userInfo.email?.split("@")[0] || "Google User";

      // Upsert user in database
      await db.upsertUser({
        openId: openId,
        name: userName,
        email: userInfo.email ?? null,
        loginMethod: "google",
        lastSignedIn: new Date(),
      });

      // Create session token
      const sessionToken = await signCustomSessionToken(openId, userName, ONE_YEAR_MS);

      // Set session cookie
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // Redirect to members page
      res.redirect("/members");
    } catch (error) {
      console.error("[Google OAuth] Callback failed:", error);
      res.redirect("/login?error=server_error");
    }
  });
}
