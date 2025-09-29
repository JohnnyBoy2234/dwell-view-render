import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import type { LeaseContractData } from '@/types/lease';

interface ContractBankDetailsProps {
  data: LeaseContractData;
  onUpdate: (updates: Partial<LeaseContractData>) => void;
}

export function ContractBankDetails({ data, onUpdate }: ContractBankDetailsProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Landlord Bank Details</h3>
        <p className="text-sm text-muted-foreground">
          Enter your banking information for rent payments
        </p>
      </div>

      <div className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="landlordBankName">Bank Name *</Label>
          <Input
            id="landlordBankName"
            value={data.landlordBankName || ''}
            onChange={(e) => onUpdate({ landlordBankName: e.target.value })}
            placeholder="e.g., Standard Bank"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="landlordBranchCode">Branch Code *</Label>
            <Input
              id="landlordBranchCode"
              value={data.landlordBranchCode || ''}
              onChange={(e) => onUpdate({ landlordBranchCode: e.target.value })}
              placeholder="e.g., 051001"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="landlordBranchName">Branch Name *</Label>
            <Input
              id="landlordBranchName"
              value={data.landlordBranchName || ''}
              onChange={(e) => onUpdate({ landlordBranchName: e.target.value })}
              placeholder="e.g., Sandton"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="landlordAccNumber">Account Number *</Label>
          <Input
            id="landlordAccNumber"
            value={data.landlordAccNumber || ''}
            onChange={(e) => onUpdate({ landlordAccNumber: e.target.value })}
            placeholder="e.g., 1234567890"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="landlordReference">Payment Reference</Label>
          <Input
            id="landlordReference"
            value={data.landlordReference || ''}
            onChange={(e) => onUpdate({ landlordReference: e.target.value })}
            placeholder="e.g., RENT-PROPERTY-123 (optional)"
          />
          <p className="text-xs text-muted-foreground">
            Optional reference for tenant to use when making payments
          </p>
        </div>
      </div>
    </div>
  );
}
