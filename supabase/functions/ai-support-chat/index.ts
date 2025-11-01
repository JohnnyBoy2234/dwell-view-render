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

    console.log('Received request:', { messagesCount: messages.length, currentPage });
    console.log('Lovable API Key present:', !!LOVABLE_API_KEY);

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Build system prompt with page context - WEBSITE QUESTIONS ONLY
    const systemPrompt = `You are RentLekker AI Support - a helpful assistant that ONLY answers questions about the RentLekker website and platform.

STRICT RULES:
- ONLY answer questions about RentLekker features, navigation, and how to use the platform
- If asked about anything else (general advice, legal matters, unrelated topics), politely redirect: "I can only help with questions about using the RentLekker platform. How can I assist you with the website?"
- Keep responses brief (2-3 sentences maximum)
- Be friendly and conversational

${currentPage ? `User is currently on: ${currentPage}` : ''}

WHAT YOU CAN HELP WITH:

LANDLORD FEATURES:
• Adding properties → Navigate to "List Property" section
• Reviewing applications → Check "Applications" tab
• Creating leases → Go to "Leases" section
• Tracking payments → Use SwiftBooks feature
• Managing maintenance → Access "Maintenance" board
• Property inspections → Create inspection reports with photos

TENANT FEATURES:
• Browsing properties → Visit "Properties" page
• Booking viewings → Click "Book Viewing" on property cards
• Submitting applications → Fill out the application form
• Signing leases → Use digital signature feature
• Paying rent → Access "Payments" section
• Requesting maintenance → Submit requests via "Maintenance" tab
• Property inspections → Document property condition with photos

NAVIGATION HELP:
• Explain where to find specific features
• Guide through multi-step processes
• Clarify button locations and menu options

WHAT YOU CANNOT HELP WITH:
• Legal advice or tenant rights questions
• Property management advice unrelated to the platform
• General real estate questions
• Technical support for external services
• Personal financial advice`;

    console.log('Calling Lovable AI Gateway...');
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
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), 
          { 
            status: 429, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI service temporarily unavailable. Please try again later.' }), 
          { 
            status: 402, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      const errorText = await response.text();
      console.error('Lovable AI Gateway error:', response.status, errorText);
      throw new Error('AI Gateway error');
    }

    console.log('Lovable AI response received, streaming...');
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
