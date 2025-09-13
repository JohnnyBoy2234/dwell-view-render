// Public Sign Page (serve UI + record signature)
// GET  /functions/v1/lease-sign?leaseId=...&role=tenant|landlord&token=...
// POST /functions/v1/lease-sign  { leaseId, role, token, signatureDataUrl, accept:true }

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const env = {
  SUPABASE_URL: Deno.env.get("SUPABASE_URL")!,
  SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  APP_BASE_URL: Deno.env.get("APP_BASE_URL") ?? "https://app.swiftrent.co.za"
};

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple token validation (replace with your own signed-token strategy)
async function validateSigningLink(leaseId: string, role: "TENANT"|"LANDLORD", token: string) {
  const { data, error } = await supabase
    .from("lease_signatures")
    .select("id, signed_at")
    .eq("lease_id", leaseId)
    .eq("role", role)
    .is("signed_at", null)
    .limit(1);
  
  if (error) {
    console.error("Error validating signing link:", error);
    return false;
  }
  
  // TODO: verify token (e.g., compare to stored magic token)
  return !!data?.length && token?.length > 10;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  
  if (req.method === "GET") {
    const leaseId = url.searchParams.get("leaseId")!;
    const role = (url.searchParams.get("role") || "") as "TENANT"|"LANDLORD";
    const token = url.searchParams.get("token") || "";

    if (!leaseId || !role) {
      return htmlResponse(400, "Missing parameters.");
    }

    const valid = await validateSigningLink(leaseId, role, token);
    if (!valid) {
      return htmlResponse(403, "This signing link is invalid or expired.");
    }

    // Load lease summary + PDF url
    const { data: lease } = await supabase
      .from("leases")
      .select("id, lease_data, pdf_draft_url, status")
      .eq("id", leaseId)
      .single();

    if (!lease) {
      return htmlResponse(404, "Lease not found.");
    }

    // Render sign page HTML
    return htmlResponse(200, signPageHtml({
      leaseId,
      role,
      token,
      pdfUrl: lease.pdf_draft_url || "#",
      keyFacts: {
        address: lease.lease_data?.property?.address,
        rent: lease.lease_data?.rent?.monthly_rent,
        deposit: lease.lease_data?.deposit?.amount,
        start: lease.lease_data?.term?.start_date,
        end: lease.lease_data?.term?.end_date
      }
    }));
  }

  if (req.method === "POST") {
    const body = await req.json();
    const { leaseId, role, token, signatureDataUrl, accept } = body || {};
    
    if (!leaseId || !role || !token || !accept || !signatureDataUrl) {
      return jsonResponse(400, { ok: false, error: "Missing required fields" });
    }

    const valid = await validateSigningLink(leaseId, role, token);
    if (!valid) {
      return jsonResponse(403, { ok: false, error: "Invalid token or status" });
    }

    console.log(`Processing signature for lease ${leaseId}, role ${role}`);

    // Store signature (in production, upload to Storage)
    const signatureImageUrl = `${env.APP_BASE_URL}/signatures/${leaseId}/${role}.png`;

    // Update signature record
    const { error: sigError } = await supabase
      .from("lease_signatures")
      .update({ 
        signed_at: new Date().toISOString(), 
        signature_image_url: signatureImageUrl 
      })
      .eq("lease_id", leaseId)
      .eq("role", role);

    if (sigError) {
      console.error("Error updating signature:", sigError);
      return jsonResponse(500, { ok: false, error: "Failed to record signature" });
    }

    // Check if both parties have signed
    const { data: signatures } = await supabase
      .from("lease_signatures")
      .select("role, signed_at")
      .eq("lease_id", leaseId);

    const landlordSigned = signatures?.some(s => s.role === "LANDLORD" && s.signed_at);
    const tenantSigned = signatures?.some(s => s.role === "TENANT" && s.signed_at);
    const bothSigned = landlordSigned && tenantSigned;

    // Update lease status
    let newStatus = "PENDING_TENANT_SIGNATURE";
    if (bothSigned) {
      newStatus = "COMPLETED";
    } else if (role === "TENANT") {
      newStatus = "PENDING_LANDLORD_SIGNATURE";
    }

    await supabase.from("leases")
      .update({ status: newStatus })
      .eq("id", leaseId);

    // Log workflow step
    await supabase.from("workflow_runs").insert({
      workflow_name: "lease_generation",
      entity_type: "lease",
      entity_id: leaseId,
      step: "signed",
      meta: { role, bothSigned }
    });

    console.log(`Signature recorded for lease ${leaseId}. Status: ${newStatus}`);

    return jsonResponse(200, {
      ok: true,
      bothSigned,
      next: bothSigned
        ? `${env.APP_BASE_URL}/leases/${leaseId}?signed=1`
        : `${env.APP_BASE_URL}/leases/${leaseId}?waiting=1`
    });
  }

  return jsonResponse(405, { ok: false, error: "Method not allowed" });
});

// Helper functions
function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { 
    status, 
    headers: { ...corsHeaders, "content-type": "application/json" }
  });
}

function htmlResponse(status: number, markup: string) {
  return new Response(markup, { 
    status, 
    headers: { ...corsHeaders, "content-type": "text/html; charset=utf-8" }
  });
}

function signPageHtml(ctx: {
  leaseId: string; 
  role: string; 
  token: string; 
  pdfUrl: string;
  keyFacts: { address?: string; rent?: number; deposit?: number; start?: string; end?: string; }
}) {
  const { leaseId, role, token, pdfUrl, keyFacts } = ctx;
  
  const facts = `
    <div class="key-facts">
      <div class="fact-item">
        <span class="fact-label">Address:</span>
        <span class="fact-value">${escapeHtml(keyFacts.address || "-")}</span>
      </div>
      <div class="fact-item">
        <span class="fact-label">Rent:</span>
        <span class="fact-value">R ${keyFacts.rent ?? "-"}</span>
      </div>
      <div class="fact-item">
        <span class="fact-label">Deposit:</span>
        <span class="fact-value">R ${keyFacts.deposit ?? "-"}</span>
      </div>
      <div class="fact-item">
        <span class="fact-label">Term:</span>
        <span class="fact-value">${escapeHtml(keyFacts.start || "-")} → ${escapeHtml(keyFacts.end || "-")}</span>
      </div>
    </div>
  `;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Sign Lease • SwiftRent</title>
  <style>
    * { box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      margin: 0; 
      padding: 0; 
      background: #f8fafc; 
      color: #1a202c; 
      line-height: 1.5;
    }
    .container { 
      max-width: 720px; 
      margin: 0 auto; 
      padding: 16px 16px 80px; 
    }
    .header {
      text-align: center;
      margin-bottom: 24px;
      padding: 20px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .logo {
      width: 48px;
      height: 48px;
      background: #0b67ff;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 18px;
      margin: 0 auto 12px;
    }
    h1 { 
      font-size: 24px; 
      margin: 0 0 8px; 
      color: #0b67ff;
    }
    .role-badge {
      display: inline-block;
      background: #e2e8f0;
      color: #475569;
      padding: 4px 12px;
      border-radius: 16px;
      font-size: 14px;
      font-weight: 500;
    }
    .card { 
      background: white; 
      border-radius: 12px; 
      box-shadow: 0 1px 3px rgba(0,0,0,0.1); 
      padding: 20px; 
      margin-bottom: 16px; 
    }
    .key-facts {
      display: grid;
      gap: 12px;
    }
    .fact-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .fact-item:last-child {
      border-bottom: none;
    }
    .fact-label {
      font-weight: 600;
      color: #64748b;
    }
    .fact-value {
      font-weight: 500;
      color: #1a202c;
    }
    .pdf-container {
      width: 100%;
      height: 400px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      margin-bottom: 16px;
    }
    .signature-section h3 {
      margin: 0 0 16px;
      color: #374151;
      font-size: 18px;
    }
    .signature-pad { 
      border: 2px dashed #cbd5e1; 
      border-radius: 8px; 
      height: 160px; 
      width: 100%; 
      background: #f8fafc;
      cursor: crosshair;
    }
    .button-group {
      display: flex;
      gap: 12px;
      margin-top: 16px;
    }
    .btn { 
      flex: 1;
      padding: 12px 20px; 
      border: none; 
      border-radius: 8px; 
      font-weight: 600; 
      font-size: 16px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-secondary { 
      background: #e2e8f0; 
      color: #475569; 
    }
    .btn-secondary:hover {
      background: #cbd5e1;
    }
    .btn-primary { 
      background: #0b67ff; 
      color: white; 
    }
    .btn-primary:hover {
      background: #0756d3;
    }
    .consent-text {
      margin-top: 12px;
      font-size: 14px;
      color: #64748b;
      line-height: 1.4;
    }
    .footer {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      background: white;
      border-top: 1px solid #e2e8f0;
      padding: 12px 16px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
    }
    @media (max-width: 640px) {
      .container { padding: 12px 12px 80px; }
      .card { padding: 16px; }
      h1 { font-size: 20px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">SR</div>
      <h1>Review and Sign Lease</h1>
      <div class="role-badge">Signing as: ${escapeHtml(role)}</div>
    </div>

    <div class="card">
      <h3>Lease Summary</h3>
      ${facts}
    </div>

    <div class="card">
      <h3>Lease Document</h3>
      <iframe src="${escapeHtml(pdfUrl)}" class="pdf-container" title="Lease Document">
        <p>Unable to display PDF. <a href="${escapeHtml(pdfUrl)}" target="_blank">Open in new tab</a></p>
      </iframe>
    </div>

    <div class="card signature-section">
      <h3>Your Signature</h3>
      <p style="margin-bottom: 16px; color: #64748b;">Please draw your signature in the box below:</p>
      <canvas id="signaturePad" class="signature-pad"></canvas>
      <div class="button-group">
        <button id="clearBtn" class="btn btn-secondary">Clear</button>
        <button id="signBtn" class="btn btn-primary">I Agree & Sign</button>
      </div>
      <div class="consent-text">
        By signing this lease, you agree to all terms and conditions outlined in the document above. 
        You consent to the use of electronic signatures and acknowledge that this signature has the same legal effect as a handwritten signature.
      </div>
    </div>
  </div>

  <div class="footer">
    SwiftRent • Safe, direct, commission-free renting
  </div>

  <script>
    // Signature pad implementation
    const canvas = document.getElementById('signaturePad');
    const ctx = canvas.getContext('2d');
    let isDrawing = false;
    let lastPoint = null;

    // Setup canvas
    function resizeCanvas() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      ctx.strokeStyle = '#1a202c';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Drawing functions
    function getEventPos(e) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (e.clientX || e.touches[0].clientX) - rect.left,
        y: (e.clientY || e.touches[0].clientY) - rect.top
      };
    }

    function startDrawing(e) {
      isDrawing = true;
      lastPoint = getEventPos(e);
      e.preventDefault();
    }

    function draw(e) {
      if (!isDrawing) return;
      e.preventDefault();
      
      const currentPoint = getEventPos(e);
      ctx.beginPath();
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(currentPoint.x, currentPoint.y);
      ctx.stroke();
      lastPoint = currentPoint;
    }

    function stopDrawing() {
      isDrawing = false;
      lastPoint = null;
    }

    // Mouse events
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    // Touch events
    canvas.addEventListener('touchstart', startDrawing);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', stopDrawing);

    // Clear button
    document.getElementById('clearBtn').onclick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    // Sign button
    document.getElementById('signBtn').onclick = async () => {
      // Check if signature exists
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const hasSignature = imageData.data.some(channel => channel !== 0);
      
      if (!hasSignature) {
        alert('Please draw your signature before proceeding.');
        return;
      }

      const signButton = document.getElementById('signBtn');
      signButton.disabled = true;
      signButton.textContent = 'Processing...';

      try {
        const signatureDataUrl = canvas.toDataURL();
        
        const response = await fetch(window.location.href, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            leaseId: "${leaseId}",
            role: "${role}",
            token: "${token}",
            accept: true,
            signatureDataUrl: signatureDataUrl
          })
        });

        const result = await response.json();
        
        if (!result.ok) {
          throw new Error(result.error || 'Failed to process signature');
        }

        // Redirect to success page
        window.location.href = result.next;
        
      } catch (error) {
        console.error('Signature error:', error);
        alert('Failed to process signature: ' + error.message);
        signButton.disabled = false;
        signButton.textContent = 'I Agree & Sign';
      }
    };
  </script>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (match) => {
    const escapeMap: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return escapeMap[match];
  });
}