import React from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { LeaseWizardData, MaintenanceResponsibility, StepValidationResult } from '@mzanzihomes/common/types/lease';
import { Droplets, Trees, ShieldCheck } from 'lucide-react';

interface Step07Props {
  data: LeaseWizardData;
  onUpdate: (updates: Partial<LeaseWizardData>) => void;
}

export function Step07Maintenance({ data, onUpdate }: Step07Props) {
  const hasAnyFeature = data.hasPool || data.hasGarden || data.hasAlarmSecurity;

  if (!hasAnyFeature) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Maintenance Allocation</h2>
          <p className="text-sm text-muted-foreground">
            No special features requiring maintenance allocation were selected. You can proceed to the next step.
          </p>
        </div>
      </div>
    );
  }

  const MaintenanceOption = ({ 
    feature, 
    icon: Icon, 
    label, 
    value, 
    onChange 
  }: { 
    feature: string; 
    icon: any; 
    label: string; 
    value?: MaintenanceResponsibility; 
    onChange: (v: MaintenanceResponsibility) => void;
  }) => (
    <div className="p-4 border rounded-lg space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <Label className="font-medium">Who maintains the {label}?</Label>
      </div>
      <RadioGroup value={value} onValueChange={onChange} className="flex gap-4">
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="tenant" id={`${feature}-tenant`} />
          <Label htmlFor={`${feature}-tenant`}>Tenant</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="landlord" id={`${feature}-landlord`} />
          <Label htmlFor={`${feature}-landlord`}>Landlord</Label>
        </div>
      </RadioGroup>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Maintenance Allocation</h2>
        <p className="text-sm text-muted-foreground">
          Specify who is responsible for maintaining each feature.
        </p>
      </div>

      <div className="space-y-4">
        {data.hasPool && (
          <MaintenanceOption
            feature="pool"
            icon={Droplets}
            label="swimming pool"
            value={data.poolMaintenanceBy}
            onChange={(v) => onUpdate({ poolMaintenanceBy: v })}
          />
        )}
        {data.hasGarden && (
          <MaintenanceOption
            feature="garden"
            icon={Trees}
            label="garden"
            value={data.gardenMaintenanceBy}
            onChange={(v) => onUpdate({ gardenMaintenanceBy: v })}
          />
        )}
        {data.hasAlarmSecurity && (
          <MaintenanceOption
            feature="alarm"
            icon={ShieldCheck}
            label="alarm/security system"
            value={data.alarmMaintenanceBy}
            onChange={(v) => onUpdate({ alarmMaintenanceBy: v })}
          />
        )}
      </div>
    </div>
  );
}

export function validateStep07(data: LeaseWizardData): StepValidationResult {
  return { isValid: true, errors: [] };
}
