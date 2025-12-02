import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.1.0";
import { encodeBase64 } from "https://deno.land/std@0.190.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

interface Payload {
  tenant_id: string;
  property_id?: string; // optional
  filename: string;
  file_path: string; // storage path used
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
    const resend = new Resend(RESEND_API_KEY);
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    const { tenant_id, property_id, filename, file_path }: Payload = await req.json();
    if (!tenant_id || !filename || !file_path) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    // Fetch tenant email and name
    const { data: tenantUser } = await admin.auth.admin.getUserById(tenant_id as any);
    const tenantEmail = tenantUser?.user?.email;
    const { data: tenantProfile } = await admin.from('profiles').select('display_name').eq('user_id', tenant_id).maybeSingle();
    const tenantName = tenantProfile?.display_name || 'Tenant';

    // Fetch property title if provided
    const property = property_id
      ? (await admin.from('properties').select('title').eq('id', property_id).maybeSingle()).data
      : undefined;

    // Signed URL for attachment link
    const { data: signed } = await admin.storage.from('income-documents').createSignedUrl(file_path.replace('income-documents/',''), 60 * 60);
    const link = signed?.signedUrl;

    if (tenantEmail) {
      const FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@RentLekker.co';
      const FROM_NAME = Deno.env.get('RESEND_FROM_NAME') || 'RentLekker';
      const subject = `Invoice • ${property?.title || 'Your rental'}`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width:600px; margin:0 auto; padding:24px; background:#f8fafc;">
          <div style="background:#ffffff; padding:24px; border-radius:8px;">
            <h2 style="margin:0 0 12px; color:#111827;">Invoice Available</h2>
            <p style="margin:0 0 16px; color:#374151;">Hello ${tenantName},</p>
            <p style="margin:0 0 16px; color:#374151;">Your landlord shared a new invoice${property?.title ? ` for <strong>${property.title}</strong>` : ''}. You can download it using the link below.</p>
            ${link ? `<div style=\"margin:24px 0;\"><a href=\"${link}\" style=\"display:inline-block; background:#2563eb; color:#fff; padding:10px 18px; border-radius:6px; text-decoration:none; font-weight:600;\">Download Invoice</a></div>` : ''}
            <p style="margin:16px 0 0; color:#6b7280; font-size:12px;">This email was sent by RentLekker on behalf of your landlord.</p>
          </div>
        </div>
      `;
      // Try to attach the PDF (fetch via signed URL and base64-encode)
      let attachments: Array<{ filename: string; content: string; contentType: string; }> | undefined;
      try {
        if (link) {
          const resp = await fetch(link);
          if (resp.ok) {
            const bytes = new Uint8Array(await resp.arrayBuffer());
            const base64 = encodeBase64(bytes);
            attachments = [{ filename, content: base64, contentType: 'application/pdf' }];
          }
        }
      } catch (_) {
        // continue without attachment if fetch fails
      }

      await resend.emails.send({ from: `${FROM_NAME} <${FROM_EMAIL}>`, to: [tenantEmail], subject, html, attachments });
    }

    // In-app notification
    await admin.rpc('create_notification', {
      _user_id: tenant_id,
      _message: `New invoice${property?.title ? ` for ${property.title}` : ''}`,
      _link_url: '/tenant/proof-of-payment',
      _type: 'invoice_shared',
      _metadata: { ...(property_id ? { property_id } : {}), filename, file_path }
    });

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  } catch (e: any) {
    console.error('send-invoice-to-tenant error', e);
    return new Response(JSON.stringify({ error: e?.message || 'Unexpected error' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  }
});


