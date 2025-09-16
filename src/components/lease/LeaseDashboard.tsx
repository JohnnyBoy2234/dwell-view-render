import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, Users, Calendar } from 'lucide-react';
import { useLeaseContracts } from '@/hooks/useLeaseContracts';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export function LeaseDashboard() {
  const { contracts, loading } = useLeaseContracts();
  const { isLandlord } = useAuth();
  const navigate = useNavigate();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'signed': return 'default';
      case 'pending_tenant': return 'secondary';
      case 'pending_landlord': return 'secondary';
      case 'draft': return 'outline';
      default: return 'outline';
    }
  };

  if (loading) {
    return <div className="p-6">Loading contracts...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Lease Contracts</h1>
        {isLandlord && (
          <Button onClick={() => navigate('/lease/builder')}>
            <Plus className="h-4 w-4 mr-2" />
            Create Contract
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {contracts.map((contract) => (
          <Card key={contract.id} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base">{contract.title}</CardTitle>
                <Badge variant={getStatusColor(contract.status)}>
                  {contract.status.replace('_', ' ')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>Version {contract.version}</span>
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Created {new Date(contract.created_at).toLocaleDateString()}</span>
              </div>

              {contract.contract_data && (
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{contract.contract_data.landlordName || 'Landlord'}</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {contracts.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No contracts yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first lease contract to get started.
            </p>
            {isLandlord && (
              <Button onClick={() => navigate('/lease/builder')}>
                Create Contract
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}