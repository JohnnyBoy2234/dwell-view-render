import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Shield, Home } from 'lucide-react';
import type { LeaseContractData } from '@/types/lease';

interface ContractTermsProps {
  data: LeaseContractData;
  onUpdate: (updates: Partial<LeaseContractData>) => void;
}

const commonUtilities = [
  'Water', 'Electricity', 'Gas', 'Internet', 'Cable TV', 'Sewerage', 
  'Refuse Collection', 'Security', 'Garden Services', 'Pool Maintenance'
];

export function ContractTerms({ data, onUpdate }: ContractTermsProps) {
  const handleUtilityToggle = (utility: string, included: boolean) => {
    const currentIncluded = data.utilitiesIncluded || [];
    const currentExcluded = data.utilitiesExcluded || [];

    if (included) {
      // Add to included, remove from excluded
      onUpdate({
        utilitiesIncluded: [...currentIncluded.filter(u => u !== utility), utility],
        utilitiesExcluded: currentExcluded.filter(u => u !== utility)
      });
    } else {
      // Add to excluded, remove from included  
      onUpdate({
        utilitiesIncluded: currentIncluded.filter(u => u !== utility),
        utilitiesExcluded: [...currentExcluded.filter(u => u !== utility), utility]
      });
    }
  };

  const isUtilityIncluded = (utility: string) => {
    return data.utilitiesIncluded?.includes(utility) || false;
  };

  const isUtilityExcluded = (utility: string) => {
    return data.utilitiesExcluded?.includes(utility) || false;
  };

  return (
    <div className="space-y-6">
      {/* Lease Duration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Lease Duration</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="leaseStartDate">Start Date *</Label>
              <Input
                id="leaseStartDate"
                type="date"
                value={data.leaseStartDate}
                onChange={(e) => onUpdate({ leaseStartDate: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="leaseEndDate">End Date *</Label>
              <Input
                id="leaseEndDate"
                type="date"
                value={data.leaseEndDate}
                onChange={(e) => onUpdate({ leaseEndDate: e.target.value })}
                min={data.leaseStartDate}
                required
              />
            </div>
          </div>

          {data.leaseStartDate && data.leaseEndDate && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Lease Duration:</strong> {
                  Math.ceil(
                    (new Date(data.leaseEndDate).getTime() - new Date(data.leaseStartDate).getTime()) 
                    / (1000 * 60 * 60 * 24 * 30.44)
                  )
                } months
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Utilities & Services */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Utilities & Services</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Specify which utilities are included in the rent and which are tenant's responsibility.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {commonUtilities.map((utility) => (
              <div key={utility} className="flex items-center justify-between p-3 border rounded-lg">
                <span className="text-sm font-medium">{utility}</span>
                <div className="flex items-center space-x-2">
                  <Label className="text-xs">Excluded</Label>
                  <Switch
                    checked={isUtilityIncluded(utility)}
                    onCheckedChange={(checked) => handleUtilityToggle(utility, checked)}
                  />
                  <Label className="text-xs">Included</Label>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-green-700">Included in Rent:</Label>
                <div className="flex flex-wrap gap-1">
                  {(data.utilitiesIncluded || []).map((utility) => (
                    <Badge key={utility} variant="secondary" className="text-xs bg-green-100 text-green-800">
                      {utility}
                    </Badge>
                  ))}
                  {(!data.utilitiesIncluded || data.utilitiesIncluded.length === 0) && (
                    <span className="text-xs text-muted-foreground">None selected</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Property Rules & Restrictions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Home className="h-5 w-5" />
            <span>Property Rules & Restrictions</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="petsAllowed">Pets Allowed</Label>
                  <p className="text-xs text-muted-foreground">Allow pets on the property</p>
                </div>
                <Switch
                  id="petsAllowed"
                  checked={data.petsAllowed || false}
                  onCheckedChange={(checked) => onUpdate({ petsAllowed: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="smokingAllowed">Smoking Allowed</Label>
                  <p className="text-xs text-muted-foreground">Allow smoking inside the property</p>
                </div>
                <Switch
                  id="smokingAllowed"
                  checked={data.smokingAllowed || false}
                  onCheckedChange={(checked) => onUpdate({ smokingAllowed: checked })}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="guestsAllowed">Guests Allowed</Label>
                  <p className="text-xs text-muted-foreground">Allow overnight guests</p>
                </div>
                <Switch
                  id="guestsAllowed"
                  checked={data.guestsAllowed !== false}
                  onCheckedChange={(checked) => onUpdate({ guestsAllowed: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="sublettingAllowed">Subletting Allowed</Label>
                  <p className="text-xs text-muted-foreground">Allow tenant to sublet the property</p>
                </div>
                <Switch
                  id="sublettingAllowed"
                  checked={data.sublettingAllowed || false}
                  onCheckedChange={(checked) => onUpdate({ sublettingAllowed: checked })}
                />
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <Shield className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-amber-900">Property Rules Summary</p>
                <ul className="text-sm text-amber-800 space-y-1">
                  <li>• Pets: {data.petsAllowed ? 'Allowed' : 'Not allowed'}</li>
                  <li>• Smoking: {data.smokingAllowed ? 'Allowed' : 'Not allowed'}</li>
                  <li>• Guests: {data.guestsAllowed !== false ? 'Allowed' : 'Not allowed'}</li>
                  <li>• Subletting: {data.sublettingAllowed ? 'Allowed' : 'Not allowed'}</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground">
        <p>* Required fields must be completed to proceed to the next step.</p>
      </div>
    </div>
  );
}