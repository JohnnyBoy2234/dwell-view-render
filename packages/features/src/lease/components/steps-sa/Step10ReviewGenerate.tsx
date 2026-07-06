import React from 'react';
import { Button } from '@mzanzihomes/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import type { LeaseWizardData, StepValidationResult } from '@mzanzihomes/common/types/lease';
import { formatZAR, formatDate } from '../../utils/leaseTemplateEngine';
import { FileText, Send, CheckCircle2, Eye } from 'lucide-react';

interface Step10Props {
  data: LeaseWizardData;
  onUpdate: (updates: Partial<LeaseWizardData>) => void;
  onPreviewAndSign: () => void;
  onSendToTenant: () => void;
  isGenerating: boolean;
  isSending: boolean;
  landlordHasSigned?: boolean;
}

export function Step10ReviewGenerate({ 
  data, 
  onPreviewAndSign, 
  onSendToTenant, 
  isGenerating, 
  isSending,
  landlordHasSigned = false
}: Step10Props) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Review & Sign</h2>
        <p className="text-sm text-muted-foreground">
          Review your lease details and sign the document. After you sign, you can send it to the tenant.
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

      {/* Status Indicator */}
      {landlordHasSigned && (
        <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <span className="text-green-800 font-medium">You have signed this lease</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 pt-4">
        <Button onClick={onSendToTenant} disabled={isSending} className="flex-1">
          <Send className="h-4 w-4 mr-2" />
          {isSending ? 'Sending...' : 'Send to Tenant to Sign'}
        </Button>

        <Button onClick={onPreviewAndSign} disabled={isGenerating} variant="outline" className="flex-1">
          <Eye className="h-4 w-4 mr-2" />
          {landlordHasSigned ? 'View Signed Lease' : 'Preview Lease'}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground text-center pt-2">
        Your tenant reviews and signs first — you'll sign last from your Leases tab.
      </p>
    </div>
  );
}

export function validateStep10(data: LeaseWizardData): StepValidationResult {
  return { isValid: true, errors: [] };
}
