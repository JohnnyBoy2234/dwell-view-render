import React from 'react';
import { Label } from '@mzanzihomes/ui/components/label';
import { Input } from '@mzanzihomes/ui/components/input';
import { Switch } from '@mzanzihomes/ui/components/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import type { LeaseWizardData, StepValidationResult } from '@mzanzihomes/common/types/lease';
import { HelpCircle, Wallet, CreditCard, Landmark } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@mzanzihomes/ui/components/tooltip';
import { Alert, AlertDescription } from '@mzanzihomes/ui/components/alert';

interface Step04Props {
  data: LeaseWizardData;
  onUpdate: (updates: Partial<LeaseWizardData>) => void;
}

export function Step04DepositFees({ data, onUpdate }: Step04Props) {
  // Calculate suggested deposit (typically 1-2 months rent)
  const suggestedDeposit = data.rentAmount || 0;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Deposit & Fees</h2>
        <p className="text-sm text-muted-foreground">
          Set the security deposit and payment terms.
        </p>
      </div>

      {/* Security Deposit */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Wallet className="h-5 w-5" />
            Security Deposit
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="depositAmount">Deposit Amount *</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Typically 1-2 months' rent. This protects the landlord against damages or unpaid rent.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex items-center gap-2 max-w-xs">
              <span className="text-muted-foreground font-medium">R</span>
              <Input
                id="depositAmount"
                type="number"
                min="0"
                step="100"
                value={data.depositAmount || ''}
                onChange={(e) => onUpdate({ depositAmount: parseFloat(e.target.value) || 0 })}
                placeholder={suggestedDeposit.toString()}
                required
              />
            </div>
            {suggestedDeposit > 0 && (
              <p className="text-xs text-muted-foreground">
                Suggested: R {suggestedDeposit.toLocaleString()} (1 month's rent)
              </p>
            )}
          </div>

          {/* Deposit Interest */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Label htmlFor="depositInterestApplies" className="font-medium">
                  Deposit held in interest-bearing account
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Required by law in South Africa. The deposit plus interest (less bank charges) is refundable at lease end.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-sm text-muted-foreground">
                As required by the Rental Housing Act
              </p>
            </div>
            <Switch
              id="depositInterestApplies"
              checked={data.depositInterestApplies}
              onCheckedChange={(checked) => onUpdate({ depositInterestApplies: checked })}
            />
          </div>

          <Alert>
            <Wallet className="h-4 w-4" />
            <AlertDescription>
              The deposit will be refunded within 14 days of lease termination, less any amounts for damages or outstanding rent.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Late Payment Fee */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="h-5 w-5" />
            Late Payment Fee
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="lateFeeAmount">Admin fee for late payments</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>A reasonable administrative fee charged if rent is paid after the due date. This is in addition to interest on overdue amounts.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex items-center gap-2 max-w-xs">
              <span className="text-muted-foreground font-medium">R</span>
              <Input
                id="lateFeeAmount"
                type="number"
                min="0"
                step="50"
                value={data.lateFeeAmount || ''}
                onChange={(e) => onUpdate({ lateFeeAmount: parseFloat(e.target.value) || 0 })}
                placeholder="250"
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">excl. VAT</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Common amounts: R150 - R500
            </p>
          </div>

          <Alert variant="default">
            <CreditCard className="h-4 w-4" />
            <AlertDescription>
              In addition to the admin fee, interest at prime + 2% per annum will apply to all overdue amounts.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Bank Details for Rent Payments */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Landmark className="h-5 w-5" />
            Banking Details for Rent Payments
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Landmark className="h-4 w-4" />
            <AlertDescription>
              Where rent gets paid. When you send the lease we'll set up your secure Paystack payout account with these details (once-off — reused for future leases).
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="landlordAccountHolder">Account Holder *</Label>
            <Input
              id="landlordAccountHolder"
              value={data.landlordAccountHolder || ''}
              onChange={(e) => onUpdate({ landlordAccountHolder: e.target.value })}
              placeholder={data.landlordFullName || 'Account holder name'}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="landlordBankName">Bank *</Label>
              <Input
                id="landlordBankName"
                value={data.landlordBankName || ''}
                onChange={(e) => onUpdate({ landlordBankName: e.target.value })}
                placeholder="e.g. FNB, Capitec, Standard Bank"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="landlordBranchCode">Branch Code</Label>
              <Input
                id="landlordBranchCode"
                value={data.landlordBranchCode}
                onChange={(e) => onUpdate({ landlordBranchCode: e.target.value })}
                placeholder="051001 (optional)"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="landlordAccountNumber">Account Number *</Label>
            <Input
              id="landlordAccountNumber"
              value={data.landlordAccountNumber}
              onChange={(e) => onUpdate({ landlordAccountNumber: e.target.value })}
              placeholder="1234567890"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="landlordReference">Payment Reference</Label>
            <Input
              id="landlordReference"
              value={data.landlordReference || ''}
              onChange={(e) => onUpdate({ landlordReference: e.target.value })}
              placeholder="RENT-UNIT12 (optional)"
            />
            <p className="text-xs text-muted-foreground">
              Reference for tenant to use when making payments
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Validation function for this step
export function validateStep04(data: LeaseWizardData): StepValidationResult {
  const errors: string[] = [];

  if (!data.depositAmount || data.depositAmount <= 0) {
    errors.push('Deposit amount is required');
  }

  if (!data.landlordBankName?.trim() && !data.landlordBankCode?.trim()) {
    errors.push('Please select your bank');
  }

  if (!data.landlordAccountNumber?.trim()) {
    errors.push('Account number is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
