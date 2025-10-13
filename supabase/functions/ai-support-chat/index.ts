import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import OpenAI from "npm:openai";

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
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

    console.log('Received request:', { messagesCount: messages.length, currentPage });
    console.log('OpenAI API Key present:', !!OPENAI_API_KEY);

    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Build system prompt with page context
    const systemPrompt = `You are SwiftRent AI Support - a friendly, helpful assistant for South African property management.

KEEP IT SIMPLE:
- Max 3-4 sentences per response
- Use bullet points for lists
- Break complex tasks into steps
- Be conversational and helpful

${currentPage ? `User is on: ${currentPage}` : ''}

LANDLORD FEATURES:
• Add properties → "List Property"
• Review applications → "Applications" tab
• Create leases → "Leases" section
• Track payments → SwiftBooks
• Handle maintenance → "Maintenance" board

TENANT FEATURES:
• Browse properties → "Properties" page
• Book viewings → Click "Book Viewing"
• Submit applications → Fill application form
• Sign leases → Digital signature
• Pay rent → "Payments" section
• Request maintenance → "Maintenance" tab

RULES:
- Stay brief and friendly
- No inappropriate content
- If unsure, suggest human support`;

    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

    console.log('Calling OpenAI API...');
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      stream: true,
    });

    console.log('OpenAI response received, streaming...');
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
