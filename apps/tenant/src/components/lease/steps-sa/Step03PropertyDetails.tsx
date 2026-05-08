import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { LeaseWizardData, StepValidationResult } from '@/types/lease';
import { HelpCircle, Home, Building } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Step03Props {
  data: LeaseWizardData;
  onUpdate: (updates: Partial<LeaseWizardData>) => void;
}

export function Step03PropertyDetails({ data, onUpdate }: Step03Props) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Property Details</h2>
        <p className="text-sm text-muted-foreground">
          Provide details about the property being leased.
        </p>
      </div>

      {/* Property Address */}
      <div className="space-y-2">
        <Label htmlFor="propertyAddress" className="text-base font-medium">
          Property Address *
        </Label>
        <Textarea
          id="propertyAddress"
          value={data.propertyAddress}
          onChange={(e) => onUpdate({ propertyAddress: e.target.value })}
          placeholder="Unit 12, Sunshine Complex&#10;123 Main Road&#10;Sandton, Johannesburg&#10;2196"
          rows={4}
          required
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground">
          Include unit number, building name, street address, suburb, city, and postal code
        </p>
      </div>

      {/* Sectional Title Toggle */}
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <Building className="h-5 w-5 text-muted-foreground" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Label htmlFor="isSectionalTitle" className="font-medium">Is this a sectional title property?</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Sectional title properties are part of a complex with shared ownership of common areas (e.g., apartments, townhouse complexes).</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-sm text-muted-foreground">
                Examples: apartment, townhouse in a complex, unit with body corporate
              </p>
            </div>
          </div>
          <Switch
            id="isSectionalTitle"
            checked={data.isSectionalTitle}
            onCheckedChange={(checked) => onUpdate({ 
              isSectionalTitle: checked,
              bodyCorpRulesApply: checked // Auto-enable if sectional title
            })}
          />
        </div>

        {/* Body Corporate Rules - only show if sectional title */}
        {data.isSectionalTitle && (
          <div className="ml-4 space-y-4">
            <Alert>
              <Building className="h-4 w-4" />
              <AlertDescription>
                Sectional title properties are subject to the Sectional Titles Act and body corporate rules. 
                Additional clauses will be included in the lease agreement.
              </AlertDescription>
            </Alert>

            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
              <div className="space-y-1">
                <Label htmlFor="bodyCorpRulesApply" className="font-medium">
                  Body corporate / HOA rules apply
                </Label>
                <p className="text-sm text-muted-foreground">
                  Tenant must comply with all body corporate and homeowners association rules
                </p>
              </div>
              <Switch
                id="bodyCorpRulesApply"
                checked={data.bodyCorpRulesApply}
                onCheckedChange={(checked) => onUpdate({ bodyCorpRulesApply: checked })}
              />
            </div>
          </div>
        )}
      </div>

      {/* Freehold / Stand-alone property info */}
      {!data.isSectionalTitle && (
        <Alert>
          <Home className="h-4 w-4" />
          <AlertDescription>
            This is a freestanding property (not sectional title). The standard lease terms for freehold properties will apply.
          </AlertDescription>
        </Alert>
      )}

      {/* Occupants */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="occupantsList" className="text-base font-medium">
            Authorized Occupants
          </Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>List all people who will reside at the property. Only listed occupants are authorized to live there.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Textarea
          id="occupantsList"
          value={data.occupantsList || ''}
          onChange={(e) => onUpdate({ occupantsList: e.target.value })}
          placeholder="Enter names of all occupants&#10;e.g., Jane Doe, John Doe (spouse), Sarah Doe (child)"
          rows={3}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground">
          Leave blank to use "As per rental application"
        </p>
      </div>
    </div>
  );
}

// Validation function for this step
export function validateStep03(data: LeaseWizardData): StepValidationResult {
  const errors: string[] = [];

  if (!data.propertyAddress?.trim()) {
    errors.push('Property address is required');
  } else if (data.propertyAddress.trim().length < 20) {
    errors.push('Please provide a complete property address');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
