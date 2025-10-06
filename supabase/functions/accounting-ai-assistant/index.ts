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
    const { action, data } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let systemPrompt = "";
    let userPrompt = "";

    switch (action) {
      case 'categorize':
        systemPrompt = "You are a financial assistant for South African landlords. Categorize expenses accurately based on common property management categories: Maintenance, Utilities (Water/Electricity), Rates & Taxes, Insurance, Bank Fees, SwiftRent Subscription, or Other.";
        userPrompt = `Categorize this expense: "${data.description}". Respond with just the category name.`;
        break;

      case 'insights':
        systemPrompt = "You are a financial advisor for South African property owners. Provide actionable insights based on transaction data.";
        userPrompt = `Analyze these financial metrics:
- Rent Collected: R${data.rentCollected}
- Total Expenses: R${data.expenses}
- Net Income: R${data.netIncome}
- Expense Categories: ${JSON.stringify(data.categoryBreakdown)}

Provide 3 brief, actionable insights for improving profitability (max 50 words each).`;
        break;

      case 'suggest-description':
        systemPrompt = "You are a bookkeeping assistant. Generate clear, professional transaction descriptions.";
        userPrompt = `Create a concise description for this ${data.type}:
Category: ${data.category}
Amount: R${data.amount}
${data.vendor ? `Vendor: ${data.vendor}` : ''}

Return only the description (max 100 characters).`;
        break;

      case 'monthly-summary':
        systemPrompt = "You are a financial analyst specializing in South African property management. Provide clear, actionable monthly summaries.";
        userPrompt = `Summarize this month's financial performance:
- Income: R${data.income}
- Expenses: R${data.expenses}
- Net Profit: R${data.netProfit}
- Top Expense Category: ${data.topCategory} (R${data.topCategoryAmount})

Provide a brief summary (max 100 words) with 2 recommendations.`;
        break;

      default:
        throw new Error("Invalid action");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), 
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), 
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI Gateway returned ${response.status}`);
    }

    const result = await response.json();
    const aiResponse = result.choices?.[0]?.message?.content || "";

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in accounting-ai-assistant:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
