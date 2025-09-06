import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PropertyCardProps } from '@/types/dashboard';
import { FindTenantsTab } from './FindTenantsTab';
import { ManageTenantsTab } from './ManageTenantsTab';

export function PropertyCard({ property, inquiriesCount, applicationsCount, activeTenancy }: PropertyCardProps) {
  // Determine default tab based on property status
  const defaultTab = property.status === 'available' ? 'find-tenants' : 'manage-tenants';
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-500/10 text-green-700 border-green-200';
      case 'rented':
        return 'bg-blue-500/10 text-blue-700 border-blue-200';
      case 'occupied':
        return 'bg-purple-500/10 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  return (
    <Card className="rounded-2xl bg-white ring-1 ring-black/5 shadow-card overflow-hidden transition hover:shadow-lg hover:-translate-y-[1px] focus-within:ring-2 focus-within:ring-brand-blue/40">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              {property.images && property.images.length > 0 && (
                <img
                  src={property.images[0]}
                  alt={`${property.property_type} in ${property.location}`}
                  className="w-16 h-16 object-cover rounded-xl"
                />
              )}
              <div>
                <h3 className="text-base font-semibold text-brand-gray-900">R{property.price.toLocaleString()}/month</h3>
                <p className="text-sm text-brand-gray-500">{property.property_type} in {property.location}</p>
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

      <CardContent>
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="find-tenants">Find tenants</TabsTrigger>
            <TabsTrigger value="manage-tenants">Manage tenants</TabsTrigger>
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
      </CardContent>
    </Card>
  );
}