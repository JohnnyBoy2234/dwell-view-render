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
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');

  return (
    <div className="min-h-screen bg-background py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <SectionHeader
          title="Pricing"
          subtitle="Start for free. Upgrade to get the capacity that exactly matches your needs."
        />

        {/* Billing Toggle */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex items-center gap-1 p-1 bg-muted rounded-lg">
            <button
              onClick={() => setBilling('monthly')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                billing === 'monthly'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling('yearly')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                billing === 'yearly'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Annual
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {/* Basic Listing */}
          <div className="rounded-2xl border bg-card p-8 flex flex-col">
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Basic Listing</h3>
              <p className="text-sm text-muted-foreground mb-4">One-time fee. Listing stays live until rented.</p>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-4xl font-bold">R99</span>
                <span className="text-muted-foreground">/ listing</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground line-through">R200</span>
                <span className="text-xs font-semibold bg-red-500 text-white px-2 py-0.5 rounded">50% OFF</span>
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
          <div className="rounded-2xl border-2 border-primary bg-card p-8 flex flex-col relative shadow-lg">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
              Most Popular
            </div>
            
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Pro Landlord</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {billing === 'monthly' 
                  ? 'Handle every step from listing to lease inside SwiftRent.' 
                  : 'Save R700 per year with annual billing.'}
              </p>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-4xl font-bold">
                  R{billing === 'monthly' ? '199' : '135'}
                </span>
                <span className="text-muted-foreground">/ month</span>
              </div>
              {billing === 'yearly' && (
                <p className="text-sm text-muted-foreground">
                  Billed <span className="font-semibold">R1,600</span> / year
                </p>
              )}
            </div>

            <Button 
              className="w-full mb-6"
              onClick={() => {
                const isYearly = billing === 'yearly';
                startPayfastCheckout({
                  plan_code: isYearly ? 'pro_landlord_yearly' : 'pro_landlord_monthly',
                  amount: isYearly ? 1600 : 199,
                  item_name: isYearly ? 'SwiftRent Pro Landlord (Yearly)' : 'SwiftRent Pro Landlord (Monthly)',
                  item_description: isYearly ? 'Billed annually (R1,600)' : 'Billed monthly',
                });
              }}
            >
              Get Started
            </Button>

            <div className="space-y-3 flex-1">
              <Feature>Unlimited property listings</Feature>
              <Feature>Verified tenants</Feature>
              <Feature>In-platform messaging</Feature>
              <Feature>Digital lease agreements tailored for South African law</Feature>
              <Feature>Legally binding e-signatures</Feature>
              <Feature>Inventory tracker (upload & timestamped records)</Feature>
              <Feature>Maintenance management - tenants submit requests from their dashboard</Feature>
              <Feature>Automated tenant reminders</Feature>
            </div>
          </div>

          {/* Premium Gold */}
          <div className="rounded-2xl border bg-card p-8 flex flex-col">
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Premium Gold</h3>
              <p className="text-sm text-muted-foreground mb-4">Everything in Pro, plus concierge service.</p>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-4xl font-bold">R4,999</span>
                <span className="text-muted-foreground">/ year</span>
              </div>
            </div>

            <Button 
              className="w-full mb-6"
              variant="outline"
              onClick={() => startPayfastCheckout({ 
                plan_code: 'premium_gold', 
                amount: 4999, 
                item_name: 'SwiftRent Premium Gold', 
                item_description: 'Annual plan' 
              })}
            >
              Get Started
            </Button>

            <div className="space-y-3 flex-1">
              <Feature>Full maintenance concierge service</Feature>
              <Feature>SwiftRent intercepts and manages maintenance</Feature>
              <Feature>We liaise with contractors; you approve</Feature>
              <Feature>VIP landlord support line</Feature>
              <Feature>Annual rental performance report</Feature>
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



