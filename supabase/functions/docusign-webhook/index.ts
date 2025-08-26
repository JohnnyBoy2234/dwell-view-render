// @ts-nocheck
// NOTE: Configure this endpoint URL inside DocuSign Connect settings.
// Ensure validation of HMAC/signature in production.
Deno.serve(async (req) => {
  try {
    const payload = await req.text();
    const headers: Record<string, string> = {};
    req.headers.forEach((v, k) => (headers[k.toLowerCase()] = v));
    // TODO: verify signature and parse payload; update DB tenancies by envelopeId
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
