import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChevronRight } from "lucide-react";
import { LeasePack } from "../../types";

interface PartiesStepProps {
  data: Partial<LeasePack>;
  onComplete: (data: Partial<LeasePack>) => void;
}

export function PartiesStep({ data, onComplete }: PartiesStepProps) {
  const [landlord, setLandlord] = useState(data.parties?.landlord || {
    fullName: "",
    idNumber: "",
    email: "",
    phone: "",
    address: ""
  });
  
  const [tenant, setTenant] = useState(data.parties?.tenant || {
    fullName: "",
    idNumber: "",
    email: "",
    phone: "",
    address: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete({
      ...data,
      parties: {
        ...data.parties,
        landlord,
        tenant
      }
    });
  };

  const isValid = landlord.fullName && landlord.idNumber && landlord.email &&
                  tenant.fullName && tenant.idNumber && tenant.email;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-primary mb-4">Party Details</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Enter the complete details for both the landlord and tenant parties to this lease agreement.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Landlord Section */}
        <div className="space-y-4">
          <h4 className="font-medium text-primary border-b pb-2">Landlord Information</h4>
          
          <div>
            <Label htmlFor="landlord-name">Full Name *</Label>
            <Input
              id="landlord-name"
              value={landlord.fullName}
              onChange={(e) => setLandlord({ ...landlord, fullName: e.target.value })}
              placeholder="Enter full legal name"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="landlord-id">ID Number *</Label>
            <Input
              id="landlord-id"
              value={landlord.idNumber}
              onChange={(e) => setLandlord({ ...landlord, idNumber: e.target.value })}
              placeholder="South African ID number"
              maxLength={13}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="landlord-email">Email Address *</Label>
            <Input
              id="landlord-email"
              type="email"
              value={landlord.email}
              onChange={(e) => setLandlord({ ...landlord, email: e.target.value })}
              placeholder="email@example.com"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="landlord-phone">Phone Number</Label>
            <Input
              id="landlord-phone"
              value={landlord.phone || ""}
              onChange={(e) => setLandlord({ ...landlord, phone: e.target.value })}
              placeholder="+27 XX XXX XXXX"
            />
          </div>
          
          <div>
            <Label htmlFor="landlord-address">Physical Address</Label>
            <Textarea
              id="landlord-address"
              value={landlord.address || ""}
              onChange={(e) => setLandlord({ ...landlord, address: e.target.value })}
              placeholder="Enter full physical address"
              rows={3}
            />
          </div>
        </div>

        {/* Tenant Section */}
        <div className="space-y-4">
          <h4 className="font-medium text-primary border-b pb-2">Tenant Information</h4>
          
          <div>
            <Label htmlFor="tenant-name">Full Name *</Label>
            <Input
              id="tenant-name"
              value={tenant.fullName}
              onChange={(e) => setTenant({ ...tenant, fullName: e.target.value })}
              placeholder="Enter full legal name"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="tenant-id">ID Number *</Label>
            <Input
              id="tenant-id"
              value={tenant.idNumber}
              onChange={(e) => setTenant({ ...tenant, idNumber: e.target.value })}
              placeholder="South African ID number"
              maxLength={13}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="tenant-email">Email Address *</Label>
            <Input
              id="tenant-email"
              type="email"
              value={tenant.email}
              onChange={(e) => setTenant({ ...tenant, email: e.target.value })}
              placeholder="email@example.com"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="tenant-phone">Phone Number</Label>
            <Input
              id="tenant-phone"
              value={tenant.phone || ""}
              onChange={(e) => setTenant({ ...tenant, phone: e.target.value })}
              placeholder="+27 XX XXX XXXX"
            />
          </div>
          
          <div>
            <Label htmlFor="tenant-address">Current Address</Label>
            <Textarea
              id="tenant-address"
              value={tenant.address || ""}
              onChange={(e) => setTenant({ ...tenant, address: e.target.value })}
              placeholder="Enter current residential address"
              rows={3}
            />
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