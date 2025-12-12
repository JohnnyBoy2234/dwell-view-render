import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PropertyCardProps } from '@/types/dashboard';
import { FindTenantsTab } from './FindTenantsTab';
import { ManageTenantsTab } from './ManageTenantsTab';
import { ReportPropertyModal } from '@/components/property/ReportPropertyModal';
import { Home } from 'lucide-react';

export function PropertyCard({ property, inquiriesCount, applicationsCount, activeTenancy }: PropertyCardProps) {
  // Determine default tab based on property status
  const defaultTab = property.status === 'available' ? 'find-tenants' : 'manage-tenants';
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-gradient-to-r from-success-green/10 to-success-green/20 text-success-green border-success-green/30 shadow-sm';
      case 'rented':
        return 'bg-gradient-to-r from-ocean-blue/10 to-ocean-blue/20 text-ocean-blue border-ocean-blue/30 shadow-sm';
      case 'occupied':
        return 'bg-gradient-to-r from-earth-warm/10 to-earth-warm/20 text-earth-warm border-earth-warm/30 shadow-sm';
      default:
        return 'bg-gradient-to-r from-muted/10 to-muted/20 text-muted-foreground border-muted/30 shadow-sm';
    }
  };

  return (
    <Card className="rounded-2xl bg-ocean-blue/5 ring-1 ring-ocean-blue/20 shadow-card overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:ring-ocean-blue/40 focus-within:ring-2 focus-within:ring-ocean-blue/40">
      <CardHeader className="pb-4 bg-ocean-blue/5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              {property.images && property.images.length > 0 ? (
                <div className="relative">
                  <img
                    src={property.images[0]}
                    alt={`${property.property_type} in ${property.location}`}
                    className="w-16 h-16 object-cover rounded-xl ring-2 ring-ocean-blue/20"
                  />
                  <div className="absolute inset-0 bg-ocean-blue/10 rounded-xl"></div>
                </div>
              ) : (
                <div className="w-16 h-16 bg-ocean-blue rounded-xl flex items-center justify-center">
                  <Home className="h-8 w-8 text-white" />
                </div>
              )}
              <div>
                <h3 className="text-base font-semibold text-ocean-blue">R{property.price.toLocaleString()}/month</h3>
                <p className="text-sm text-success-green/80">{property.property_type} in {property.location}</p>
              </div>
            </div>
          </div>
          <Badge className={getStatusColor(property.status)}>
            {property.status === 'available' ? 'For Rent' : 
             property.status === 'rented' ? 'Leased' : 
             property.status === 'occupied' ? 'Occupied' : property.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="bg-gradient-to-br from-white/50 to-ocean-blue/5">
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-ocean-blue/10 p-1">
            <TabsTrigger 
              value="find-tenants" 
              className="data-[state=active]:bg-ocean-blue data-[state=active]:text-white transition-all"
            >
              Find tenants
            </TabsTrigger>
            <TabsTrigger 
              value="manage-tenants"
              className="data-[state=active]:bg-success-green data-[state=active]:text-white transition-all"
            >
              Manage tenants
            </TabsTrigger>
          </TabsList>

          <TabsContent value="find-tenants" className="mt-4">
            <FindTenantsTab 
              property={property}
              inquiriesCount={inquiriesCount}
              applicationsCount={applicationsCount}
            />
          </TabsContent>

          <TabsContent value="manage-tenants" className="mt-4">
            <ManageTenantsTab 
              property={property}
              activeTenancy={activeTenancy}
            />
          </TabsContent>
        </Tabs>
        
        <div className="mt-2">
          <ReportPropertyModal propertyId={property.id} />
        </div>
      </CardContent>
    </Card>
  );
}