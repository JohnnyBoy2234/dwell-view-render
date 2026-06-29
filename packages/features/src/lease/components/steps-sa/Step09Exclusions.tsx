import React from 'react';
import { Label } from '@mzanzihomes/ui/components/label';
import { Textarea } from '@mzanzihomes/ui/components/textarea';
import type { LeaseWizardData, StepValidationResult } from '@mzanzihomes/common/types/lease';

interface Step09Props {
  data: LeaseWizardData;
  onUpdate: (updates: Partial<LeaseWizardData>) => void;
}

export function Step09Exclusions({ data, onUpdate }: Step09Props) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Exclusions</h2>
        <p className="text-sm text-muted-foreground">
          List any items specifically excluded from the lease (e.g., furniture, appliances).
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="excludedItemsList">Excluded Items</Label>
        <Textarea
          id="excludedItemsList"
          value={data.excludedItemsList}
          onChange={(e) => onUpdate({ excludedItemsList: e.target.value })}
          placeholder="e.g., Washing machine in garage, outdoor furniture on patio..."
          rows={5}
        />
        <p className="text-xs text-muted-foreground">Leave blank if nothing is excluded</p>
      </div>
    </div>
  );
}

export function validateStep09(data: LeaseWizardData): StepValidationResult {
  return { isValid: true, errors: [] };
}
