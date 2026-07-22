// Tamper-evident condition-report PDF: branded cover, photos (downscaled
// thumbnails), notes, per-room checklist, meters/keys, disputes, signatures and
// the audit trail, with a QR verification footer. Fired by condition_maybe_lock
// via pg_net once a record locks, AND callable on demand from the app. Stores
// the PDF in the condition-photos bucket and writes pdf_path back to the record.
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
const fmtD = (v: string | null | undefined) =>
  v ? new Date(v).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" }) : "—";

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
    const [{ data: checklist }, { data: meters }, { data: keys }] = await Promise.all([
      supabase.from("condition_checklist_items").select("*").eq("record_id", record_id).order("location_tag").order("sort_order"),
      supabase.from("condition_meters").select("*").eq("record_id", record_id).order("created_at"),
      supabase.from("condition_keys").select("*").eq("record_id", record_id).order("created_at"),
    ]);
    const CONDITION_LABEL: Record<string, string> = { good: "Good", fair: "Fair", poor: "Poor", damaged: "Damaged" };
    const CHANGE_LABEL: Record<string, string> = { fair_wear: "Fair wear & tear", tenant_damage: "Tenant damage", pre_existing: "Pre-existing" };

    // Move-out: load the check-in checklist to show condition at check-in.
    const checkInBy = new Map<string, any>();
    if (record.event_type === "move_out") {
      const { data: ci } = await supabase.from("condition_records").select("id").eq("tenancy_id", record.tenancy_id).eq("event_type", "move_in").maybeSingle();
      if (ci?.id) {
        const { data: ciItems } = await supabase.from("condition_checklist_items").select("*").eq("record_id", ci.id);
        for (const it of ciItems ?? []) checkInBy.set(`${it.location_tag}::${String(it.name).toLowerCase()}`, it);
      }
    }

    // ─── PDF setup ────────────────────────────────────────────────────────────
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);

    // Brand palette
    const brand = rgb(0.18, 0.54, 1);         // MzanziHomes blue
    const brandDark = rgb(0.09, 0.30, 0.66);
    const green = rgb(0.13, 0.66, 0.38);       // accent green
    const ink = rgb(0.07, 0.10, 0.16);
    const muted = rgb(0.42, 0.47, 0.55);
    const panel = rgb(0.95, 0.97, 1);          // soft blue-grey panel
    const panelBd = rgb(0.85, 0.89, 0.96);
    const white = rgb(1, 1, 1);
    const red = rgb(0.83, 0.18, 0.18);

    const W = 595, H = 842, M = 44;
    const CONTENT_TOP = H - 132; // below the header band
    const FOOTER_TOP = 66;       // keep content clear of the footer
    let page = doc.addPage([W, H]);
    let y = CONTENT_TOP;
    let firstPage = true;

    // Simple house logo mark (SVG path), white on the brand band.
    const drawLogo = (pg: any, x: number, topY: number, s: number) => {
      try {
        pg.drawSvgPath("M3 11 L12 3 L21 11 L21 21 L3 21 Z", { x, y: topY, scale: s, color: white });
        pg.drawSvgPath("M10 21 L10 15.5 L14 15.5 L14 21", { x, y: topY, scale: s, color: brand });
      } catch (_e) { /* header still fine without the mark */ }
    };

    const headerBand = (pg: any) => {
      pg.drawRectangle({ x: 0, y: H - 96, width: W, height: 96, color: brand });
      pg.drawRectangle({ x: 0, y: H - 100, width: W, height: 4, color: green });
      drawLogo(pg, M, H - 34, 1.7);
      pg.drawText("MzanziHomes", { x: M + 44, y: H - 42, size: 20, font: bold, color: white });
      pg.drawText("Property Condition Report", { x: M + 44, y: H - 64, size: 11, font, color: rgb(0.86, 0.93, 1) });
      const evt = record.event_type === "move_in" ? "MOVE-IN" : "MOVE-OUT";
      const rw = bold.widthOfTextAtSize(evt, 12);
      pg.drawText(evt, { x: W - M - rw, y: H - 42, size: 12, font: bold, color: white });
      const ref = record.report_ref ?? "";
      if (ref) { const rw2 = font.widthOfTextAtSize(ref, 9); pg.drawText(ref, { x: W - M - rw2, y: H - 60, size: 9, font, color: rgb(0.86, 0.93, 1) }); }
    };
    headerBand(page);

    const newPage = () => { page = doc.addPage([W, H]); headerBand(page); y = CONTENT_TOP; firstPage = false; };
    const space = (n: number) => { if (y - n < FOOTER_TOP) newPage(); };
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
    const text = (t: string, opts: { size?: number; f?: any; color?: any; indent?: number; gap?: number } = {}) => {
      const size = opts.size ?? 10; const f = opts.f ?? font; const gap = opts.gap ?? 4;
      for (const ln of wrap(t, f, size, W - 2 * M - (opts.indent ?? 0))) {
        space(size + gap);
        page.drawText(ln, { x: M + (opts.indent ?? 0), y, size, font: f, color: opts.color ?? ink });
        y -= size + gap;
      }
    };
    // Section header: accent bar + brand label + hairline.
    const heading = (t: string) => {
      space(34); y -= 10;
      page.drawRectangle({ x: M, y: y - 2, width: 4, height: 16, color: brand });
      page.drawText(t.toUpperCase(), { x: M + 12, y, size: 12, font: bold, color: brandDark });
      y -= 10;
      page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.75, color: panelBd });
      y -= 14;
    };
    const chip = (pg: any, x: number, yy: number, label: string, bg: any, fg: any) => {
      const w = bold.widthOfTextAtSize(label, 8) + 16;
      pg.drawRectangle({ x, y: yy - 4, width: w, height: 18, color: bg });
      pg.drawText(label, { x: x + 8, y: yy, size: 8, font: bold, color: fg });
      return w;
    };

    // ─── Summary card ─────────────────────────────────────────────────────────
    const propTitle = (tenancy as any)?.properties?.title || "Property";
    const propLoc = (tenancy as any)?.properties?.location || "";
    const cardH = 150;
    space(cardH + 6);
    const cardTop = y;
    page.drawRectangle({ x: M, y: cardTop - cardH, width: W - 2 * M, height: cardH, color: panel, borderColor: panelBd, borderWidth: 1 });
    let cy = cardTop - 26;
    page.drawText(propTitle, { x: M + 18, y: cy, size: 15, font: bold, color: ink }); cy -= 20;
    if (propLoc) { page.drawText(propLoc, { x: M + 18, y: cy, size: 10, font, color: muted }); cy -= 20; }
    // status chip (top-right of card)
    const locked = record.state === "locked" || record.locked;
    chip(page, W - M - 150, cardTop - 24, locked ? "LOCKED & VERIFIED" : "DRAFT", locked ? green : muted, white);
    const kv = (label: string, value: string) => {
      page.drawText(label, { x: M + 18, y: cy, size: 8.5, font: bold, color: muted });
      page.drawText(value, { x: M + 150, y: cy, size: 10, font, color: ink });
      cy -= 18;
    };
    kv("LANDLORD", nameOf(tenancy?.landlord_id));
    kv("TENANT", nameOf(tenancy?.tenant_id));
    kv("EVENT", record.event_type === "move_in" ? "Move-in inspection" : "Move-out inspection");
    kv("FINALISED", fmtD(record.updated_at));
    y = cardTop - cardH - 6;

    // Attestation line
    text(`Tenant accepted ${fmtDT(record.tenant_attested_at)}   ·   Landlord accepted ${fmtDT(record.landlord_attested_at)}`, { size: 9, color: muted });

    // ─── Notes ────────────────────────────────────────────────────────────────
    if (record.landlord_notes || record.tenant_notes) {
      heading("Notes");
      if (record.landlord_notes) { text("Landlord", { f: bold, color: brandDark, size: 10 }); text(record.landlord_notes, { indent: 10, color: ink }); y -= 2; }
      if (record.tenant_notes) { text("Tenant", { f: bold, color: brandDark, size: 10 }); text(record.tenant_notes, { indent: 10, color: ink }); }
    }

    // Reusable image embed.
    //
    // Decoding full-resolution photos in pure-JS imagescript blew the edge
    // function's CPU budget once a record had several photos, crashing the whole
    // PDF with a 546 WORKER_RESOURCE_LIMIT. pdf-lib embeds JPEG/PNG bytes
    // *directly* (JPEG is a native PDF image format — no pixel decode needed), so
    // we embed the stored bytes as-is and only fall back to imagescript for exotic
    // formats. When Storage image transforms are enabled we prefer a small resized
    // copy (keeps the PDF lean); otherwise we embed the original, which is cheap.
    const embedBytes = async (bytes: Uint8Array) => {
      try { return await doc.embedJpg(bytes); } catch (_e) { /* not baseline jpeg */ }
      try { return await doc.embedPng(bytes); } catch (_e) { /* not png */ }
      // Last resort for uncommon formats: transcode a single image via imagescript.
      const img = await Image.decode(bytes);
      const scale = Math.min(1, THUMB_MAX / Math.max(img.width, img.height));
      if (scale < 1) img.resize(Math.round(img.width * scale), Math.round(img.height * scale));
      return await doc.embedJpg(await img.encodeJPEG(70));
    };
    const embedThumb = async (storagePath: string) => {
      // Preferred: natively-resized copy (only works if transforms are enabled).
      try {
        const { data: blob } = await supabase.storage.from(BUCKET).download(storagePath, {
          transform: { width: THUMB_MAX, height: THUMB_MAX, resize: "contain", quality: 75 },
        } as any);
        if (blob) {
          const bytes = new Uint8Array(await blob.arrayBuffer());
          try { return await doc.embedJpg(bytes); } catch (_e) { /* try png / original */ }
          try { return await doc.embedPng(bytes); } catch (_e) { /* fall through */ }
        }
      } catch (_e) { /* transforms unavailable — embed original below */ }
      const { data: blob } = await supabase.storage.from(BUCKET).download(storagePath);
      if (!blob) return null;
      return await embedBytes(new Uint8Array(await blob.arrayBuffer()));
    };

    // ─── Checklist grouped by room ──────────────────────────────────────────────
    if ((checklist ?? []).length > 0) {
      const byRoom = new Map<string, any[]>();
      for (const it of checklist!) { (byRoom.get(it.location_tag) ?? byRoom.set(it.location_tag, []).get(it.location_tag)!).push(it); }
      heading(record.event_type === "move_out" ? "Room checklist (check-out vs check-in)" : "Room checklist");
      for (const [room, items] of byRoom) {
        text(room, { f: bold, size: 11, color: brandDark });
        for (const it of items) {
          const bits = [it.condition ? `Condition: ${CONDITION_LABEL[it.condition] ?? it.condition}` : null, it.cleanliness ? (it.cleanliness === "clean" ? "Clean" : "Needs cleaning") : null].filter(Boolean).join("   ·   ");
          text(`•  ${it.name}${bits ? `   —   ${bits}` : ""}`, { indent: 8, size: 9.5 });
          if (record.event_type === "move_out") {
            const ci = checkInBy.get(`${it.location_tag}::${String(it.name).toLowerCase()}`);
            text(`At check-in: ${ci?.condition ? (CONDITION_LABEL[ci.condition] ?? ci.condition) : "not graded"}`, { indent: 18, size: 8, color: muted });
            if (it.change_type) text(`Classified: ${CHANGE_LABEL[it.change_type] ?? it.change_type}${it.change_note ? ` — ${it.change_note}` : ""}`, { indent: 18, size: 8, color: muted });
          }
          if (it.note) text(it.note, { indent: 18, size: 8, color: muted });
          const itemPhotos = (photos ?? []).filter((p: any) => p.item_id === it.id);
          if (itemPhotos.length > 0) {
            let x = M + 18; const thumb = 70; space(thumb + 8);
            for (const p of itemPhotos) {
              try {
                const emb = await embedThumb(p.storage_path);
                if (!emb) continue;
                if (x + thumb > W - M) { x = M + 18; y -= thumb + 6; space(thumb + 8); }
                page.drawImage(emb, { x, y: y - thumb, width: thumb, height: thumb });
                x += thumb + 6;
              } catch (_e) { /* skip */ }
            }
            y -= thumb + 8;
          }
        }
        y -= 6;
      }
    }

    // ─── Additional photos grouped by room ──────────────────────────────────────
    const rooms = [...new Set((photos ?? []).filter((p: any) => !p.dispute_id && !p.item_id).map((p: any) => p.location_tag))];
    if (rooms.length > 0) heading("Photographs");
    for (const room of rooms) {
      text(room, { f: bold, size: 11, color: brandDark });
      const roomPhotos = (photos ?? []).filter((p: any) => p.location_tag === room && !p.dispute_id && !p.item_id);
      let x = M; const thumb = 118; const gap = 10; const rowH = thumb + 14;
      space(rowH);
      for (const p of roomPhotos) {
        try {
          const embed = await embedThumb(p.storage_path);
          if (!embed) continue;
          const ar = embed.width / embed.height;
          const w = ar >= 1 ? thumb : thumb * ar;
          const h = ar >= 1 ? thumb / ar : thumb;
          if (x + thumb > W - M) { x = M; y -= rowH; space(rowH); }
          // subtle frame
          page.drawRectangle({ x: x - 1, y: y - thumb - 1, width: w + 2, height: h + 2, borderColor: panelBd, borderWidth: 1 });
          page.drawImage(embed, { x, y: y - thumb, width: w, height: h });
          x += thumb + gap;
        } catch (_e) { /* skip unreadable image */ }
      }
      y -= rowH;
      page.drawText(`Taken ${fmtDT(roomPhotos[0]?.created_at)} – ${fmtDT(roomPhotos[roomPhotos.length - 1]?.created_at)}`, { x: M, y, size: 8, font, color: muted });
      y -= 14;
    }

    // ─── Meters + keys ──────────────────────────────────────────────────────────
    if ((meters ?? []).length > 0) {
      heading("Meter readings");
      for (const m of meters!) text(`•  ${String(m.meter_type).charAt(0).toUpperCase() + String(m.meter_type).slice(1)}: ${m.reading}${m.note ? ` (${m.note})` : ""}`, { indent: 8, size: 9.5 });
    }
    if ((keys ?? []).length > 0) {
      heading("Keys & remotes issued");
      for (const k of keys!) text(`•  ${k.label} × ${k.quantity}${k.note ? ` (${k.note})` : ""}`, { indent: 8, size: 9.5 });
    }

    // ─── Disputes ───────────────────────────────────────────────────────────────
    if ((disputes ?? []).length > 0) {
      heading("Disputes");
      for (const dsp of disputes!) {
        text(`${dsp.location_tag} — raised by ${dsp.raised_party}`, { f: bold, color: red });
        text(dsp.comment, { indent: 10 });
        const status = dsp.status === "agreed" ? "Agreed by the other party" : dsp.status === "disagreed" ? "Not agreed — both positions recorded" : "No response before the window closed";
        text(`Outcome: ${status}`, { indent: 10, color: muted, size: 9 });
        y -= 4;
      }
    }

    // ─── Signatures ─────────────────────────────────────────────────────────────
    heading("Signatures");
    for (const kind of ["receipt", "approval"] as const) {
      text(kind === "receipt" ? "Receipt (report received)" : "Approval (agreed with the report)", { f: bold, color: brandDark, size: 10 });
      for (const party of ["landlord", "tenant"] as const) {
        const s = (signatures ?? []).find((x: any) => x.kind === kind && x.party === party);
        const label = party.charAt(0).toUpperCase() + party.slice(1);
        if (s) {
          const who = nameOf(party === "tenant" ? tenancy?.tenant_id : tenancy?.landlord_id);
          const meta = s.auto ? "auto-approved after the review window" : `IP ${s.ip ?? "—"}`;
          text(`${label}: ${who} — ${fmtDT(s.signed_at)} (${meta})`, { indent: 10, size: 9 });
        } else {
          text(`${label}: not signed`, { indent: 10, size: 9, color: muted });
        }
      }
      y -= 4;
    }

    // ─── Audit trail ────────────────────────────────────────────────────────────
    heading("Audit trail");
    for (const a of audit ?? []) {
      text(`${fmtDT(a.created_at)}  —  ${a.action}${a.details && Object.keys(a.details).length ? `  ${JSON.stringify(a.details)}` : ""}`, { size: 8, color: muted, gap: 3 });
    }

    y -= 6;
    page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.5, color: panelBd }); y -= 12;
    text("This condition report is annexed to the lease agreement in accordance with section 5(3) of the Rental Housing Act 50 of 1999. It records the condition of the property as agreed by the parties and is retained as a permanent, tamper-evident record.", { size: 8, color: muted });

    // ─── Content hash (the report's digital fingerprint) ────────────────────────
    const fingerprint = JSON.stringify({
      property: tenancy?.property_id,
      tenant: tenancy?.tenant_id,
      landlord: tenancy?.landlord_id,
      event: record.event_type,
      notes: { landlord: record.landlord_notes, tenant: record.tenant_notes },
      photos: (photos ?? []).map((p: any) => `${p.storage_path}:${p.created_at}:${p.item_id ?? ""}:${p.dispute_id ?? ""}`).sort(),
      checklist: (checklist ?? []).map((i: any) => `${i.location_tag}:${i.name}:${i.condition ?? ""}:${i.cleanliness ?? ""}:${i.note ?? ""}:${i.change_type ?? ""}:${i.change_note ?? ""}`).sort(),
      meters: (meters ?? []).map((m: any) => `${m.meter_type}:${m.reading}:${m.note ?? ""}`).sort(),
      keys: (keys ?? []).map((k: any) => `${k.label}:${k.quantity}:${k.note ?? ""}`).sort(),
      signatures: (signatures ?? []).map((s: any) => `${s.party}:${s.kind}:${s.signed_at}:${s.auto}`),
      disputes: (disputes ?? []).map((x: any) => `${x.location_tag}:${x.raised_party}:${x.comment}:${x.status}`),
    });
    const contentHash = await sha256Hex(new TextEncoder().encode(fingerprint));

    // ─── QR code + verification footer on every page ────────────────────────────
    const verifyUrl = `https://rsfrvjaqxhoqavvscvwf.supabase.co/functions/v1/verify-condition-report?token=${record.verify_token}`;
    let qrImg: any = null;
    try {
      const dataUrl: string = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 240, color: { dark: "#173a8f", light: "#ffffff" } });
      const qrBytes = Uint8Array.from(atob(dataUrl.split(",")[1]), (c) => c.charCodeAt(0));
      qrImg = await doc.embedPng(qrBytes);
    } catch (_e) { /* footer still renders without the QR */ }

    const pages = doc.getPages();
    pages.forEach((p, i) => {
      const fy = 40;
      p.drawLine({ start: { x: M, y: fy + 22 }, end: { x: W - M, y: fy + 22 }, thickness: 0.75, color: panelBd });
      p.drawText("MzanziHomes Condition Report", { x: M, y: fy + 10, size: 8, font: bold, color: brandDark });
      p.drawText(`${record.report_ref ?? ""}   ·   Locked & tamper-evident`, { x: M, y: fy, size: 7, font, color: muted });
      p.drawText(`Fingerprint ${contentHash.slice(0, 40)}…`, { x: M, y: fy - 9, size: 6, font, color: muted });
      p.drawText(`Page ${i + 1} of ${pages.length}`, { x: M, y: fy - 18, size: 6, font, color: muted });
      if (qrImg) {
        p.drawImage(qrImg, { x: W - M - 46, y: fy - 12, width: 46, height: 46 });
        const cap = "Scan to verify";
        p.drawText(cap, { x: W - M - 46 + (46 - font.widthOfTextAtSize(cap, 6)) / 2, y: fy - 20, size: 6, font, color: muted });
      }
    });

    const pdfBytes = await doc.save();

    // ─── Store + link ───────────────────────────────────────────────────────────
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
