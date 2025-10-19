// @ts-nocheck
Deno.serve(async (req) => {
  try {
    const { envelopeId } = await req.json();
    if (!envelopeId) {
      return new Response(JSON.stringify({ error: "envelopeId is required" }), { status: 400 });
    }
    // TODO: Fetch combined document from DocuSign and return a URL or binary
    return new Response(JSON.stringify({ error: "Not implemented" }), { status: 501 });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
