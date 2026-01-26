// @ts-nocheck
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus, Send, Edit, Eye } from 'lucide-react';
import { useLeaseContracts } from '@/hooks/useLeaseContracts';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export function QuickLeaseActions() {
  const { contracts, loading } = useLeaseContracts();
  const { isLandlord } = useAuth();
  const navigate = useNavigate();

  // Get recent contracts that need attention
  const getActionableContracts = () => {
    return contracts
      .filter(contract => {
        if (isLandlord) {
          return contract.status === 'draft' || 
                 (contract.status === 'pending_landlord' && !contract.landlord_signed_at);
        } else {
          return contract.status === 'pending_tenant' && !contract.tenant_signed_at;
        }
      })
      .slice(0, 3);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_tenant': return 'secondary';
      case 'pending_landlord': return 'secondary';
      case 'draft': return 'outline';
      default: return 'outline';
    }
  };

  const getActionForContract = (contract: any) => {
    if (contract.status === 'draft' && isLandlord) {
      return {
        label: 'Continue Editing',
        icon: Edit,
        action: () => navigate(`/lease/builder/${contract.id}`)
      };
    }
    
    if ((contract.status === 'pending_tenant' && !isLandlord) ||
        (contract.status === 'pending_landlord' && isLandlord)) {
      return {
        label: 'Sign Contract',
        icon: FileText,
        action: () => navigate(`/lease/sign/${contract.id}`)
      };
    }

    return {
      label: 'View Contract',
      icon: Eye,
      action: () => navigate(`/leases`)
    };
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Lease Actions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-10 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const actionableContracts = getActionableContracts();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center space-x-2">
          <FileText className="h-5 w-5" />
          <span>Lease Actions</span>
        </CardTitle>
        {isLandlord && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/lease/builder')}
          >
            <Plus className="h-4 w-4 mr-1" />
            New
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {actionableContracts.length > 0 ? (
          <div className="space-y-3">
            {actionableContracts.map((contract) => {
              const action = getActionForContract(contract);
              const ActionIcon = action.icon;
              
              return (
                <div key={contract.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <p className="font-medium text-sm">{contract.title}</p>
                      <Badge variant={getStatusColor(contract.status)} className="text-xs">
                        {contract.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {contract.contract_data?.propertyAddress || 'Address not set'}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={action.action}>
                    <ActionIcon className="h-4 w-4 mr-1" />
                    {action.label}
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6">
            <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-3">
              {isLandlord 
                ? 'No pending lease actions. Create a new contract to get started.'
                : 'No contracts require your signature at this time.'
              }
            </p>
            {isLandlord && (
              <Button variant="outline" size="sm" onClick={() => navigate('/lease/builder')}>
                <Plus className="h-4 w-4 mr-1" />
                Create Contract
              </Button>
            )}
          </div>
        )}

        <div className="pt-3 border-t">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full"
            onClick={() => navigate('/leases')}
          >
            View All Contracts
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}