import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { LeaseWizardData, LeaseType, StepValidationResult } from '@/types/lease';
import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Step01Props {
  data: LeaseWizardData;
  onUpdate: (updates: Partial<LeaseWizardData>) => void;
}

export function Step01LeaseBasics({ data, onUpdate }: Step01Props) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Lease Basics</h2>
        <p className="text-sm text-muted-foreground">
          Let's start with the fundamental details of your lease agreement.
        </p>
      </div>

      {/* Lease Type */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Label className="text-base font-medium">What type of lease is this? *</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p><strong>Fixed-term:</strong> Runs for a set period (e.g., 12 months). Provides security for both parties.</p>
                <p className="mt-2"><strong>Month-to-month:</strong> Continues indefinitely until either party gives notice. More flexible.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <RadioGroup
          value={data.leaseType}
          onValueChange={(value: LeaseType) => onUpdate({ leaseType: value })}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          <div className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-muted/50">
            <RadioGroupItem value="fixed" id="fixed" />
            <Label htmlFor="fixed" className="flex-1 cursor-pointer">
              <span className="font-medium">Fixed-Term</span>
              <p className="text-sm text-muted-foreground">Set start and end date</p>
            </Label>
          </div>
          <div className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-muted/50">
            <RadioGroupItem value="month_to_month" id="month_to_month" />
            <Label htmlFor="month_to_month" className="flex-1 cursor-pointer">
              <span className="font-medium">Month-to-Month</span>
              <p className="text-sm text-muted-foreground">Ongoing until notice given</p>
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Lease Start Date */}
      <div className="space-y-2">
        <Label htmlFor="leaseStartDate">When does the lease start? *</Label>
        <Input
          id="leaseStartDate"
          type="date"
          value={data.leaseStartDate}
          onChange={(e) => onUpdate({ leaseStartDate: e.target.value })}
          className="max-w-xs"
          required
        />
      </div>

      {/* Lease End Date - only for fixed term */}
      {data.leaseType === 'fixed' && (
        <div className="space-y-2">
          <Label htmlFor="leaseEndDate">When does the lease end? *</Label>
          <Input
            id="leaseEndDate"
            type="date"
            value={data.leaseEndDate || ''}
            onChange={(e) => onUpdate({ leaseEndDate: e.target.value })}
            className="max-w-xs"
            min={data.leaseStartDate}
            required
          />
          <p className="text-xs text-muted-foreground">
            Must be after the start date
          </p>
        </div>
      )}

      {/* Monthly Rent */}
      <div className="space-y-2">
        <Label htmlFor="rentAmount">What is the monthly rent? *</Label>
        <div className="flex items-center gap-2 max-w-xs">
          <span className="text-muted-foreground font-medium">R</span>
          <Input
            id="rentAmount"
            type="number"
            min="0"
            step="100"
            value={data.rentAmount || ''}
            onChange={(e) => onUpdate({ rentAmount: parseFloat(e.target.value) || 0 })}
            placeholder="10000"
            required
          />
        </div>
        <p className="text-xs text-muted-foreground">
          South African Rand (ZAR)
        </p>
      </div>

      {/* Rent Due Day */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="rentDueDay">When is rent due each month? *</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Typically the 1st of each month. Choose a day between 1-7.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Select
          value={data.rentDueDay.toString()}
          onValueChange={(value) => onUpdate({ rentDueDay: parseInt(value) })}
        >
          <SelectTrigger className="max-w-xs">
            <SelectValue placeholder="Select day" />
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4, 5, 6, 7].map((day) => (
              <SelectItem key={day} value={day.toString()}>
                {day === 1 ? '1st' : day === 2 ? '2nd' : day === 3 ? '3rd' : `${day}th`} of the month
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Annual Escalation */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="escalationPercent">Annual rent increase (escalation) %</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>The percentage by which rent increases each year upon renewal. Common rates are 5-10%.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-center gap-2 max-w-xs">
          <Input
            id="escalationPercent"
            type="number"
            min="0"
            max="20"
            step="0.5"
            value={data.escalationPercent || ''}
            onChange={(e) => onUpdate({ escalationPercent: parseFloat(e.target.value) || 0 })}
            placeholder="8"
          />
          <span className="text-muted-foreground">%</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Leave at 0 if no escalation applies
        </p>
      </div>
    </div>
  );
}

// Validation function for this step
export function validateStep01(data: LeaseWizardData): StepValidationResult {
  const errors: string[] = [];

  if (!data.leaseStartDate) {
    errors.push('Lease start date is required');
  }

  if (data.leaseType === 'fixed' && !data.leaseEndDate) {
    errors.push('Lease end date is required for fixed-term leases');
  }

  if (data.leaseType === 'fixed' && data.leaseStartDate && data.leaseEndDate) {
    if (new Date(data.leaseEndDate) <= new Date(data.leaseStartDate)) {
      errors.push('Lease end date must be after start date');
    }
  }

  if (!data.rentAmount || data.rentAmount <= 0) {
    errors.push('Monthly rent amount is required');
  }

  if (!data.rentDueDay || data.rentDueDay < 1 || data.rentDueDay > 7) {
    errors.push('Rent due day must be between 1 and 7');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
