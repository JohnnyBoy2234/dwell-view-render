import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") as string;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") as string;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;

// Admin client (bypasses RLS for storage signing)
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const authed = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData.user) {
      throw new Error("Invalid user");
    }
    const landlordId = userData.user.id;

    const { document_id } = await req.json();
    if (!document_id) throw new Error("document_id is required");

    // Load document
    const { data: doc, error: docErr } = await admin
      .from("documents")
      .select("id, user_id, document_type, file_path")
      .eq("id", document_id)
      .maybeSingle();
    if (docErr || !doc) throw new Error("Document not found");

    // Verify landlord is related to this tenant via an application
    const { data: relation } = await admin
      .from("applications")
      .select("id")
      .eq("tenant_id", doc.user_id)
      .eq("landlord_id", landlordId)
      .limit(1)
      .maybeSingle();

    if (!relation) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Determine bucket by document_type
    const bucket = doc.document_type === 'id' ? 'id-documents' : 'income-documents';

    // Create a short-lived signed URL
    const { data: signed, error: signErr } = await admin.storage
      .from(bucket)
      .createSignedUrl(doc.file_path, 60 * 10); // 10 minutes

    if (signErr || !signed?.signedUrl) throw new Error("Could not sign URL");

    return new Response(JSON.stringify({ url: signed.signedUrl }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e: any) {
    console.error("landlord-get-document-url error", e);
    return new Response(JSON.stringify({ error: e?.message || "Unexpected error" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
