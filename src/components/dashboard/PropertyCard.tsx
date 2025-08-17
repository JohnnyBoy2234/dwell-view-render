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
    <Card className="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              {property.images && property.images.length > 0 && (
                <img
                  src={property.images[0]}
                  alt={property.title}
                  className="w-16 h-16 object-cover rounded-lg"
                />
              )}
              <div>
                <h3 className="font-semibold text-lg">{property.title}</h3>
                <p className="text-sm text-muted-foreground">{property.location}</p>
                <p className="text-sm font-medium">R{property.price.toLocaleString()}/month</p>
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