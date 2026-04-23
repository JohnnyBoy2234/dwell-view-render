import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are the MzanziHomes AI Support assistant. MzanziHomes is a South African property rental platform connecting landlords and tenants.

YOUR ROLE: Answer questions about MzanziHomes features and South African rental law. Be concise, helpful, and friendly. Use plain language.

--- MZANZIHOMES FEATURES ---

LISTING A PROPERTY (Landlords):
- Click "List Property" from the dashboard
- Upload photos, set price, add description and amenities
- Properties appear to tenants after submission

TENANT APPLICATIONS:
- Tenants browse and apply for properties
- Landlords review applications under the "Applications" tab
- Accept or decline with one click

VIEWING REQUESTS:
- Tenants request viewings from the property page
- A conversation is opened between tenant and landlord to schedule
- Landlords can propose times; tenants confirm

DOCUMENTS & LEASES:
- Upload and sign lease agreements digitally
- DocuSign integration for legally binding signatures
- Download documents from the Documents section

PAYMENTS:
- Powered by Paystack
- Landlords set up a Paystack subaccount to receive rent
- Tenants pay rent directly through the app
- Deposits are tracked and returned via the platform

PROFILE & VERIFICATION:
- Update display name, phone, bio, and avatar in Profile settings
- Email verification required to use key features

--- SOUTH AFRICAN RENTAL LAW ---

RENTAL HOUSING ACT (50 of 1999):
- Governs all residential leases in South Africa
- Landlords must provide a habitable, safe property
- Tenants must pay rent on time and not damage the property
- Both parties can approach the Rental Housing Tribunal for disputes (free service)

DEPOSITS:
- Maximum deposit is 2 months' rent
- Must be placed in an interest-bearing bank account
- Landlord must provide proof of the account and interest earned
- After lease ends: 14 days to refund if no damage; 21 days if deductions are made (with itemised list)
- Deductions must be for actual damage beyond fair wear and tear

NOTICE PERIODS:
- Month-to-month lease: minimum 1 calendar month written notice from either party
- Fixed-term lease: cannot be terminated early without agreement or breach of contract
- Landlord cannot increase rent without giving 1 month's written notice

TPN (TENANT PROFILE NETWORK):
- South Africa's rental credit bureau
- Landlords can request credit checks on applicants (standard practice)
- Records: payment history, previous evictions, judgments
- Tenants can request their own TPN report

PIE ACT (Prevention of Illegal Eviction Act, 19 of 1998):
- Landlords CANNOT evict tenants without a court order
- No self-help evictions: changing locks, removing belongings, or cutting utilities are illegal
- Eviction process: issue notice → apply to Magistrate's Court → court date → sheriff serves order

MAINTENANCE:
- Landlord responsible: structural repairs, roof, plumbing, electrical, geysers
- Tenant responsible: day-to-day upkeep, reporting issues promptly, not causing damage
- Tenant cannot withhold rent due to maintenance issues (must use legal channels)

RENTAL HOUSING TRIBUNAL:
- Free dispute resolution service in every province
- Handles: deposit disputes, lease violations, maintenance disputes, unfair rental increases
- File a complaint at your provincial Tribunal office

--- GUIDELINES ---
- For account-specific issues, suggest the "Still need help?" link to submit a support ticket
- For complex legal disputes, recommend consulting a qualified attorney or the Rental Housing Tribunal
- Stay on topic — only discuss MzanziHomes and SA rental matters
- Keep responses concise (3-5 sentences where possible)`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid messages' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (messages.length > 20) {
      return new Response(JSON.stringify({ error: 'Too many messages' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

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
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!upstream.ok) {
      const status = upstream.status === 429 ? 429 : 500;
      return new Response(
        JSON.stringify({ error: `Upstream error: ${upstream.status}` }),
        { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse SSE from Lovable and forward as raw text so the frontend
    // can use its simple TextDecoder reader (no SSE parsing needed client-side).
    const readable = new ReadableStream({
      async start(controller) {
        try {
          const reader = upstream.body!.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            let newlineIdx: number;
            while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
              let line = buffer.slice(0, newlineIdx).trimEnd();
              buffer = buffer.slice(newlineIdx + 1);

              if (!line.startsWith('data: ')) continue;
              const jsonStr = line.slice(6).trim();
              if (jsonStr === '[DONE]') break;

              try {
                const parsed = JSON.parse(jsonStr);
                const text = parsed.choices?.[0]?.delta?.content;
                if (text) {
                  controller.enqueue(new TextEncoder().encode(text));
                }
              } catch {
                // incomplete JSON fragment — skip
              }
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Error in ai-support-chat:', error);
    const status = (error as any)?.status === 429 ? 429 : 500;
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
