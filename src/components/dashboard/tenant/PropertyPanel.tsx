import * as React from 'react';
import { Home, MapPin, Calendar, Shield, CreditCard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface TenantProperty {
  id: string;
  title: string;
  location: string;
  images: string[];
  monthlyRent: number;
  leaseEndDate: string;
  securityDeposit: number;
}

interface PropertyPanelProps {
  tenantProperty: TenantProperty | null;
  onMakePayment: () => void;
}

export function PropertyPanel({ tenantProperty, onMakePayment }: PropertyPanelProps) {
  if (!tenantProperty) {
    return (
      <Card className="shadow-medium border-ocean-blue/20 bg-gradient-to-br from-white to-earth-light/20 animate-fade-in">
        <CardContent className="p-6 text-center">
          <Home className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Active Lease</h3>
          <p className="text-muted-foreground mb-4">
            You don't have an active rental property at the moment.
          </p>
          <Button 
            onClick={() => window.location.href = '/properties'}
            className="bg-gradient-to-r from-ocean-blue to-ocean-blue-dark hover:from-ocean-blue-dark hover:to-ocean-blue text-white"
          >
            Browse Properties
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-medium border-ocean-blue/20 bg-gradient-to-br from-white to-earth-light/20 animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Home className="h-5 w-5 text-ocean-blue" />
          Your Property
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Property Image */}
        <div className="relative aspect-video rounded-lg overflow-hidden bg-gradient-to-br from-ocean-blue/10 to-success-green/10">
          {tenantProperty.images.length > 0 ? (
            <img
              src={tenantProperty.images[0]}
              alt={tenantProperty.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Home className="h-16 w-16 text-ocean-blue/40" />
            </div>
          )}
        </div>

        {/* Property Details */}
        <div className="space-y-3">
          <div>
            <h3 className="font-semibold text-lg text-ocean-blue">{tenantProperty.title}</h3>
            <div className="flex items-center gap-1 text-muted-foreground text-sm">
              <MapPin className="h-4 w-4" />
              {tenantProperty.location}
            </div>
          </div>

          {/* Property Stats */}
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-background to-ocean-blue/10 rounded-lg">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-ocean-blue" />
                <span className="text-sm font-medium">Monthly Rent</span>
              </div>
              <span className="font-bold text-ocean-blue">
                R{tenantProperty.monthlyRent.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-background to-success-green/10 rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-success-green" />
                <span className="text-sm font-medium">Lease Ends</span>
              </div>
              <span className="font-medium text-success-green">
                {format(new Date(tenantProperty.leaseEndDate), 'MMM dd, yyyy')}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-background to-earth-warm/10 rounded-lg">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-earth-warm" />
                <span className="text-sm font-medium">Security Deposit</span>
              </div>
              <span className="font-medium text-earth-warm">
                R{tenantProperty.securityDeposit.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button 
            onClick={onMakePayment}
            className="w-full bg-gradient-to-r from-ocean-blue to-ocean-blue-dark hover:from-ocean-blue-dark hover:to-ocean-blue text-white shadow-soft transition-all duration-300"
            size="lg"
          >
            <CreditCard className="h-5 w-5 mr-2" />
            Make Payment
          </Button>
          
          <div className="grid grid-cols-2 gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.location.href = '/tenant-messages'}
              className="border-success-green text-success-green hover:bg-success-green/10"
            >
              Contact Landlord
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.location.href = '/maintenance/new'}
              className="border-earth-warm text-earth-warm hover:bg-earth-warm/10"
            >
              Report Issue
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}