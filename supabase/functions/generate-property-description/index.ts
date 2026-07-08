import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You write property listing descriptions for MzanziHomes, a South African rental platform. Write a warm, professional and appealing description aimed at prospective tenants.

RULES:
- 90 to 140 words, in two short paragraphs.
- Highlight the layout, standout features and the appeal of the surrounding area. You may mention typical conveniences for the given location (transport, shops, schools) in general terms, but do NOT invent specific named places or facts.
- Use South African English and the Rand (R) where money is relevant.
- Do NOT contradict or exaggerate the details provided, and do not claim amenities that were not given.
- Return ONLY the description text — no headings, markdown, bullet points, quotes or emojis.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      property_type, location, bedrooms, bathrooms, parking_spaces,
      furnished, pets_allowed, amenities, price, listing_type,
    } = body || {};

    if (!property_type && !location) {
      return new Response(
        JSON.stringify({ error: 'Provide at least a property type or location.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const facts = [
      property_type && `Type: ${property_type}`,
      location && `Location: ${location}`,
      bedrooms != null && bedrooms !== '' && `Bedrooms: ${bedrooms}`,
      bathrooms != null && bathrooms !== '' && `Bathrooms: ${bathrooms}`,
      parking_spaces != null && parking_spaces !== '' && `Parking bays: ${parking_spaces}`,
      furnished != null && (furnished ? 'Furnished' : 'Unfurnished'),
      pets_allowed != null && (pets_allowed ? 'Pets allowed' : 'No pets'),
      Array.isArray(amenities) && amenities.length ? `Amenities: ${amenities.join(', ')}` : null,
      price ? `Monthly rent: R${price}` : null,
      listing_type && `Listing type: ${listing_type}`,
    ].filter(Boolean).join('\n');

    const upstream = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Write a listing description for this property:\n${facts}` },
        ],
        stream: false,
      }),
    });

    if (!upstream.ok) {
      const status = upstream.status === 429 ? 429 : 500;
      return new Response(
        JSON.stringify({ error: `Upstream error: ${upstream.status}` }),
        { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await upstream.json();
    const description = (data.choices?.[0]?.message?.content || '').trim();

    if (!description) {
      throw new Error('No description was generated. Please try again.');
    }

    return new Response(
      JSON.stringify({ description }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-property-description:', error);
    const status = (error as any)?.status === 429 ? 429 : 500;
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
