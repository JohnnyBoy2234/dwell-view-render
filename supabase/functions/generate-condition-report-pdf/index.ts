// Tamper-evident condition-report PDF: photos (downscaled thumbnails), notes,
// per-room disputes with both positions, receipt + approval signatures with
// metadata, and the full audit trail. Fired by condition_maybe_lock via pg_net
// once a record locks. Stores the PDF in the condition-photos bucket and writes
// pdf_path back to the record.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";
import { Image } from "https://deno.land/x/imagescript@1.2.15/mod.ts";
import QRCode from "https://esm.sh/qrcode@1.5.3";

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BUCKET = "condition-photos";
const THUMB_MAX = 900; // px longest edge
const fmtDT = (v: string | null | undefined) =>
  v ? new Date(v).toLocaleString("en-ZA") : "—";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { record_id } = await req.json();
    if (!record_id) throw new Error("record_id required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: record, error: rErr } = await supabase
      .from("condition_records").select("*").eq("id", record_id).single();
    if (rErr || !record) throw new Error("Record not found");

    const { data: tenancy } = await supabase
      .from("tenancies")
      .select("id, tenant_id, landlord_id, property_id, properties(title, location)")
      .eq("id", record.tenancy_id).single();

    const ids = [tenancy?.tenant_id, tenancy?.landlord_id].filter(Boolean);
    const { data: profiles } = await supabase
      .from("profiles").select("user_id, display_name").in("user_id", ids);
    const nameOf = (uid: string | null) =>
      profiles?.find((p: any) => p.user_id === uid)?.display_name ?? "—";

    const [{ data: photos }, { data: signatures }, { data: disputes }, { data: audit }] = await Promise.all([
      supabase.from("condition_photos").select("*").eq("record_id", record_id).order("created_at"),
      supabase.from("condition_signatures").select("*").eq("record_id", record_id).order("signed_at"),
      supabase.from("condition_disputes").select("*").eq("record_id", record_id).order("created_at"),
      supabase.from("condition_record_audit").select("*").eq("record_id", record_id).order("created_at"),
    ]);

    // ---- PDF ----
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const brand = rgb(0.18, 0.54, 1);
    const muted = rgb(0.4, 0.4, 0.4);
    const W = 595, H = 842, M = 40;
    let page = doc.addPage([W, H]);
    let y = H - M;

    const newPage = () => { page = doc.addPage([W, H]); y = H - M; };
    const space = (n: number) => { if (y - n < M) newPage(); };
    const wrap = (t: string, f: any, size: number, max: number) => {
      const words = String(t ?? "").split(/\s+/).filter(Boolean);
      const lines: string[] = []; let line = "";
      for (const w of words) {
        const test = line ? `${line} ${w}` : w;
        if (f.widthOfTextAtSize(test, size) > max && line) { lines.push(line); line = w; }
        else line = test;
      }
      if (line) lines.push(line);
      return lines.length ? lines : [""];
    };
    const text = (t: string, opts: { size?: number; f?: any; color?: any; indent?: number } = {}) => {
      const size = opts.size ?? 10; const f = opts.f ?? font;
      for (const ln of wrap(t, f, size, W - 2 * M - (opts.indent ?? 0))) {
        space(size + 4);
        page.drawText(ln, { x: M + (opts.indent ?? 0), y, size, font: f, color: opts.color ?? rgb(0, 0, 0) });
        y -= size + 4;
      }
    };
    const heading = (t: string) => { space(24); y -= 6; page.drawText(t, { x: M, y, size: 13, font: bold, color: brand }); y -= 18; };
    const rule = () => { space(10); page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) }); y -= 10; };

    // Header band
    page.drawRectangle({ x: 0, y: H - 54, width: W, height: 54, color: brand });
    page.drawText("Condition Report", { x: M, y: H - 34, size: 16, font: bold, color: rgb(1, 1, 1) });
    y = H - 54 - 20;

    const propTitle = (tenancy as any)?.properties?.title || (tenancy as any)?.properties?.location || "Property";
    text(propTitle, { f: bold, size: 12 });
    text(`${record.event_type === "move_in" ? "Move-in" : "Move-out"} record — finalised ${fmtDT(record.updated_at)}`, { color: muted });
    text(`Landlord: ${nameOf(tenancy?.landlord_id)}    Tenant: ${nameOf(tenancy?.tenant_id)}`, { color: muted });
    rule();

    // Notes
    if (record.landlord_notes || record.tenant_notes) {
      heading("Notes");
      if (record.landlord_notes) { text("Landlord:", { f: bold }); text(record.landlord_notes, { indent: 10 }); }
      if (record.tenant_notes) { text("Tenant:", { f: bold }); text(record.tenant_notes, { indent: 10 }); }
    }

    // Photos grouped by room. Per-photo hashes feed the report content hash.
    const photoHashes: string[] = [];
    const rooms = [...new Set((photos ?? []).filter((p: any) => !p.dispute_id).map((p: any) => p.location_tag))];
    for (const room of rooms) {
      heading(room);
      const roomPhotos = (photos ?? []).filter((p: any) => p.location_tag === room && !p.dispute_id);
      let x = M; const thumb = 120; const gap = 10; const rowH = thumb + 14;
      space(rowH);
      for (const p of roomPhotos) {
        try {
          const { data: blob } = await supabase.storage.from(BUCKET).download(p.storage_path);
          if (!blob) continue;
          const bytes = new Uint8Array(await blob.arrayBuffer());
          photoHashes.push(`${p.storage_path}:${await sha256Hex(bytes)}`);
          const img = await Image.decode(bytes);
          const scale = Math.min(1, THUMB_MAX / Math.max(img.width, img.height));
          if (scale < 1) img.resize(Math.round(img.width * scale), Math.round(img.height * scale));
          const jpg = await img.encodeJPEG(70);
          const embed = await doc.embedJpg(jpg);
          const ar = embed.width / embed.height;
          const w = ar >= 1 ? thumb : thumb * ar;
          const h = ar >= 1 ? thumb / ar : thumb;
          if (x + thumb > W - M) { x = M; y -= rowH; space(rowH); }
          page.drawImage(embed, { x, y: y - thumb, width: w, height: h });
          x += thumb + gap;
        } catch (_e) { /* skip unreadable image */ }
      }
      y -= rowH;
      page.drawText(`Taken between ${fmtDT(roomPhotos[0]?.created_at)} and ${fmtDT(roomPhotos[roomPhotos.length - 1]?.created_at)}`, { x: M, y, size: 8, font, color: muted });
      y -= 12;
    }

    // Disputes
    if ((disputes ?? []).length > 0) {
      heading("Disputes");
      for (const dsp of disputes!) {
        text(`${dsp.location_tag} — raised by ${dsp.raised_party}`, { f: bold });
        text(dsp.comment, { indent: 10 });
        const status = dsp.status === "agreed" ? "Agreed by the other party" : dsp.status === "disagreed" ? "Not agreed — both positions recorded" : "No response before the window closed";
        text(`Outcome: ${status}`, { indent: 10, color: muted, size: 9 });
        y -= 4;
      }
    }

    // Signatures
    heading("Signatures");
    for (const kind of ["receipt", "approval"] as const) {
      text(kind === "receipt" ? "Receipt (report received):" : "Approval (agreed with the report):", { f: bold });
      for (const party of ["landlord", "tenant"] as const) {
        const s = (signatures ?? []).find((x: any) => x.kind === kind && x.party === party);
        if (s) {
          const who = nameOf(party === "tenant" ? tenancy?.tenant_id : tenancy?.landlord_id);
          const meta = s.auto ? "auto-approved after the review window" : `IP ${s.ip ?? "—"}`;
          text(`${party}: ${who} — ${fmtDT(s.signed_at)} (${meta})`, { indent: 10, size: 9 });
        } else {
          text(`${party}: not signed`, { indent: 10, size: 9, color: muted });
        }
      }
      y -= 4;
    }

    // Audit trail
    heading("Audit trail");
    for (const a of audit ?? []) {
      text(`${fmtDT(a.created_at)} — ${a.action}${a.details && Object.keys(a.details).length ? ` ${JSON.stringify(a.details)}` : ""}`, { size: 8, color: muted });
    }

    rule();
    text("This condition report is annexed to the lease agreement in accordance with section 5(3) of the Rental Housing Act 50 of 1999. It records the condition of the property as agreed by the parties and is retained as a permanent, tamper-evident record.", { size: 8, color: muted });

    // ---- Content hash (the report's digital fingerprint) ----
    const fingerprint = JSON.stringify({
      property: tenancy?.property_id,
      tenant: tenancy?.tenant_id,
      landlord: tenancy?.landlord_id,
      event: record.event_type,
      notes: { landlord: record.landlord_notes, tenant: record.tenant_notes },
      photos: photoHashes,
      signatures: (signatures ?? []).map((s: any) => `${s.party}:${s.kind}:${s.signed_at}:${s.auto}`),
      disputes: (disputes ?? []).map((x: any) => `${x.location_tag}:${x.raised_party}:${x.comment}:${x.status}`),
    });
    const contentHash = await sha256Hex(new TextEncoder().encode(fingerprint));

    // ---- QR code + verification footer on every page ----
    const verifyUrl = `https://rsfrvjaqxhoqavvscvwf.supabase.co/functions/v1/verify-condition-report?token=${record.verify_token}`;
    let qrImg: any = null;
    try {
      const dataUrl: string = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 240 });
      const qrBytes = Uint8Array.from(atob(dataUrl.split(",")[1]), (c) => c.charCodeAt(0));
      qrImg = await doc.embedPng(qrBytes);
    } catch (_e) { /* footer still renders without the QR */ }

    const acceptedLine = `Tenant accepted ${fmtDT(record.tenant_attested_at)}  ·  Landlord accepted ${fmtDT(record.landlord_attested_at)}`;
    const pages = doc.getPages();
    pages.forEach((p, i) => {
      const fy = 44;
      p.drawLine({ start: { x: M, y: fy + 20 }, end: { x: W - M, y: fy + 20 }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });
      p.drawText(`MzanziHomes Condition Report   ${record.report_ref ?? ""}   Locked & Immutable`, { x: M, y: fy + 8, size: 8, font: bold, color: rgb(0, 0, 0) });
      p.drawText(acceptedLine, { x: M, y: fy - 2, size: 7, font, color: muted });
      p.drawText(`Fingerprint ${contentHash.slice(0, 32)}…   Page ${i + 1} of ${pages.length}`, { x: M, y: fy - 11, size: 6, font, color: muted });
      if (qrImg) {
        p.drawImage(qrImg, { x: W - M - 46, y: fy - 10, width: 46, height: 46 });
        p.drawText("Scan to verify", { x: W - M - 52, y: fy - 18, size: 6, font, color: muted });
      }
    });

    const pdfBytes = await doc.save();

    // ---- Store + link ----
    const path = `${record_id}/condition-report.pdf`;
    const { error: upErr } = await supabase.storage.from(BUCKET)
      .upload(path, pdfBytes, { contentType: "application/pdf", upsert: true });
    if (upErr) throw upErr;

    await supabase.from("condition_records")
      .update({ pdf_path: path, pdf_generated_at: new Date().toISOString(), content_hash: contentHash })
      .eq("id", record_id);

    return new Response(JSON.stringify({ success: true, path }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e) {
    console.error("generate-condition-report-pdf error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
