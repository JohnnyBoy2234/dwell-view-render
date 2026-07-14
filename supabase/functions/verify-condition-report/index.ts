// Public condition-report verification page. Opened by scanning the QR code in
// a report PDF (no login required). Given ?token=<verify_token>, it shows the
// authoritative record MzanziHomes holds so anyone — landlord, tenant, lawyer,
// insurer, Rental Housing Tribunal — can confirm the document is genuine and
// unaltered. Deploy with --no-verify-jwt so a browser GET works with no auth.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

const fmt = (v: string | null | undefined) => (v ? new Date(v).toLocaleString("en-ZA") : "—");

function page(title: string, bodyHtml: string, status: number) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · MzanziHomes</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; margin: 0; background: #f4f6fb; color: #0f172a; }
  .wrap { max-width: 560px; margin: 0 auto; padding: 24px 16px 60px; }
  .card { background: #fff; border-radius: 16px; box-shadow: 0 1px 3px rgba(0,0,0,.08); overflow: hidden; }
  .band { background: hsl(214 100% 59%); color: #fff; padding: 18px 20px; font-weight: 700; font-size: 18px; }
  .band.warn { background: #dc2626; }
  .band.ok { background: #16a34a; }
  .body { padding: 20px; }
  .row { display: flex; justify-content: space-between; gap: 12px; padding: 9px 0; border-bottom: 1px solid #eef2f7; font-size: 15px; }
  .row:last-child { border-bottom: 0; }
  .k { color: #64748b; }
  .v { font-weight: 600; text-align: right; word-break: break-word; }
  .note { font-size: 13px; color: #475569; margin-top: 14px; line-height: 1.5; }
  .hash { font-family: ui-monospace, monospace; font-size: 11px; color: #64748b; word-break: break-all; }
  @media (prefers-color-scheme: dark) {
    body { background: #0b1220; color: #e2e8f0; } .card { background: #111a2e; } .row { border-color: #1e293b; }
    .k { color: #94a3b8; } .note { color: #94a3b8; }
  }
</style></head><body><div class="wrap"><div class="card">${bodyHtml}</div>
<p class="note" style="text-align:center">Verified by MzanziHomes · mzanzihomes.co.za</p></div></body></html>`;
  return new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

serve(async (req) => {
  try {
    const token = new URL(req.url).searchParams.get("token");
    if (!token) return page("Invalid link", `<div class="band warn">Invalid verification link</div><div class="body"><p class="note">No report token was provided.</p></div>`, 400);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: record } = await supabase
      .from("condition_records")
      .select("id, report_ref, event_type, state, tenant_attested_at, landlord_attested_at, content_hash, tenancy_id, created_at")
      .eq("verify_token", token).maybeSingle();

    if (!record) {
      return page("Not found", `<div class="band warn">⚠ No matching record</div><div class="body"><p class="note">This QR code does not match any condition report in the MzanziHomes permanent record. Treat the document as unverified.</p></div>`, 404);
    }

    const { data: tenancy } = await supabase
      .from("tenancies").select("tenant_id, landlord_id, properties(title, location)")
      .eq("id", record.tenancy_id).maybeSingle();
    const { data: profiles } = await supabase
      .from("profiles").select("user_id, display_name")
      .in("user_id", [tenancy?.tenant_id, tenancy?.landlord_id].filter(Boolean));
    const nameOf = (uid: string | null | undefined) => profiles?.find((p: any) => p.user_id === uid)?.display_name ?? "—";
    const { count: photoCount } = await supabase
      .from("condition_photos").select("id", { count: "exact", head: true }).eq("record_id", record.id).is("dispute_id", null);

    const locked = record.state === "locked";
    const prop = (tenancy as any)?.properties;
    const rows = `
      <div class="row"><span class="k">Report ID</span><span class="v">${esc(record.report_ref ?? "—")}</span></div>
      <div class="row"><span class="k">Property</span><span class="v">${esc(prop?.title || prop?.location || "—")}</span></div>
      <div class="row"><span class="k">Type</span><span class="v">${record.event_type === "move_in" ? "Move-in" : "Move-out"}</span></div>
      <div class="row"><span class="k">Landlord</span><span class="v">${esc(nameOf(tenancy?.landlord_id))}</span></div>
      <div class="row"><span class="k">Tenant</span><span class="v">${esc(nameOf(tenancy?.tenant_id))}</span></div>
      <div class="row"><span class="k">Status</span><span class="v">${locked ? "🔒 Locked" : esc(record.state)}</span></div>
      <div class="row"><span class="k">Photos</span><span class="v">${photoCount ?? 0}</span></div>
      <div class="row"><span class="k">Tenant accepted</span><span class="v">${fmt(record.tenant_attested_at)}</span></div>
      <div class="row"><span class="k">Landlord accepted</span><span class="v">${fmt(record.landlord_attested_at)}</span></div>
      ${record.content_hash ? `<div class="row"><span class="k">Fingerprint</span><span class="v hash">${esc(record.content_hash)}</span></div>` : ""}`;

    if (!locked) {
      return page("Not yet finalised", `<div class="band warn">⚠ Not yet finalised</div><div class="body">${rows}<p class="note">This report exists but has not been finalised by both parties. It is not yet a binding record.</p></div>`, 200);
    }

    return page("Authentic", `<div class="band ok">✓ Authentic record</div><div class="body">${rows}
      <p class="note">This is the authentic condition report held permanently by MzanziHomes, accepted by both parties on the dates shown. Compare these details — and the fingerprint — against your document. If anything differs, the document you hold has been altered.</p></div>`, 200);
  } catch (e) {
    return page("Error", `<div class="band warn">Verification error</div><div class="body"><p class="note">${esc(e instanceof Error ? e.message : "unknown")}</p></div>`, 500);
  }
});
