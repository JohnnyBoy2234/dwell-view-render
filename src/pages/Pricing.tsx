import React from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startPayfastCheckout } from "@/services/payfastService";

const PLAN_CARD = "rounded-xl border bg-card text-card-foreground shadow-sm flex flex-col";
const PLAN_HEADER = "p-6 border-b";
const PLAN_TITLE = "text-xl font-semibold";
const PLAN_PRICE = "text-3xl font-bold mt-2";
const PLAN_DESC = "text-muted-foreground mt-2";
const PLAN_BODY = "p-6 flex-1";
const FEATURE = "flex items-start gap-2 text-sm mb-2";
const CHECK_ICON = "h-4 w-4 text-green-600 mt-0.5";

const SectionHeader: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <div className="text-center max-w-2xl mx-auto mb-10">
    <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{title}</h1>
    {subtitle && <p className="text-muted-foreground mt-3">{subtitle}</p>}
  </div>
);

const Feature: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className={FEATURE}>
    <Check className={CHECK_ICON} />
    <span>{children}</span>
  </div>
);

export default function Pricing() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <SectionHeader
        title="SwiftRent Pricing Plans"
        subtitle="Simple, transparent pricing for every type of landlord"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Basic Listing */}
        <div className={`${PLAN_CARD}`}>
          <div className={PLAN_HEADER}>
            <div className="text-ocean-blue font-semibold">Basic Listing</div>
            <h3 className={PLAN_TITLE}>Once-off Listing</h3>
            <div className={PLAN_PRICE}>R99<span className="text-base font-medium text-muted-foreground"> / listing</span></div>
            <p className={PLAN_DESC}>One-time fee. Listing stays live until rented.</p>
          </div>
          <div className={PLAN_BODY}>
            <Feature>Single property listing on SwiftRent</Feature>
            <Feature>Exposure to verified tenants</Feature>
            <Feature>Tenant messaging via phone/email (outside platform)</Feature>
          </div>
          <div className="p-6 pt-0">
            <Button className="w-full" onClick={() => startPayfastCheckout({ plan_code: 'basic_listing', amount: 99, item_name: 'SwiftRent Basic Listing', item_description: 'Once-off listing fee' })}>Get Started</Button>
          </div>
        </div>

        {/* Pro Landlord */}
        <div className={`${PLAN_CARD} ring-1 ring-ocean-blue/10`}> 
          <div className={PLAN_HEADER}>
            <div className="text-ocean-blue font-semibold">Pro Landlord</div>
            <h3 className={PLAN_TITLE}>Monthly Subscription</h3>
            <div className={PLAN_PRICE}>R399<span className="text-base font-medium text-muted-foreground"> / month</span></div>
            <p className={PLAN_DESC}>Handle every part of the rental journey inside SwiftRent.</p>
          </div>
          <div className={PLAN_BODY}>
            <Feature>Unlimited property listings</Feature>
            <Feature>Verified tenants</Feature>
            <Feature>In-platform messaging</Feature>
            <Feature>Digital lease agreements tailored for South African law</Feature>
            <Feature>Legally binding e-signatures</Feature>
            <Feature>Inventory tracker (upload & timestamped records)</Feature>
            <Feature>Maintenance management — tenants submit requests from their dashboard</Feature>
          </div>
          <div className="p-6 pt-0">
            <Button className="w-full bg-ocean-blue hover:bg-ocean-blue-dark text-white" onClick={() => startPayfastCheckout({ plan_code: 'pro_landlord', amount: 399, item_name: 'SwiftRent Pro Landlord', item_description: 'Pro Landlord monthly subscription' })}>Upgrade to Pro</Button>
            <p className="text-xs text-muted-foreground text-center mt-2">Added Benefit: Handle every step from listing to lease inside SwiftRent.</p>
          </div>
        </div>

        {/* Premium Landlord */}
        <div className={`${PLAN_CARD} ring-2 ring-success-green/20`}> 
          <div className={PLAN_HEADER}>
            <div className="text-success-green font-semibold">Premium Landlord</div>
            <h3 className={PLAN_TITLE}>Monthly Subscription</h3>
            <div className={PLAN_PRICE}>R999<span className="text-base font-medium text-muted-foreground"> / month</span></div>
            <p className={PLAN_DESC}>Advanced tools for growing portfolios.</p>
          </div>
          <div className={PLAN_BODY}>
            <Feature>Unlimited listings per year</Feature>
            <Feature>SwiftBooks generates profit and loss statements and monthly tax invoices</Feature>
            <Feature>Real-time notifications for rent payments, renewals & maintenance updates</Feature>
            <Feature>Automated tenant reminders</Feature>
          </div>
          <div className="p-6 pt-0">
            <Button className="w-full bg-success-green hover:bg-success-green-dark text-white" onClick={() => startPayfastCheckout({ plan_code: 'premium_landlord', amount: 999, item_name: 'SwiftRent Premium Landlord', item_description: 'Premium Landlord monthly subscription' })}>Go Premium</Button>
            <p className="text-xs text-muted-foreground text-center mt-2">Added Benefit: Full-stack digital property management designed for small-to-mid portfolios.</p>
          </div>
        </div>

        {/* Premium Gold */}
        <div className={`${PLAN_CARD} border-2 border-amber-500`}> 
          <div className={PLAN_HEADER}>
            <div className="text-amber-600 font-semibold">Premium Gold</div>
            <h3 className={PLAN_TITLE}>Annual (Once-off)</h3>
            <div className={PLAN_PRICE}>R4,999<span className="text-base font-medium text-muted-foreground"> / year</span></div>
            <p className={PLAN_DESC}>Everything in Premium, plus concierge.</p>
          </div>
          <div className={PLAN_BODY}>
            <Feature>Full maintenance concierge service</Feature>
            <Feature>SwiftRent intercepts and manages maintenance</Feature>
            <Feature>We liaise with contractors; you approve</Feature>
            <Feature>VIP landlord support line</Feature>
            <Feature>Annual rental performance report</Feature>
          </div>
          <div className="p-6 pt-0">
            <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white" onClick={() => startPayfastCheckout({ plan_code: 'premium_gold', amount: 4999, item_name: 'SwiftRent Premium Gold', item_description: 'Annual plan' })}>Get Premium Gold</Button>
          </div>
        </div>
      </div>

      {/* FAQ / Notes */}
      <div className="mt-12 text-center text-sm text-muted-foreground">
        Prices include VAT where applicable. Plans can be changed or cancelled anytime.
      </div>
    </div>
  );
}


