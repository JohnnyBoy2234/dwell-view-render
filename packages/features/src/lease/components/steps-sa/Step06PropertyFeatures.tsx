import React from 'react';
import { Label } from '@mzanzihomes/ui/components/label';
import { Switch } from '@mzanzihomes/ui/components/switch';
import type { LeaseWizardData, StepValidationResult } from '@mzanzihomes/common/types/lease';
import { Droplets, Trees, PawPrint, Cigarette, ShieldCheck } from 'lucide-react';

interface Step06Props {
  data: LeaseWizardData;
  onUpdate: (updates: Partial<LeaseWizardData>) => void;
}

const features = [
  { key: 'hasPool', label: 'Swimming Pool', description: 'Property has a swimming pool', icon: Droplets },
  { key: 'hasGarden', label: 'Garden', description: 'Property has a garden requiring maintenance', icon: Trees },
  { key: 'hasAlarmSecurity', label: 'Alarm / Security System', description: 'Property has alarm, beams, or security gates', icon: ShieldCheck },
  { key: 'petsAllowed', label: 'Pets Allowed', description: 'Tenant may keep pets on the property', icon: PawPrint },
  { key: 'smokingAllowed', label: 'Smoking Allowed', description: 'Smoking is permitted inside the property', icon: Cigarette },
] as const;

export function Step06PropertyFeatures({ data, onUpdate }: Step06Props) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Property Features</h2>
        <p className="text-sm text-muted-foreground">
          Select the features that apply to this property. This determines which clauses are included.
        </p>
      </div>

      <div className="space-y-3">
        {features.map(({ key, label, description, icon: Icon }) => (
          <div key={key} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-3">
              <Icon className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor={key} className="font-medium cursor-pointer">{label}</Label>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            </div>
            <Switch
              id={key}
              checked={data[key as keyof LeaseWizardData] as boolean}
              onCheckedChange={(checked) => onUpdate({ [key]: checked })}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function validateStep06(data: LeaseWizardData): StepValidationResult {
  return { isValid: true, errors: [] };
}
