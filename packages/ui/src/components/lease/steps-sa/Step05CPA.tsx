import React, { useEffect } from 'react';
import { Label } from '@mzanzihomes/ui/components/label';
import { Switch } from '@mzanzihomes/ui/components/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import type { LeaseWizardData, StepValidationResult } from '@mzanzihomes/common/types/lease';
import { HelpCircle, Shield, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@mzanzihomes/ui/components/tooltip';
import { Alert, AlertDescription, AlertTitle } from '@mzanzihomes/ui/components/alert';
import { calculateCPAApplicability } from '@/utils/leaseTemplateEngine';

interface Step05Props {
  data: LeaseWizardData;
  onUpdate: (updates: Partial<LeaseWizardData>) => void;
}

export function Step05CPA({ data, onUpdate }: Step05Props) {
  // Auto-calculate CPA applicability when inputs change
  useEffect(() => {
    const cpaApplies = calculateCPAApplicability(data.tenantIsIndividual, data.landlordActingInBusiness);
    if (data.cpaApplies !== cpaApplies) {
      onUpdate({ cpaApplies });
    }
  }, [data.tenantIsIndividual, data.landlordActingInBusiness]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Consumer Protection Act (CPA)</h2>
        <p className="text-sm text-muted-foreground">
          Determine if the Consumer Protection Act applies to this lease.
        </p>
      </div>

      {/* CPA Information */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5" />
            What is the CPA?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The Consumer Protection Act 68 of 2008 provides additional rights to tenants in certain circumstances, 
            including the right to cancel a fixed-term lease with 20 business days' notice.
          </p>
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <p className="text-sm font-medium">The CPA applies when BOTH conditions are met:</p>
            <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
              <li>The tenant is an individual person (not a company)</li>
              <li>The landlord is acting in the course of business (professional landlord)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Questions to determine CPA applicability */}
      <div className="space-y-4">
        <h3 className="font-medium">Answer these questions:</h3>

        {/* Tenant is individual */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-1 pr-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="tenantIsIndividual" className="font-medium">
                Is the tenant an individual person?
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Answer NO if the tenant is a company, close corporation, trust, or other juristic person.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p className="text-sm text-muted-foreground">
              {data.tenantIsIndividual 
                ? 'Yes, the tenant is a natural person' 
                : 'No, the tenant is a company/trust/CC'}
            </p>
          </div>
          <Switch
            id="tenantIsIndividual"
            checked={data.tenantIsIndividual}
            onCheckedChange={(checked) => onUpdate({ 
              tenantIsIndividual: checked,
              tenantIsJuristic: !checked
            })}
          />
        </div>

        {/* Landlord acting in business */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-1 pr-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="landlordActingInBusiness" className="font-medium">
                Is the landlord acting in the course of business?
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Answer YES if landlording is a regular business activity (e.g., owns multiple rental properties, uses an agent, or is a property company).</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p className="text-sm text-muted-foreground">
              {data.landlordActingInBusiness 
                ? 'Yes, this is a business/professional landlord' 
                : 'No, this is a private/occasional landlord'}
            </p>
          </div>
          <Switch
            id="landlordActingInBusiness"
            checked={data.landlordActingInBusiness}
            onCheckedChange={(checked) => onUpdate({ landlordActingInBusiness: checked })}
          />
        </div>
      </div>

      {/* CPA Status Result */}
      {data.cpaApplies ? (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-600">CPA Applies to this Lease</AlertTitle>
          <AlertDescription className="text-green-700 dark:text-green-400">
            <p className="mb-2">
              The Consumer Protection Act protections will apply. This means:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>Tenant can cancel with 20 business days' notice (subject to reasonable penalty)</li>
              <li>Certain unfair contract terms are prohibited</li>
              <li>Direct marketing cancellation rights apply (if applicable)</li>
            </ul>
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-600">CPA Does Not Apply</AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-400">
            <p className="mb-2">
              The Consumer Protection Act will NOT apply to this lease because:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              {!data.tenantIsIndividual && (
                <li>The tenant is a juristic person (company/trust)</li>
              )}
              {!data.landlordActingInBusiness && (
                <li>The landlord is not acting in the course of business</li>
              )}
            </ul>
            <p className="mt-2 text-sm">
              Standard common law and Rental Housing Act provisions will apply.
            </p>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

// Validation function for this step
export function validateStep05(data: LeaseWizardData): StepValidationResult {
  // This step is always valid - it's informational
  return {
    isValid: true,
    errors: []
  };
}
