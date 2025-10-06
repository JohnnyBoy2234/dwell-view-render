import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, currentPage } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Build system prompt with page context
    const systemPrompt = `You are SwiftRent AI Support Assistant, helping users with the SwiftRent property management platform in South Africa.

${currentPage ? `CURRENT PAGE CONTEXT: The user is currently on: ${currentPage}` : ''}

PLATFORM OVERVIEW:
SwiftRent is a comprehensive property management platform for South African landlords and tenants.

LANDLORD FEATURES:
- Property Management: Add properties, upload photos, set pricing, manage availability
- Tenant Applications: Review applications, check KYC verification, approve/decline applicants
- Lease Management: Create lease agreements, send for e-signature, manage active leases
- Payment Tracking: Monitor rent payments, send payment reminders, view transaction history
- Maintenance Requests: Receive and manage maintenance requests from tenants, assign contractors
- SwiftBooks Accounting: Track income/expenses, generate tax invoices, view financial reports
- Messaging: Communicate with tenants, schedule viewings, send offers

TENANT FEATURES:
- Property Search: Browse available properties, filter by location/price/features
- Viewing Bookings: Book property viewings, receive confirmations
- Applications: Submit rental applications with KYC documents (ID, proof of income)
- Lease Signing: Review and digitally sign lease agreements
- Rent Payments: Make secure rent payments online
- Maintenance: Submit maintenance requests with photos, track progress
- Messaging: Communicate with landlords

NAVIGATION:
- Landlords: Dashboard → Properties → Applications → Leases → Payments → Maintenance → SwiftBooks
- Tenants: Dashboard → Browse Properties → My Applications → My Leases → Payments → Maintenance

KYC VERIFICATION:
All users must verify their identity by uploading ID documents and a selfie before accessing full platform features.

IMPORTANT RULES:
- Be helpful, professional, and specific to South African rental context
- If asked about inappropriate content, politely decline and redirect to platform features
- Guide users step-by-step for complex tasks
- Provide specific navigation instructions when relevant
- Never provide legal advice - suggest consulting a property lawyer for legal questions

If you don't know something, admit it and suggest the user contact human support.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Too many requests. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Service temporarily unavailable. Please try again later.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error('Failed to get AI response');
    }

    // Stream the response back to client
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
      },
    });

  } catch (error) {
    console.error('Error in ai-support-chat:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
