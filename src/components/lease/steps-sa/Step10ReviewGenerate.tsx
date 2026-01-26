import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { LeaseWizardData, StepValidationResult } from '@/types/lease';
import { formatZAR, formatDate } from '@/utils/leaseTemplateEngine';
import { FileText, Send, CheckCircle2 } from 'lucide-react';

interface Step10Props {
  data: LeaseWizardData;
  onUpdate: (updates: Partial<LeaseWizardData>) => void;
  onGenerate: () => void;
  onSendToTenant: () => void;
  isGenerating: boolean;
  isSending: boolean;
}

export function Step10ReviewGenerate({ data, onGenerate, onSendToTenant, isGenerating, isSending }: Step10Props) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Review & Generate</h2>
        <p className="text-sm text-muted-foreground">
          Review your lease details before generating the final document.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Lease Terms</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <p><span className="text-muted-foreground">Type:</span> {data.leaseType === 'fixed' ? 'Fixed-Term' : 'Month-to-Month'}</p>
            <p><span className="text-muted-foreground">Start:</span> {formatDate(data.leaseStartDate)}</p>
            {data.leaseEndDate && <p><span className="text-muted-foreground">End:</span> {formatDate(data.leaseEndDate)}</p>}
            <p><span className="text-muted-foreground">Rent:</span> {formatZAR(data.rentAmount)}/month</p>
            <p><span className="text-muted-foreground">Deposit:</span> {formatZAR(data.depositAmount)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Parties</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <p><span className="text-muted-foreground">Landlord:</span> {data.landlordFullName}</p>
            <p><span className="text-muted-foreground">Tenant:</span> {data.tenantFullName}</p>
            <p><span className="text-muted-foreground">CPA Applies:</span> {data.cpaApplies ? 'Yes' : 'No'}</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Property</CardTitle></CardHeader>
          <CardContent className="text-sm">
            <p>{data.propertyAddress}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {data.isSectionalTitle && <span className="px-2 py-1 bg-muted rounded text-xs">Sectional Title</span>}
              {data.hasPool && <span className="px-2 py-1 bg-muted rounded text-xs">Pool</span>}
              {data.hasGarden && <span className="px-2 py-1 bg-muted rounded text-xs">Garden</span>}
              {data.petsAllowed && <span className="px-2 py-1 bg-muted rounded text-xs">Pets OK</span>}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 pt-4">
        <Button onClick={onGenerate} disabled={isGenerating} className="flex-1">
          <FileText className="h-4 w-4 mr-2" />
          {isGenerating ? 'Generating...' : 'Generate PDF'}
        </Button>
        <Button onClick={onSendToTenant} disabled={isSending} variant="secondary" className="flex-1">
          <Send className="h-4 w-4 mr-2" />
          {isSending ? 'Sending...' : 'Send to Tenant'}
        </Button>
      </div>
    </div>
  );
}

export function validateStep10(data: LeaseWizardData): StepValidationResult {
  return { isValid: true, errors: [] };
}
