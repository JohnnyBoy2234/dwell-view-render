// Direct Apple Push Notification service (APNs) sender — token-based auth.
//
// Used by the push edge functions to deliver to iOS devices WITHOUT going
// through Firebase. Android still goes via FCM; only iOS tokens come here.
//
// Auth is the modern APNs provider token (JWT, ES256) built from the .p8 key
// you downloaded from Apple. One key works for every app under the same team;
// the per-app "topic" is the app's bundle id, stored per token as `app_id`.
//
// Required Supabase secrets:
//   APNS_AUTH_KEY   — full contents of the AuthKey_XXXX.p8 (PEM, incl. BEGIN/END)
//   APNS_KEY_ID     — the 10-char Key ID of that key
//   APNS_TEAM_ID    — your Apple Developer Team ID (10 chars)
//   APNS_PRODUCTION — "true" (default) hits api.push.apple.com; "false" prefers
//                     the sandbox (Xcode dev builds). Either way we auto-retry
//                     the other environment on a wrong-environment token error.
import { SignJWT, importPKCS8 } from "https://deno.land/x/jose@v5.2.0/index.ts";

const PROD_HOST = "https://api.push.apple.com";
const SANDBOX_HOST = "https://api.sandbox.push.apple.com";

// APNs allows reusing a provider token for up to 60 min and forbids minting a
// new one more than once every 20 min — cache and refresh well inside that.
let cachedJwt: { token: string; iat: number } | null = null;

async function getApnsJwt(): Promise<string> {
  const keyPem = Deno.env.get("APNS_AUTH_KEY");
  const keyId = Deno.env.get("APNS_KEY_ID");
  const teamId = Deno.env.get("APNS_TEAM_ID");
  if (!keyPem || !keyId || !teamId) {
    throw new Error("APNs not configured (need APNS_AUTH_KEY, APNS_KEY_ID, APNS_TEAM_ID)");
  }
  const now = Math.floor(Date.now() / 1000);
  if (cachedJwt && now - cachedJwt.iat < 40 * 60) return cachedJwt.token;

  // Secrets stored via the dashboard often arrive with literal "\n" — normalise.
  const key = await importPKCS8(keyPem.replace(/\\n/g, "\n"), "ES256");
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: keyId })
    .setIssuer(teamId)
    .setIssuedAt(now)
    .sign(key);
  cachedJwt = { token, iat: now };
  return token;
}

export interface ApnsMessage {
  token: string;               // hex APNs device token
  topic: string;               // the app's bundle id (apns-topic)
  title: string;
  body: string;
  data?: Record<string, string>;
  badge?: number;
  sound?: string;
}

export interface ApnsResult {
  ok: boolean;
  status: number;
  prune: boolean;              // true => the token is dead, delete it
  reason?: string;
}

async function post(host: string, m: ApnsMessage, jwt: string): Promise<Response> {
  const payload = {
    aps: {
      alert: { title: m.title, body: m.body },
      sound: m.sound ?? "default",
      ...(m.badge !== undefined ? { badge: m.badge } : {}),
    },
    ...(m.data ?? {}),
  };
  return await fetch(`${host}/3/device/${m.token}`, {
    method: "POST",
    headers: {
      authorization: `bearer ${jwt}`,
      "apns-topic": m.topic,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

/** Send one push to one iOS device. Never throws for a per-token failure —
 *  returns a result the caller uses to count sends and prune dead tokens.
 *  Throws only for a hard config error (missing/invalid credentials). */
export async function sendApns(m: ApnsMessage): Promise<ApnsResult> {
  if (!m.topic) return { ok: false, status: 0, prune: false, reason: "missing apns topic (app_id)" };
  const jwt = await getApnsJwt();
  const preferProd = (Deno.env.get("APNS_PRODUCTION") ?? "true") !== "false";
  const primary = preferProd ? PROD_HOST : SANDBOX_HOST;
  const secondary = preferProd ? SANDBOX_HOST : PROD_HOST;

  let res = await post(primary, m, jwt);
  let text = res.ok ? "" : await res.text().catch(() => "");

  // A token minted for the other environment reads as BadDeviceToken here —
  // retry the opposite host before deciding the token is truly dead.
  if (!res.ok && res.status === 400 &&
      (text.includes("BadDeviceToken") || text.includes("BadEnvironmentKeyInToken"))) {
    res = await post(secondary, m, jwt);
    text = res.ok ? "" : await res.text().catch(() => "");
  }

  if (res.ok) return { ok: true, status: res.status, prune: false };

  const prune = res.status === 410 || text.includes("Unregistered") || text.includes("BadDeviceToken");
  return { ok: false, status: res.status, prune, reason: text };
}
