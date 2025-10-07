import React, { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startPayfastCheckout } from "@/services/payfastService";
import { SectionHeader } from "@/components/ui/SectionHeader";

const Feature: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-start gap-2.5 text-sm">
    <Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
    <span className="text-muted-foreground">{children}</span>
  </div>
);

export default function Pricing() {
  const [proBilling, setProBilling] = useState<'monthly' | 'yearly'>('yearly');
  const [premiumBilling, setPremiumBilling] = useState<'monthly' | 'yearly'>('yearly');

  return (
    <div className="min-h-screen bg-background py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <SectionHeader
          title="Pricing"
          subtitle="Start for free. Upgrade to get the capacity that exactly matches your needs."
        />

        

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
              onClick={() => startPayfastCheckout({ 
                plan_code: 'basic_listing', 
                amount: 99, 
                item_name: 'SwiftRent Basic Listing', 
                item_description: 'Once-off listing fee' 
              })}
            >
              Get Started
            </Button>

            <div className="space-y-3 flex-1">
              <Feature>Single property listing on SwiftRent</Feature>
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
              <h3 className="text-lg font-semibold mb-2">Pro Landlord</h3>
              <p className="text-sm text-muted-foreground mb-4">Handle every step from listing to lease inside SwiftRent.</p>
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
                <span className="text-4xl font-bold">
                  R{proBilling === 'monthly' ? '199' : '135'}
                </span>
                <span className="text-muted-foreground">/ month</span>
              </div>
              {proBilling === 'yearly' && (
                <p className="text-xs font-bold inline-flex items-center gap-2 text-green-800 bg-green-200 border border-green-400 rounded-full px-3 py-1">Save R700</p>
              )}
            </div>

            <Button 
              className="w-full mb-6"
              onClick={() => {
                const isYearly = proBilling === 'yearly';
                startPayfastCheckout({
                  plan_code: isYearly ? 'pro_landlord_yearly' : 'pro_landlord_monthly',
                  amount: isYearly ? 1600 : 199,
                  item_name: isYearly ? 'SwiftRent Pro Landlord (Yearly)' : 'SwiftRent Pro Landlord (Monthly)',
                  item_description: isYearly ? 'Annual billing' : 'Monthly billing',
                });
              }}
            >
              {proBilling === 'yearly' ? 'Choose Annual' : 'Choose Monthly'}
            </Button>

            <div className="space-y-3 flex-1">
              <Feature>Unlimited property listings</Feature>
              <Feature>Verified tenants</Feature>
              <Feature>In-platform messaging</Feature>
              <Feature>Digital lease agreements tailored for South African law</Feature>
              <Feature>Legally binding e-signatures</Feature>
              <Feature>Inventory tracker (upload & timestamped records)</Feature>
              <Feature>Maintenance management - tenants submit requests from their dashboard</Feature>
              <Feature>SwiftBooks (income/expenses + tax invoices)</Feature>
              <Feature>AI support</Feature>
              <Feature>Automated tenant reminders</Feature>
            </div>
          </div>

          {/* Premium Landlord (Gold) */}
          <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-8 flex flex-col">
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2 text-amber-900">Premium Landlord</h3>
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
                <span className="text-4xl font-bold">R{premiumBilling === 'monthly' ? '700' : '500'}</span>
                <span className="text-muted-foreground">/ month</span>
              </div>
              {premiumBilling === 'yearly' && (
                <p className="text-xs font-bold inline-flex items-center gap-2 text-green-800 bg-green-200 border border-green-400 rounded-full px-3 py-1">Save R2,400</p>
              )}
            </div>

            <Button 
              className="w-full mb-6"
              onClick={() => {
                const isYearly = premiumBilling === 'yearly';
                startPayfastCheckout({
                  plan_code: isYearly ? 'premium_landlord_yearly' : 'premium_landlord_monthly',
                  amount: isYearly ? 6000 : 700,
                  item_name: isYearly ? 'SwiftRent Premium Landlord (Yearly)' : 'SwiftRent Premium Landlord (Monthly)',
                  item_description: isYearly ? 'Annual billing' : 'Monthly billing',
                });
              }}
            >
              {premiumBilling === 'yearly' ? 'Choose Annual' : 'Choose Monthly'}
            </Button>

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
                <div className="flex items-start gap-2.5 text-sm font-semibold"><Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />SwiftBooks (income/expenses + tax invoices)</div>
                <div className="flex items-start gap-2.5 text-sm font-semibold"><Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />AI support</div>
                <div className="flex items-start gap-2.5 text-sm font-semibold"><Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />Automated tenant reminders</div>
              </div>
              {/* Premium concierge benefits */}
              <div className="space-y-2 mt-3">
                <Feature>Full maintenance concierge service</Feature>
                <Feature>SwiftRent intercepts and manages maintenance</Feature>
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



