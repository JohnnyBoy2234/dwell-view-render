// Universal push: fires an FCM push (Android + iOS via APNs) for ANY row
// inserted into public.notifications. Invoked by the notifications_push DB
// trigger (pg_net). Because every notification type (maintenance, payments,
// applications, KYC, viewings, …) flows through create_notification(), this
// one function delivers push for all of them.
// Requires the FIREBASE_SERVICE_ACCOUNT secret (same one send-message-push uses).
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SignJWT, importPKCS8 } from "https://deno.land/x/jose@v5.2.0/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Friendly fallback titles when a notification didn't set metadata.title.
const TITLE_BY_TYPE: Record<string, string> = {
  maintenance: "Maintenance update",
  payment: "Payment update",
  application: "Application update",
  viewing: "Viewing update",
  lease: "Lease update",
  kyc: "Verification update",
  message: "New message",
};

let cachedToken: { token: string; expiresAt: number } | null = null;
async function getFcmAccessToken(serviceAccount: any): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) return cachedToken.token;
  const key = await importPKCS8(serviceAccount.private_key, "RS256");
  const now = Math.floor(Date.now() / 1000);
  const jwt = await new SignJWT({ scope: "https://www.googleapis.com/auth/firebase.messaging" })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(serviceAccount.client_email)
    .setAudience(serviceAccount.token_uri)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);
  const res = await fetch(serviceAccount.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  if (!res.ok) throw new Error(`FCM token exchange failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  cachedToken = { token: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 };
  return cachedToken.token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { notification_id } = await req.json();
    if (!notification_id) throw new Error("notification_id required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: n, error: nErr } = await supabase
      .from("notifications")
      .select("id, user_id, message, link_url, type, metadata")
      .eq("id", notification_id)
      .single();
    if (nErr || !n) throw new Error("Notification not found");

    const { data: tokens } = await supabase
      .from("push_tokens").select("id, token").eq("user_id", n.user_id);
    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ skipped: "no tokens" }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const title = (n.metadata as any)?.title || TITLE_BY_TYPE[n.type ?? ""] || "MzanziHomes";
    const body = String(n.message || "").slice(0, 180);

    const rawAccount = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
    if (!rawAccount) throw new Error("FIREBASE_SERVICE_ACCOUNT secret not configured");
    const serviceAccount = JSON.parse(rawAccount);
    const accessToken = await getFcmAccessToken(serviceAccount);

    const results = await Promise.all(
      tokens.map(async (t) => {
        const res = await fetch(
          `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              message: {
                token: t.token,
                notification: { title, body },
                data: {
                  type: String(n.type ?? ""),
                  link_url: String(n.link_url ?? ""),
                  notification_id: String(n.id),
                },
                android: { priority: "HIGH", notification: { sound: "default" } },
                apns: {
                  headers: { "apns-priority": "10", "apns-push-type": "alert" },
                  payload: { aps: { sound: "default", badge: 1 } },
                },
              },
            }),
          },
        );
        if (!res.ok) {
          const text = await res.text();
          if (text.includes("UNREGISTERED") || text.includes("INVALID_ARGUMENT")) {
            await supabase.from("push_tokens").delete().eq("id", t.id);
          }
          return { ok: false, status: res.status };
        }
        return { ok: true };
      }),
    );

    return new Response(JSON.stringify({ sent: results.filter((r) => r.ok).length, total: tokens.length }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("send-notification-push error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "unknown" }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
