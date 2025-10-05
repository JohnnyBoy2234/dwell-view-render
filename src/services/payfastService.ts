import { supabase } from "@/integrations/supabase/client";

export type PayfastPlan = {
  plan_code: string;
  amount: number;
  item_name: string;
  item_description?: string;
};

export async function startPayfastCheckout(plan: PayfastPlan) {
  const { data, error } = await supabase.functions.invoke('payfast-initiate', {
    body: plan,
  });
  if (error) throw error;

  const { url, fields } = data as { url: string; fields: Record<string, string> };

  // Build and submit a form to redirect to PayFast
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = url;
  form.style.display = 'none';
  Object.entries(fields).forEach(([k, v]) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = k;
    input.value = String(v ?? '');
    form.appendChild(input);
  });
  document.body.appendChild(form);
  form.submit();
}


