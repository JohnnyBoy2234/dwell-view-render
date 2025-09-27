import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, Home } from 'lucide-react';
import { RandMoneyBagIcon } from '@/components/icons/RandMoneyBagIcon';
import type { LeaseContractData } from '@/types/lease';

interface ContractBasicInfoProps {
  data: LeaseContractData;
  onUpdate: (updates: Partial<LeaseContractData>) => void;
}

export function ContractBasicInfo({ data, onUpdate }: ContractBasicInfoProps) {
  return (
    <div className="space-y-6">
      {/* Property Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="h-5 w-5" />
            <span>Property Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="propertyAddress">Property Address *</Label>
              <Input
                id="propertyAddress"
                value={data.propertyAddress}
                onChange={(e) => onUpdate({ propertyAddress: e.target.value })}
                placeholder="123 Main Street, City, Province"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="propertyType">Property Type *</Label>
              <Select 
                value={data.propertyType} 
                onValueChange={(value) => onUpdate({ propertyType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select property type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="apartment">Apartment</SelectItem>
                  <SelectItem value="house">House</SelectItem>
                  <SelectItem value="townhouse">Townhouse</SelectItem>
                  <SelectItem value="studio">Studio</SelectItem>
                  <SelectItem value="room">Room</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="propertyDescription">Property Description</Label>
            <Textarea
              id="propertyDescription"
              value={data.propertyDescription || ''}
              onChange={(e) => onUpdate({ propertyDescription: e.target.value })}
              placeholder="Describe the property, its features, and amenities..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="furnishedStatus">Furnished Status</Label>
              <Select 
                value={data.furnishedStatus || 'unfurnished'} 
                onValueChange={(value) => onUpdate({ furnishedStatus: value as 'furnished' | 'unfurnished' | 'semi-furnished' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="furnished">Furnished</SelectItem>
                  <SelectItem value="semi-furnished">Semi-Furnished</SelectItem>
                  <SelectItem value="unfurnished">Unfurnished</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="parkingSpaces">Parking Spaces</Label>
              <Input
                id="parkingSpaces"
                type="number"
                min="0"
                value={data.parkingSpaces || 0}
                onChange={(e) => onUpdate({ parkingSpaces: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="jurisdiction">Jurisdiction</Label>
              <Select 
                value={data.jurisdiction} 
                onValueChange={(value) => onUpdate({ jurisdiction: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select jurisdiction" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="South Africa">South Africa</SelectItem>
                  <SelectItem value="Western Cape">Western Cape</SelectItem>
                  <SelectItem value="Gauteng">Gauteng</SelectItem>
                  <SelectItem value="KwaZulu-Natal">KwaZulu-Natal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rent Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <RandMoneyBagIcon className="h-7 w-7" />
            <span>Rent Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rentAmount">Monthly Rent Amount *</Label>
              <Input
                id="rentAmount"
                type="number"
                min="0"
                step="100"
                value={data.rentAmount || ''}
                onChange={(e) => onUpdate({ rentAmount: parseFloat(e.target.value) || 0 })}
                placeholder="0"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rentCurrency">Currency</Label>
              <Select 
                value={data.rentCurrency} 
                onValueChange={(value) => onUpdate({ rentCurrency: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ZAR">ZAR (South African Rand)</SelectItem>
                  <SelectItem value="USD">USD (US Dollar)</SelectItem>
                  <SelectItem value="EUR">EUR (Euro)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rentPaymentFrequency">Payment Frequency</Label>
              <Select 
                value={data.rentPaymentFrequency} 
                onValueChange={(value) => onUpdate({ rentPaymentFrequency: value as 'monthly' | 'weekly' | 'quarterly' | 'annually' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annually">Annually</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rentDueDay">Payment Due Day</Label>
              <Input
                id="rentDueDay"
                type="number"
                min="1"
                max="31"
                value={data.rentDueDay}
                onChange={(e) => onUpdate({ rentDueDay: parseInt(e.target.value) || 1 })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="securityDeposit">Security Deposit</Label>
              <Input
                id="securityDeposit"
                type="number"
                min="0"
                step="100"
                value={data.securityDeposit || ''}
                onChange={(e) => onUpdate({ securityDeposit: parseFloat(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="petDeposit">Pet Deposit</Label>
              <Input
                id="petDeposit"
                type="number"
                min="0"
                step="100"
                value={data.petDeposit || ''}
                onChange={(e) => onUpdate({ petDeposit: parseFloat(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="keyDeposit">Key Deposit</Label>
              <Input
                id="keyDeposit"
                type="number"
                min="0"
                step="50"
                value={data.keyDeposit || ''}
                onChange={(e) => onUpdate({ keyDeposit: parseFloat(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground">
        <p>* Required fields. Complete this information to proceed to the next step.</p>
      </div>
    </div>
  );
}