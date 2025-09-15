import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronRight } from "lucide-react";
import { LeasePack } from "../../types";

interface UtilitiesMaintenanceStepProps {
  data: Partial<LeasePack>;
  onComplete: (data: Partial<LeasePack>) => void;
}

export function UtilitiesMaintenanceStep({ data, onComplete }: UtilitiesMaintenanceStepProps) {
  const [core, setCore] = useState({
    utilities: data.core?.utilities || {
      water: "tenant" as const,
      electricity: "tenant" as const,
      refuse: "tenant" as const,
      internet: "tenant" as const,
    },
    maintenanceMinorRepairLimitZAR: data.core?.maintenanceMinorRepairLimitZAR || 500,
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

  const isValid = core.maintenanceMinorRepairLimitZAR >= 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-primary mb-4">Utilities & Maintenance</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Define who is responsible for utilities and set maintenance responsibilities.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h4 className="font-medium text-primary border-b pb-2">Utilities Responsibility</h4>
          
          <div>
            <Label htmlFor="water">Water & Sewerage</Label>
            <Select
              value={core.utilities.water}
              onValueChange={(value: any) => setCore({ 
                ...core, 
                utilities: { ...core.utilities, water: value }
              })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tenant">Tenant Responsibility</SelectItem>
                <SelectItem value="landlord">Landlord Responsibility</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="electricity">Electricity</Label>
            <Select
              value={core.utilities.electricity}
              onValueChange={(value: any) => setCore({ 
                ...core, 
                utilities: { ...core.utilities, electricity: value }
              })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tenant">Tenant Responsibility</SelectItem>
                <SelectItem value="landlord">Landlord Responsibility</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="refuse">Refuse Collection</Label>
            <Select
              value={core.utilities.refuse}
              onValueChange={(value: any) => setCore({ 
                ...core, 
                utilities: { ...core.utilities, refuse: value }
              })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tenant">Tenant Responsibility</SelectItem>
                <SelectItem value="landlord">Landlord Responsibility</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="internet">Internet & Communications</Label>
            <Select
              value={core.utilities.internet || "tenant"}
              onValueChange={(value: any) => setCore({ 
                ...core, 
                utilities: { ...core.utilities, internet: value }
              })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tenant">Tenant Responsibility</SelectItem>
                <SelectItem value="landlord">Landlord Responsibility</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-medium text-primary border-b pb-2">Maintenance Terms</h4>
          
          <div>
            <Label htmlFor="repair-limit">Minor Repair Limit (ZAR)</Label>
            <Input
              id="repair-limit"
              type="number"
              value={core.maintenanceMinorRepairLimitZAR}
              onChange={(e) => setCore({ 
                ...core, 
                maintenanceMinorRepairLimitZAR: parseFloat(e.target.value) || 0 
              })}
              placeholder="500"
              min="0"
              step="0.01"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Tenant is responsible for minor repairs up to R{core.maintenanceMinorRepairLimitZAR.toLocaleString('en-ZA')} per incident
            </p>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <h5 className="font-medium text-sm">Landlord Responsibilities</h5>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Structural repairs and maintenance</li>
              <li>• Major appliance repairs (if provided)</li>
              <li>• Plumbing and electrical systems</li>
              <li>• Roof, windows, and exterior maintenance</li>
              <li>• Compliance with building regulations</li>
            </ul>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <h5 className="font-medium text-sm">Tenant Responsibilities</h5>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• General cleanliness and upkeep</li>
              <li>• Minor repairs under R{core.maintenanceMinorRepairLimitZAR.toLocaleString('en-ZA')}</li>
              <li>• Light bulb and battery replacements</li>
              <li>• Unblocking drains (if tenant-caused)</li>
              <li>• Reporting maintenance issues promptly</li>
            </ul>
          </div>
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