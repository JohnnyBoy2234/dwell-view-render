import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronRight } from "lucide-react";
import { LeasePack } from "../../types";

interface PropertyTermStepProps {
  data: Partial<LeasePack>;
  onComplete: (data: Partial<LeasePack>) => void;
}

export function PropertyTermStep({ data, onComplete }: PropertyTermStepProps) {
  const [core, setCore] = useState(data.core || {
    propertyAddress: "",
    propertyType: "apartment" as const,
    startDate: "",
    endDate: "",
    noticeDays: 30,
    conditionReportRequired: true,
    petsAllowed: false,
    maxOccupants: 2,
    houseRulesUrl: "",
    governingLaw: "South Africa" as const,
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

  const isValid = core.propertyAddress && core.startDate && core.endDate && core.maxOccupants > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-primary mb-4">Property & Lease Terms</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Define the property details and core lease terms including duration and occupancy rules.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="property-address">Property Address *</Label>
            <Textarea
              id="property-address"
              value={core.propertyAddress}
              onChange={(e) => setCore({ ...core, propertyAddress: e.target.value })}
              placeholder="Enter complete property address"
              rows={3}
              required
            />
          </div>

          <div>
            <Label htmlFor="property-type">Property Type *</Label>
            <Select
              value={core.propertyType}
              onValueChange={(value: any) => setCore({ ...core, propertyType: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="apartment">Apartment</SelectItem>
                <SelectItem value="house">House</SelectItem>
                <SelectItem value="townhouse">Townhouse</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="house-rules">House Rules URL</Label>
            <Input
              id="house-rules"
              value={core.houseRulesUrl || ""}
              onChange={(e) => setCore({ ...core, houseRulesUrl: e.target.value })}
              placeholder="https://example.com/house-rules"
              type="url"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="start-date">Lease Start Date *</Label>
            <Input
              id="start-date"
              type="date"
              value={core.startDate}
              onChange={(e) => setCore({ ...core, startDate: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="end-date">Lease End Date *</Label>
            <Input
              id="end-date"
              type="date"
              value={core.endDate}
              onChange={(e) => setCore({ ...core, endDate: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="notice-days">Notice Period (Days)</Label>
            <Input
              id="notice-days"
              type="number"
              value={core.noticeDays}
              onChange={(e) => setCore({ ...core, noticeDays: parseInt(e.target.value) || 30 })}
              min="1"
              max="365"
            />
          </div>

          <div>
            <Label htmlFor="max-occupants">Maximum Occupants *</Label>
            <Input
              id="max-occupants"
              type="number"
              value={core.maxOccupants}
              onChange={(e) => setCore({ ...core, maxOccupants: parseInt(e.target.value) || 1 })}
              min="1"
              max="20"
              required
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="condition-report"
            checked={core.conditionReportRequired}
            onCheckedChange={(checked) => setCore({ ...core, conditionReportRequired: !!checked })}
          />
          <Label htmlFor="condition-report">Condition report required</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="pets-allowed"
            checked={core.petsAllowed}
            onCheckedChange={(checked) => setCore({ ...core, petsAllowed: !!checked })}
          />
          <Label htmlFor="pets-allowed">Pets allowed (with written consent)</Label>
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