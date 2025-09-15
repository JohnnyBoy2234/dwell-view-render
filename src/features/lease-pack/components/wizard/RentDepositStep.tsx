import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronRight } from "lucide-react";
import { LeasePack } from "../../types";

interface RentDepositStepProps {
  data: Partial<LeasePack>;
  onComplete: (data: Partial<LeasePack>) => void;
}

export function RentDepositStep({ data, onComplete }: RentDepositStepProps) {
  const [core, setCore] = useState({
    monthlyRentZAR: data.core?.monthlyRentZAR || 0,
    rentDueDay: data.core?.rentDueDay || 1,
    paymentMethod: data.core?.paymentMethod || "SwiftRent" as const,
    depositZAR: data.core?.depositZAR || 0,
    depositHeldIn: data.core?.depositHeldIn || "Trust" as const,
    depositRefundDays: data.core?.depositRefundDays || 14,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete({
      ...data,
      core: {
        ...data.core,
        ...core
      }
    });
  };

  const isValid = core.monthlyRentZAR > 0 && core.depositZAR >= 0 && 
                  core.rentDueDay >= 1 && core.rentDueDay <= 31;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-primary mb-4">Rent & Deposit Terms</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Set the rental amount, payment terms, and security deposit requirements.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h4 className="font-medium text-primary border-b pb-2">Rental Terms</h4>
          
          <div>
            <Label htmlFor="monthly-rent">Monthly Rent (ZAR) *</Label>
            <Input
              id="monthly-rent"
              type="number"
              value={core.monthlyRentZAR}
              onChange={(e) => setCore({ ...core, monthlyRentZAR: parseFloat(e.target.value) || 0 })}
              placeholder="15000"
              min="0"
              step="0.01"
              required
            />
            <p className="text-sm text-muted-foreground mt-1">
              R{core.monthlyRentZAR.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div>
            <Label htmlFor="due-day">Rent Due Day *</Label>
            <Select
              value={core.rentDueDay.toString()}
              onValueChange={(value) => setCore({ ...core, rentDueDay: parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                  <SelectItem key={day} value={day.toString()}>
                    {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'} of each month
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="payment-method">Payment Method *</Label>
            <Select
              value={core.paymentMethod}
              onValueChange={(value: any) => setCore({ ...core, paymentMethod: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SwiftRent">SwiftRent Platform</SelectItem>
                <SelectItem value="EFT">Electronic Transfer (EFT)</SelectItem>
                <SelectItem value="Other">Other Method</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-medium text-primary border-b pb-2">Security Deposit</h4>
          
          <div>
            <Label htmlFor="deposit-amount">Deposit Amount (ZAR) *</Label>
            <Input
              id="deposit-amount"
              type="number"
              value={core.depositZAR}
              onChange={(e) => setCore({ ...core, depositZAR: parseFloat(e.target.value) || 0 })}
              placeholder="15000"
              min="0"
              step="0.01"
              required
            />
            <p className="text-sm text-muted-foreground mt-1">
              R{core.depositZAR.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div>
            <Label htmlFor="deposit-held">Deposit Held In *</Label>
            <Select
              value={core.depositHeldIn}
              onValueChange={(value: any) => setCore({ ...core, depositHeldIn: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Trust">Trust Account</SelectItem>
                <SelectItem value="Landlord">Landlord Account</SelectItem>
                <SelectItem value="Agent">Agent Account</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="refund-days">Deposit Refund Period (Days)</Label>
            <Select
              value={core.depositRefundDays.toString()}
              onValueChange={(value) => setCore({ ...core, depositRefundDays: parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="14">14 days</SelectItem>
                <SelectItem value="21">21 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="bg-muted/50 p-4 rounded-lg">
        <h5 className="font-medium mb-2">Summary</h5>
        <div className="text-sm space-y-1">
          <div>Monthly Rent: <span className="font-medium">R{core.monthlyRentZAR.toLocaleString('en-ZA')}</span></div>
          <div>Security Deposit: <span className="font-medium">R{core.depositZAR.toLocaleString('en-ZA')}</span></div>
          <div>Total Move-in Cost: <span className="font-medium text-primary">R{(core.monthlyRentZAR + core.depositZAR).toLocaleString('en-ZA')}</span></div>
        </div>
      </div>

      <div className="flex justify-end pt-6 border-t">
        <Button type="submit" disabled={!isValid}>
          Continue
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </form>
  );
}