import { supabase } from "@mzanzihomes/supabase/client";
import { toast } from "@mzanzihomes/ui/hooks/use-toast";

export type CallpayPlan = {
  plan_code: string;
  amount: number;
  item_name: string;
  item_description?: string;
  returnUrl?: string;
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
  try {
    console.log('[CallPay] Starting checkout for plan:', plan);
    const browserReturnUrl = typeof window !== 'undefined' ? window.location.origin : undefined;
    const payload = {
      ...plan,
      returnUrl: plan.returnUrl ?? browserReturnUrl,
    };

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('[CallPay] User not authenticated:', authError);
      toast({
        title: "Authentication Required",
        description: "Please log in to subscribe to a plan",
        variant: "destructive",
      });
      throw new Error('User must be authenticated to subscribe');
    }

    console.log('[CallPay] User authenticated:', user.id);

    // Call edge function to initiate payment
    console.log('[CallPay] Calling callpay-initiate edge function...');
    let data, error;
    
    try {
      const result = await supabase.functions.invoke('callpay-initiate', {
        body: payload,
      });
      data = result.data;
      error = result.error;
    } catch (invokeError: any) {
      console.error('[CallPay] Invoke failed, trying direct fetch fallback:', invokeError);
      
      // Fallback to direct fetch
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rsfrvjaqxhoqavvscvwf.supabase.co';
      const functionsBase = supabaseUrl.replace('.supabase.co', '.functions.supabase.co');
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      
      const functionUrl = `${functionsBase}/callpay-initiate`;
      console.log('[CallPay] Direct fetch to:', functionUrl);
      
      const resp = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token ?? ''}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
        },
        body: JSON.stringify(plan),
      });
      
      if (!resp.ok) {
        const errorText = await resp.text();
        console.error('[CallPay] Direct fetch error:', resp.status, errorText);
        throw new Error(`Payment initialization failed: ${resp.status}`);
      }
      
      data = await resp.json();
      console.log('[CallPay] Direct fetch successful:', data);
    }
    
    if (error) {
      console.error('[CallPay] Edge function error:', error);
      toast({
        title: "Payment Initialization Failed",
        description: error.message || "Could not start payment process. Please try again.",
        variant: "destructive",
      });
      throw error;
    }

    if (!data || !data.payment_key) {
      console.error('[CallPay] Invalid response from edge function:', data);
      toast({
        title: "Payment Error",
        description: "Invalid payment response. Please contact support.",
        variant: "destructive",
      });
      throw new Error('Invalid payment response');
    }

    console.log('[CallPay] Payment key received:', data.payment_key);
    const { payment_key, origin } = data as { payment_key: string; origin: string };

    // Load CallPay scripts with error handling
    console.log('[CallPay] Loading payment scripts...');
    await loadCallPayScripts(origin);

    // Initialize checkout with timeout
    console.log('[CallPay] Initializing checkout widget...');
    await initializeCheckout(payment_key);

    toast({
      title: "Payment Initialized",
      description: "Please complete your payment in the popup window",
    });

  } catch (error) {
    console.error('[CallPay] Checkout error:', error);
    
    // Only show toast if we haven't already shown one
    if (error instanceof Error && !error.message.includes('authenticated')) {
      toast({
        title: "Payment Error",
        description: "Could not start payment. Please try again or contact support.",
        variant: "destructive",
      });
    }
    
    throw error;
  }
}

async function loadCallPayScripts(origin: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Script loading timeout'));
    }, 10000);

    // Load jQuery if not already loaded
    if (!document.getElementById('callpay-jquery')) {
      const jquery = document.createElement('script');
      jquery.id = 'callpay-jquery';
      jquery.src = 'https://code.jquery.com/jquery-1.12.4.min.js';
      jquery.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Failed to load jQuery'));
      };
      document.head.appendChild(jquery);
    }

    // Load CallPay checkout script
    if (!document.getElementById('og-checkout')) {
      const checkoutScript = document.createElement('script');
      checkoutScript.id = 'og-checkout';
      checkoutScript.src = 'https://payments.onegate.co.za/ext/checkout/v3/checkout.js';
      checkoutScript.setAttribute('data-origin', origin);
      checkoutScript.onload = () => {
        clearTimeout(timeout);
        console.log('[CallPay] Scripts loaded successfully');
        resolve();
      };
      checkoutScript.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Failed to load CallPay script'));
      };
      document.head.appendChild(checkoutScript);
    } else {
      clearTimeout(timeout);
      resolve();
    }
  });
}

async function initializeCheckout(paymentKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max

    const checkAndInit = () => {
      attempts++;

      if (window.eftSec?.checkout) {
        console.log('[CallPay] Widget initialized successfully');
        window.eftSec.checkout.init({
          paymentKey: paymentKey,
          paymentType: 'eft',
          onLoad: () => {
            console.log('[CallPay] Checkout widget loaded');
            resolve();
          },
        });
      } else if (attempts >= maxAttempts) {
        console.error('[CallPay] Widget initialization timeout');
        reject(new Error('Payment widget failed to load'));
      } else {
        setTimeout(checkAndInit, 100);
      }
    };

    setTimeout(checkAndInit, 500);
  });
}
