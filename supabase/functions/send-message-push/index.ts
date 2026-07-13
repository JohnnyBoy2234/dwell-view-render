// Fires an FCM push to the recipient of a new chat message. Invoked by the
// messages_push_notify DB trigger (pg_net) on every INSERT into messages.
// Requires the FIREBASE_SERVICE_ACCOUNT secret: the JSON service-account key
// from Firebase Console → Project settings → Service accounts.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SignJWT, importPKCS8 } from "https://deno.land/x/jose@v5.2.0/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Cache the short-lived FCM OAuth token across warm invocations.
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getFcmAccessToken(serviceAccount: any): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }
  const key = await importPKCS8(serviceAccount.private_key, "RS256");
  const now = Math.floor(Date.now() / 1000);
  const jwt = await new SignJWT({
    scope: "https://www.googleapis.com/auth/firebase.messaging",
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(serviceAccount.client_email)
    .setAudience(serviceAccount.token_uri)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);

  const res = await fetch(serviceAccount.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) throw new Error(`FCM token exchange failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  cachedToken = { token: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 };
  return cachedToken.token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const { message_id } = await req.json();
    if (!message_id) throw new Error("message_id required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: message, error: msgError } = await supabase
      .from("messages")
      .select("id, conversation_id, sender_id, content, message_type")
      .eq("id", message_id)
      .single();
    if (msgError || !message) throw new Error("Message not found");

    const { data: conversation } = await supabase
      .from("conversations")
      .select("id, landlord_id, tenant_id, properties ( title )")
      .eq("id", message.conversation_id)
      .single();
    if (!conversation) throw new Error("Conversation not found");

    const recipientId =
      message.sender_id === conversation.landlord_id
        ? conversation.tenant_id
        : conversation.landlord_id;

    // Skip the push if the recipient is actively online (they get the
    // realtime in-app delivery instead).
    const { data: presence } = await supabase
      .from("user_presence")
      .select("is_online, last_seen")
      .eq("user_id", recipientId)
      .maybeSingle();
    if (presence?.is_online && presence.last_seen &&
        Date.now() - new Date(presence.last_seen).getTime() < 60_000) {
      return new Response(JSON.stringify({ skipped: "recipient online" }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: tokens } = await supabase
      .from("push_tokens")
      .select("id, token")
      .eq("user_id", recipientId);
    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ skipped: "no tokens" }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", message.sender_id)
      .maybeSingle();
    const senderName = senderProfile?.display_name || "New message";
    const propertyTitle = (conversation as any).properties?.title;
    const body =
      message.message_type === "text"
        ? String(message.content || "").slice(0, 140)
        : "Sent an attachment";

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
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message: {
                token: t.token,
                notification: {
                  title: propertyTitle ? `${senderName} · ${propertyTitle}` : senderName,
                  body,
                },
                data: {
                  type: "chat_message",
                  conversation_id: message.conversation_id,
                },
                android: { priority: "HIGH" },
                apns: { headers: { "apns-priority": "10" } },
              },
            }),
          }
        );
        if (!res.ok) {
          const text = await res.text();
          // Stale/rotated tokens: remove so we stop paying for dead sends
          if (text.includes("UNREGISTERED") || text.includes("INVALID_ARGUMENT")) {
            await supabase.from("push_tokens").delete().eq("id", t.id);
          }
          return { ok: false, status: res.status };
        }
        return { ok: true };
      })
    );

    return new Response(JSON.stringify({ sent: results.filter((r) => r.ok).length, total: tokens.length }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("send-message-push error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "unknown" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
