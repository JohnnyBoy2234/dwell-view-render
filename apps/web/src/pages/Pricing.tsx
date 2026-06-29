import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@mzanzihomes/ui/components/button";
import { startCallpayCheckout } from "@/services/callpayService";
import { SectionHeader } from "@mzanzihomes/ui/components/SectionHeader";
import { toast } from "@mzanzihomes/ui/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
import { Badge } from "@mzanzihomes/ui/components/badge";

const Feature: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-start gap-2.5 text-sm">
    <Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
    <span className="text-muted-foreground">{children}</span>
  </div>
);

export default function Pricing() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [proBilling, setProBilling] = useState<'monthly' | 'yearly'>('yearly');
  const [premiumBilling, setPremiumBilling] = useState<'monthly' | 'yearly'>('yearly');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const { plan, loading: subscriptionLoading } = useSubscription();

  type PaidPlan = 'pro' | 'premium';

  const renderPlanBadge = (targetPlan: PaidPlan) => {
    if (subscriptionLoading) {
      return null;
    }

    if (targetPlan === 'pro') {
      if (plan === 'pro') {
        return <Badge className="bg-blue-600 text-white">Current Plan</Badge>;
      }
      if (plan === 'premium') {
        return <Badge className="bg-amber-600 text-white">Included in Premium</Badge>;
      }
    }

    if (targetPlan === 'premium' && plan === 'premium') {
      return <Badge className="bg-amber-600 text-white">Current Plan</Badge>;
    }

    return null;
  };

  const renderPlanButton = (targetPlan: PaidPlan) => {
    if (subscriptionLoading) {
      return (
        <Button className="w-full mb-6" disabled>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Checking plan...
        </Button>
      );
    }

    if (targetPlan === 'pro') {
      if (plan === 'pro') {
        return (
          <Button className="w-full mb-6" variant="outline" disabled>
            You're on this plan
          </Button>
        );
      }
      if (plan === 'premium') {
        return (
          <Button className="w-full mb-6" variant="outline" disabled>
            Included with Premium
          </Button>
        );
      }
    }

    if (targetPlan === 'premium' && plan === 'premium') {
      return (
        <Button className="w-full mb-6" variant="outline" disabled>
          You're on this plan
        </Button>
      );
    }

    const handler = targetPlan === 'pro' ? handleProCheckout : handlePremiumCheckout;
    const label = targetPlan === 'pro' ? 'Choose Pro' : 'Choose Premium';
    const isProcessing = loadingPlan === targetPlan;

    return (
      <Button
        className="w-full mb-6"
        onClick={handler}
        disabled={loadingPlan !== null}
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          label
        )}
      </Button>
    );
  };

  useEffect(() => {
    const error = searchParams.get('error');
    const canceled = searchParams.get('canceled');
    const reference = searchParams.get('reference');

    // Redirect to payment failed page instead of showing toast
    if (error === '1') {
      navigate(`/payment-failed?reason=error${reference ? `&reference=${reference}` : ''}`);
    } else if (canceled === '1') {
      navigate(`/payment-failed?reason=cancelled${reference ? `&reference=${reference}` : ''}`);
    }
  }, [searchParams, navigate]);

  const handleProCheckout = async () => {
    if (subscriptionLoading) {
      return;
    }
    if (plan === 'pro') {
      toast({
        title: "You're already on Pro",
        description: "Visit your dashboard to start using Pro features.",
      });
      return;
    }
    if (plan === 'premium') {
      toast({
        title: "Already covered",
        description: "Premium already includes every Pro feature.",
      });
      return;
    }

    console.log('[Pricing] Pro checkout button clicked');
    setLoadingPlan('pro');
    try {
      await startCallpayCheckout({
        plan_code: 'pro_landlord_monthly',
        amount: 8,
        item_name: 'MzanziHomes Pro Landlord (Monthly)',
        item_description: 'Monthly billing',
      });
      console.log('[Pricing] Pro checkout initiated successfully');
    } catch (error) {
      console.error('[Pricing] Pro checkout failed:', error);
    } finally {
      setLoadingPlan(null);
    }
  };

  const handlePremiumCheckout = async () => {
    if (subscriptionLoading) {
      return;
    }
    if (plan === 'premium') {
      toast({
        title: "You're already on Premium",
        description: "Thanks for being on our top plan!",
      });
      return;
    }

    console.log('[Pricing] Premium checkout button clicked');
    setLoadingPlan('premium');
    try {
      await startCallpayCheckout({
        plan_code: 'premium_landlord_monthly',
        amount: 8,
        item_name: 'MzanziHomes Premium Landlord (Monthly)',
        item_description: 'Monthly billing',
      });
      console.log('[Pricing] Premium checkout initiated successfully');
    } catch (error) {
      console.error('[Pricing] Premium checkout failed:', error);
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-background py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <SectionHeader
          title="Pricing"
          subtitle="Start for free. Upgrade to get the capacity that exactly matches your needs."
        />

        {!subscriptionLoading && plan !== 'free' && (
          <div className="max-w-6xl mx-auto mb-8 flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-primary">
              <Check className="h-4 w-4" />
              <span>
                You&apos;re currently on the {plan === 'premium' ? 'Premium' : 'Pro'} plan
              </span>
            </div>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {/* Basic Listing */}
          <div className="rounded-2xl border-2 border-green-400 bg-green-50 p-8 flex flex-col">
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Basic Listing</h3>
              <p className="text-sm text-muted-foreground mb-4">One-time fee. Listing stays live until rented.</p>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-4xl font-bold text-green-700">Free</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground line-through">R99</span>
                <span className="text-xs font-semibold bg-green-600 text-white px-2 py-0.5 rounded">Now Free</span>
              </div>
            </div>

            <Button 
              className="w-full mb-6"
              onClick={() => navigate('/list-property')}
            >
              Start Listing (Free)
            </Button>

            <div className="space-y-3 flex-1">
              <Feature>Single property listing on MzanziHomes</Feature>
              <Feature>Exposure to verified tenants</Feature>
              <Feature>Tenant messaging via phone/email (outside platform)</Feature>
            </div>
          </div>

          {/* Pro Landlord - Highlighted */}
          <div className="rounded-2xl border-2 border-blue-400 bg-blue-50 p-8 flex flex-col relative shadow-lg">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
              Most Popular
            </div>
            
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold">Pro Landlord</h3>
                {renderPlanBadge('pro')}
              </div>
              <p className="text-sm text-muted-foreground mb-4">Handle every step from listing to lease inside MzanziHomes.</p>
              <div className="inline-flex items-center gap-1 p-1 bg-muted rounded-lg mb-3">
                <button
                  onClick={() => setProBilling('yearly')}
                  className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${proBilling === 'yearly' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Annual
                </button>
                <button
                  onClick={() => setProBilling('monthly')}
                  className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${proBilling === 'monthly' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Monthly
                </button>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-4xl font-bold">R8</span>
                <span className="text-muted-foreground">/ month</span>
              </div>
            </div>

            {renderPlanButton('pro')}

            <div className="space-y-3 flex-1">
              <Feature>Unlimited property listings</Feature>
              <Feature>Verified tenants</Feature>
              <Feature>In-platform messaging</Feature>
              <Feature>Digital lease agreements tailored for South African law</Feature>
              <Feature>Legally binding e-signatures</Feature>
              <Feature>Inventory tracker (upload & timestamped records)</Feature>
              <Feature>Maintenance management - tenants submit requests from their dashboard</Feature>
              <Feature>SwiftBooks (income/expenses + invoices)</Feature>
              <Feature>AI support</Feature>
              <Feature>Automated tenant reminders</Feature>
            </div>
          </div>

          {/* Premium Landlord (Gold) */}
          <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-8 flex flex-col">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold text-amber-900">Premium Landlord</h3>
                {renderPlanBadge('premium')}
              </div>
              <p className="text-sm text-muted-foreground mb-4">Everything in Pro, plus concierge service.</p>
              <div className="inline-flex items-center gap-1 p-1 bg-amber-200/60 rounded-lg mb-3">
                <button
                  onClick={() => setPremiumBilling('yearly')}
                  className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${premiumBilling === 'yearly' ? 'bg-amber-100 text-amber-900 shadow-sm' : 'text-amber-900/70 hover:text-amber-900'}`}
                >
                  Annual
                </button>
                <button
                  onClick={() => setPremiumBilling('monthly')}
                  className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${premiumBilling === 'monthly' ? 'bg-amber-100 text-amber-900 shadow-sm' : 'text-amber-900/70 hover:text-amber-900'}`}
                >
                  Monthly
                </button>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-4xl font-bold">R8</span>
                <span className="text-muted-foreground">/ month</span>
              </div>
            </div>

            {renderPlanButton('premium')}

            <div className="space-y-3 flex-1">
              {/* All Pro features (bold) */}
              <div className="space-y-2">
                <div className="flex items-start gap-2.5 text-sm font-semibold"><Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />Unlimited property listings</div>
                <div className="flex items-start gap-2.5 text-sm font-semibold"><Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />Verified tenants</div>
                <div className="flex items-start gap-2.5 text-sm font-semibold"><Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />In-platform messaging</div>
                <div className="flex items-start gap-2.5 text-sm font-semibold"><Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />Digital lease agreements tailored for South African law</div>
                <div className="flex items-start gap-2.5 text-sm font-semibold"><Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />Legally binding e-signatures</div>
                <div className="flex items-start gap-2.5 text-sm font-semibold"><Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />Inventory tracker (upload & timestamped records)</div>
                <div className="flex items-start gap-2.5 text-sm font-semibold"><Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />Maintenance management - tenants submit requests from their dashboard</div>
                <div className="flex items-start gap-2.5 text-sm font-semibold"><Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />SwiftBooks (income/expenses + invoices)</div>
                <div className="flex items-start gap-2.5 text-sm font-semibold"><Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />AI support</div>
                <div className="flex items-start gap-2.5 text-sm font-semibold"><Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />Automated tenant reminders</div>
              </div>
              {/* Premium concierge benefits */}
              <div className="space-y-2 mt-3">
                <Feature>Full maintenance concierge service</Feature>
                <Feature>MzanziHomes intercepts and manages maintenance</Feature>
                <Feature>We liaise with contractors; you approve</Feature>
                <Feature>VIP landlord support line</Feature>
                <Feature>Annual rental performance report</Feature>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-16 text-center text-sm text-muted-foreground max-w-2xl mx-auto">
          Prices include VAT where applicable. Plans can be changed or cancelled anytime.
        </div>
      </div>
    </div>
  );
}



