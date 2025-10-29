import React from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { startPayfastCheckout } from "@/services/payfastService";

interface PlanSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChooseFree?: () => void;
  onChoosePro?: (billing: "yearly" | "monthly") => void;
  onChoosePremium?: (billing: "yearly" | "monthly") => void;
}

const Feature: React.FC<{ children: React.ReactNode; bold?: boolean }> = ({ children, bold }) => (
  <div className="flex items-start gap-2.5 text-sm">
    <Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
    <span className={bold ? "font-semibold" : "text-muted-foreground"}>{children}</span>
  </div>
);

export function PlanSelectDialog({ open, onOpenChange, onChooseFree, onChoosePro, onChoosePremium }: PlanSelectDialogProps) {
  const navigate = useNavigate();

  const choosePro = (billing: "yearly" | "monthly") => {
    if (onChoosePro) {
      onOpenChange(false);
      return onChoosePro(billing);
    }
    const isYearly = billing === "yearly";
    startPayfastCheckout({
      plan_code: isYearly ? "pro_landlord_yearly" : "pro_landlord_monthly",
      amount: isYearly ? 1600 : 199,
      item_name: isYearly ? "SwiftRent Pro Landlord (Yearly)" : "SwiftRent Pro Landlord (Monthly)",
      item_description: isYearly ? "Annual billing" : "Monthly billing",
    });
  };

  const choosePremium = (billing: "yearly" | "monthly") => {
    if (onChoosePremium) {
      onOpenChange(false);
      return onChoosePremium(billing);
    }
    const isYearly = billing === "yearly";
    startPayfastCheckout({
      plan_code: isYearly ? "premium_landlord_yearly" : "premium_landlord_monthly",
      amount: isYearly ? 6000 : 700,
      item_name: isYearly ? "SwiftRent Premium Landlord (Yearly)" : "SwiftRent Premium Landlord (Monthly)",
      item_description: isYearly ? "Annual billing" : "Monthly billing",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Choose your plan</DialogTitle>
          <DialogDescription>Select a plan to continue. Annual options are shown first.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
          {/* Basic (Free) */}
          <div className="rounded-xl border-2 border-green-400 bg-green-50 p-4 flex flex-col">
            <h4 className="font-semibold mb-1">Basic Listing</h4>
            <div className="text-2xl font-bold text-green-700 mb-1">Free</div>
            <div className="text-xs text-muted-foreground mb-3">One-time listing. Stays live until rented.</div>
            <div className="space-y-1 mb-4">
              <Feature>Single property listing</Feature>
              <Feature>Exposure to verified tenants</Feature>
            </div>
            <Button onClick={() => { onOpenChange(false); onChooseFree ? onChooseFree() : navigate('/list-property'); }} className="mt-auto">Continue with Free</Button>
          </div>
          {/* Pro */}
          <div className="rounded-xl border-2 border-blue-400 bg-blue-50 p-4 flex flex-col">
            <h4 className="font-semibold mb-1">Pro Landlord</h4>
            <div className="text-sm text-muted-foreground mb-3">Handle every step from listing to lease.</div>
            {/* Annual as primary */}
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-2xl font-bold">R135</span>
              <span className="text-muted-foreground">/ month</span>
            </div>
            <p className="text-xs font-bold inline-flex items-center gap-2 text-green-800 bg-green-200 border border-green-400 rounded-full px-2 py-0.5 w-fit mb-3">Save R700</p>
            <div className="space-y-1 mb-4">
              <Feature>Unlimited property listings</Feature>
              <Feature>In-platform messaging</Feature>
              <Feature>Digital SA lease agreements</Feature>
              <Feature>SwiftBooks (income/expenses + invoices)</Feature>
              <Feature>AI support</Feature>
              <Feature>Automated tenant reminders</Feature>
            </div>
            <div className="mt-auto flex flex-col gap-2">
              <Button onClick={() => { onOpenChange(false); choosePro('yearly'); }}>Continue with Annual</Button>
              <Button variant="outline" onClick={() => { onOpenChange(false); choosePro('monthly'); }}>Switch to Monthly • R199/mo</Button>
            </div>
          </div>
          {/* Premium */}
          <div className="rounded-xl border-2 border-amber-400 bg-amber-50 p-4 flex flex-col">
            <h4 className="font-semibold text-amber-900 mb-1">Premium Landlord</h4>
            <div className="text-sm text-muted-foreground mb-3">Everything in Pro, plus concierge support.</div>
            {/* Annual as primary */}
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-2xl font-bold">R500</span>
              <span className="text-muted-foreground">/ month</span>
            </div>
            <p className="text-xs font-bold inline-flex items-center gap-2 text-green-800 bg-green-200 border border-green-400 rounded-full px-2 py-0.5 w-fit mb-3">Save R2,400</p>
            <div className="space-y-1 mb-4">
              <Feature bold>All Pro features included</Feature>
              <Feature>Maintenance concierge</Feature>
              <Feature>VIP landlord support</Feature>
              <Feature>Annual performance report</Feature>
            </div>
            <div className="mt-auto flex flex-col gap-2">
              <Button onClick={() => { onOpenChange(false); choosePremium('yearly'); }}>Continue with Annual</Button>
              <Button variant="outline" onClick={() => { onOpenChange(false); choosePremium('monthly'); }}>Switch to Monthly • R700/mo</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PlanSelectDialog;


