import { supabase } from "@/integrations/supabase/client";

export type CallpayPlan = {
  plan_code: string;
  amount: number;
  item_name: string;
  item_description?: string;
};

declare global {
  interface Window {
    eftSec?: {
      checkout: {
        init: (options: {
          paymentKey: string;
          paymentType?: string;
          onLoad?: () => void;
        }) => void;
      };
    };
  }
}

export async function startCallpayCheckout(plan: CallpayPlan) {
  const { data, error } = await supabase.functions.invoke('callpay-initiate', {
    body: plan,
  });
  
  if (error) throw error;

  const { payment_key, origin } = data as { payment_key: string; origin: string };

  // Load CallPay scripts if not already loaded
  if (!document.getElementById('callpay-jquery')) {
    const jquery = document.createElement('script');
    jquery.id = 'callpay-jquery';
    jquery.src = 'https://code.jquery.com/jquery-1.12.4.min.js';
    document.head.appendChild(jquery);
  }

  if (!document.getElementById('og-checkout')) {
    const checkoutScript = document.createElement('script');
    checkoutScript.id = 'og-checkout';
    checkoutScript.src = 'https://payments.onegate.co.za/ext/checkout/v3/checkout.js';
    checkoutScript.setAttribute('data-origin', origin);
    document.head.appendChild(checkoutScript);
  }

  // Wait for scripts to load and initialize checkout
  const initCheckout = () => {
    if (window.eftSec?.checkout) {
      window.eftSec.checkout.init({
        paymentKey: payment_key,
        paymentType: 'eft',
        onLoad: () => {
          console.log('CallPay checkout loaded');
        },
      });
    } else {
      setTimeout(initCheckout, 100);
    }
  };

  setTimeout(initCheckout, 500);
}
