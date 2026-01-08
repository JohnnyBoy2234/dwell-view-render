import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { UserCircle, Mail, Phone, MapPin, Plus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import type { LeaseContractData } from '@/types/lease';

interface ContractPartiesProps {
  data: LeaseContractData;
  onUpdate: (updates: Partial<LeaseContractData>) => void;
}

export function ContractParties({ data, onUpdate }: ContractPartiesProps) {
  const { user } = useAuth();

  const fillLandlordFromProfile = () => {
    // In a real app, you'd get this from the user's profile
    onUpdate({
      landlordName: user?.user_metadata?.full_name || user?.email?.split('@')[0] || '',
      landlordEmail: user?.email || ''
    });
  };

  return (
    <div className="space-y-6">
      {/* Landlord Information */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <UserCircle className="h-5 w-5" />
            <span>Landlord Information</span>
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={fillLandlordFromProfile}
          >
            <Plus className="h-4 w-4 mr-1" />
            Use My Profile
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="landlordName">Full Name *</Label>
              <Input
                id="landlordName"
                value={data.landlordName}
                onChange={(e) => onUpdate({ landlordName: e.target.value })}
                placeholder="John Doe"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="landlordEmail">Email Address *</Label>
              <Input
                id="landlordEmail"
                type="email"
                value={data.landlordEmail}
                onChange={(e) => onUpdate({ landlordEmail: e.target.value })}
                placeholder="john@example.com"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="landlordPhone">Phone Number</Label>
              <Input
                id="landlordPhone"
                type="tel"
                value={data.landlordPhone || ''}
                onChange={(e) => onUpdate({ landlordPhone: e.target.value })}
                placeholder="+27 XX XXX XXXX"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="landlordAddress">Address</Label>
              <Input
                id="landlordAddress"
                value={data.landlordAddress}
                onChange={(e) => onUpdate({ landlordAddress: e.target.value })}
                placeholder="Street address, City, Province"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tenant Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <UserCircle className="h-5 w-5" />
            <span>Tenant Information</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Tenant information can be filled now or when the contract is sent to the tenant.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tenantName">Full Name</Label>
              <Input
                id="tenantName"
                value={data.tenantName || ''}
                onChange={(e) => onUpdate({ tenantName: e.target.value })}
                placeholder="Jane Smith"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tenantEmail" className="flex items-center gap-1">
                Email Address <span className="text-destructive">*</span>
                <span className="text-xs text-muted-foreground ml-1">(Required to send contract)</span>
              </Label>
              <Input
                id="tenantEmail"
                type="email"
                value={data.tenantEmail || ''}
                onChange={(e) => onUpdate({ tenantEmail: e.target.value })}
                placeholder="jane@example.com"
                required
                className={!data.tenantEmail ? 'border-amber-300 focus:border-amber-500' : ''}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tenantPhone">Phone Number</Label>
              <Input
                id="tenantPhone"
                type="tel"
                value={data.tenantPhone || ''}
                onChange={(e) => onUpdate({ tenantPhone: e.target.value })}
                placeholder="+27 XX XXX XXXX"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tenantAddress">Current Address</Label>
              <Input
                id="tenantAddress"
                value={data.tenantAddress || ''}
                onChange={(e) => onUpdate({ tenantAddress: e.target.value })}
                placeholder="Street address, City, Province"
              />
            </div>
          </div>

          {(!data.tenantName || !data.tenantEmail) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-blue-900">
                    Incomplete Tenant Information
                  </p>
                  <p className="text-sm text-blue-700">
                    You can send this contract to a tenant later, and they will be able to complete their information before signing.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact Information Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Phone className="h-5 w-5" />
            <span>Contact Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h4 className="font-medium">Landlord Contact</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>{data.landlordName || 'Name not provided'}</p>
                <p className="flex items-center space-x-1">
                  <Mail className="h-3 w-3" />
                  <span>{data.landlordEmail || 'Email not provided'}</span>
                </p>
                {data.landlordPhone && (
                  <p className="flex items-center space-x-1">
                    <Phone className="h-3 w-3" />
                    <span>{data.landlordPhone}</span>
                  </p>
                )}
                {data.landlordAddress && (
                  <p className="flex items-center space-x-1">
                    <MapPin className="h-3 w-3" />
                    <span>{data.landlordAddress}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Tenant Contact</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>{data.tenantName || 'Name not provided'}</p>
                {data.tenantEmail ? (
                  <p className="flex items-center space-x-1">
                    <Mail className="h-3 w-3" />
                    <span>{data.tenantEmail}</span>
                  </p>
                ) : (
                  <p className="text-orange-600">Email required for contract delivery</p>
                )}
                {data.tenantPhone && (
                  <p className="flex items-center space-x-1">
                    <Phone className="h-3 w-3" />
                    <span>{data.tenantPhone}</span>
                  </p>
                )}
                {data.tenantAddress && (
                  <p className="flex items-center space-x-1">
                    <MapPin className="h-3 w-3" />
                    <span>{data.tenantAddress}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground">
        <p>* Landlord information is required to proceed. Tenant information can be completed later.</p>
      </div>
    </div>
  );
}