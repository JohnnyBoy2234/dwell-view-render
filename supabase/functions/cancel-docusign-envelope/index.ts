// @ts-nocheck
Deno.serve(async (req) => {
  try {
    const { envelopeId, reason } = await req.json();
    if (!envelopeId) {
      return new Response(JSON.stringify({ error: "envelopeId is required" }), { status: 400 });
    }
    // TODO: Void DocuSign envelope
    return new Response(JSON.stringify({ error: "Not implemented" }), { status: 501 });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
