import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { imageData, tenancyId, expectedAmount } = await req.json();

    // Call Lovable AI for OCR extraction
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Extract payment details from this bank proof of payment. Return ONLY a JSON object with: amount (number), date (YYYY-MM-DD), reference (string), bank_name (string), account_last4 (string). Be precise with the amount.`
            },
            {
              type: 'image_url',
              image_url: { url: imageData }
            }
          ]
        }],
        response_format: { type: 'json_object' }
      })
    });

    const aiData = await aiResponse.json();
    const extractedText = aiData.choices[0].message.content;
    const extracted = JSON.parse(extractedText);

    // Calculate confidence based on field completeness
    let confidence = 0;
    if (extracted.amount) confidence += 0.3;
    if (extracted.date) confidence += 0.2;
    if (extracted.reference) confidence += 0.3;
    if (extracted.bank_name) confidence += 0.1;
    if (extracted.account_last4) confidence += 0.1;

    // Validate amount against expected
    const amountMatch = Math.abs(extracted.amount - expectedAmount) <= 5;
    if (!amountMatch) confidence -= 0.2;

    return new Response(JSON.stringify({
      success: true,
      extracted,
      confidence: Math.max(0, Math.min(1, confidence)),
      amountMatch
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('OCR error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});