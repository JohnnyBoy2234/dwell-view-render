import React from 'react';
import { Label } from '@mzanzihomes/ui/components/label';
import { Input } from '@mzanzihomes/ui/components/input';
import { Switch } from '@mzanzihomes/ui/components/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import type { LeaseWizardData, StepValidationResult } from '@mzanzihomes/common/types/lease';
import { HelpCircle, User, Building2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@mzanzihomes/ui/components/tooltip';

interface Step02Props {
  data: LeaseWizardData;
  onUpdate: (updates: Partial<LeaseWizardData>) => void;
}

export function Step02Parties({ data, onUpdate }: Step02Props) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Parties to the Lease</h2>
        <p className="text-sm text-muted-foreground">
          Enter the details of the landlord and tenant.
        </p>
      </div>

      {/* Landlord Details */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5" />
            Landlord (Property Owner)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="landlordFullName">Full Name / Company Name *</Label>
              <Input
                id="landlordFullName"
                value={data.landlordFullName}
                onChange={(e) => onUpdate({ landlordFullName: e.target.value })}
                placeholder="John Smith / ABC Properties (Pty) Ltd"
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="landlordIdNumber">ID / Registration Number *</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>SA ID number for individuals or company registration number</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                id="landlordIdNumber"
                value={data.landlordIdNumber}
                onChange={(e) => onUpdate({ landlordIdNumber: e.target.value })}
                placeholder="8801015009087"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="landlordAddress">Physical Address *</Label>
            <Input
              id="landlordAddress"
              value={data.landlordAddress}
              onChange={(e) => onUpdate({ landlordAddress: e.target.value })}
              placeholder="123 Main Road, Sandton, Johannesburg, 2196"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="landlordEmail">Email Address *</Label>
              <Input
                id="landlordEmail"
                type="email"
                value={data.landlordEmail}
                onChange={(e) => onUpdate({ landlordEmail: e.target.value })}
                placeholder="landlord@email.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="landlordPhone">Phone Number</Label>
              <Input
                id="landlordPhone"
                type="tel"
                value={data.landlordPhone || ''}
                onChange={(e) => onUpdate({ landlordPhone: e.target.value })}
                placeholder="082 123 4567"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tenant Details */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5" />
            Tenant (Lessee)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tenant Type Toggle */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="space-y-1">
              <Label htmlFor="tenantIsJuristic" className="font-medium">Is the tenant a company or trust?</Label>
              <p className="text-sm text-muted-foreground">
                {data.tenantIsJuristic 
                  ? 'Tenant is a juristic person (company/trust/CC)' 
                  : 'Tenant is an individual person'}
              </p>
            </div>
            <Switch
              id="tenantIsJuristic"
              checked={data.tenantIsJuristic}
              onCheckedChange={(checked) => onUpdate({ 
                tenantIsJuristic: checked,
                tenantIsIndividual: !checked
              })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tenantFullName">
                {data.tenantIsJuristic ? 'Company / Trust Name *' : 'Full Name *'}
              </Label>
              <Input
                id="tenantFullName"
                value={data.tenantFullName}
                onChange={(e) => onUpdate({ tenantFullName: e.target.value })}
                placeholder={data.tenantIsJuristic ? "XYZ Holdings (Pty) Ltd" : "Jane Doe"}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenantIdNumber">
                {data.tenantIsJuristic ? 'Registration Number *' : 'ID Number *'}
              </Label>
              <Input
                id="tenantIdNumber"
                value={data.tenantIdNumber}
                onChange={(e) => onUpdate({ tenantIdNumber: e.target.value })}
                placeholder={data.tenantIsJuristic ? "2021/123456/07" : "9001015009087"}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tenantAddress">Current Address *</Label>
            <Input
              id="tenantAddress"
              value={data.tenantAddress}
              onChange={(e) => onUpdate({ tenantAddress: e.target.value })}
              placeholder="456 Oak Street, Rosebank, Johannesburg, 2196"
              required
            />
            <p className="text-xs text-muted-foreground">
              This will be used as the tenant's domicilium address for legal notices
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tenantPhone">Phone Number</Label>
            <Input
              id="tenantPhone"
              type="tel"
              value={data.tenantPhone || ''}
              onChange={(e) => onUpdate({ tenantPhone: e.target.value })}
              placeholder="083 456 7890"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Validation function for this step
export function validateStep02(data: LeaseWizardData): StepValidationResult {
  const errors: string[] = [];

  // Landlord validation
  if (!data.landlordFullName?.trim()) {
    errors.push('Landlord name is required');
  }
  if (!data.landlordIdNumber?.trim()) {
    errors.push('Landlord ID/registration number is required');
  }
  if (!data.landlordAddress?.trim()) {
    errors.push('Landlord address is required');
  }
  if (!data.landlordEmail?.trim()) {
    errors.push('Landlord email is required');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.landlordEmail)) {
    errors.push('Landlord email is invalid');
  }

  // Tenant validation
  if (!data.tenantFullName?.trim()) {
    errors.push('Tenant name is required');
  }
  if (!data.tenantIdNumber?.trim()) {
    errors.push('Tenant ID/registration number is required');
  }
  if (!data.tenantAddress?.trim()) {
    errors.push('Tenant address is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
