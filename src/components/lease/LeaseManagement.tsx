import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Send, 
  Eye, 
  Calendar,
  User,
  MapPin,
  Clock
} from 'lucide-react';
// Simple R icon for South African Rand
const RIcon = ({ className }: { className?: string }) => (
  <div className={`${className} flex items-center justify-center font-bold text-lg`}>
    R
  </div>
);
import { useLeaseContracts } from '@/hooks/useLeaseContracts';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import type { LeaseContract } from '@/types/lease';

export function LeaseManagement() {
  const { contracts, loading, searchContracts } = useLeaseContracts();
  const { isLandlord } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredContracts, setFilteredContracts] = useState<LeaseContract[]>([]);
  const [activeTab, setActiveTab] = useState('all');

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      const results = await searchContracts(query);
      setFilteredContracts(results);
    } else {
      setFilteredContracts([]);
    }
  };

  const getDisplayContracts = () => {
    const baseContracts = searchQuery.trim() ? filteredContracts : contracts;
    
    switch (activeTab) {
      case 'draft':
        return baseContracts.filter(c => c.status === 'draft');
      case 'pending':
        return baseContracts.filter(c => c.status.includes('pending'));
      case 'signed':
        return baseContracts.filter(c => c.status === 'signed');
      default:
        return baseContracts;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'signed': return 'default';
      case 'pending_tenant': return 'secondary';
      case 'pending_landlord': return 'secondary';
      case 'draft': return 'outline';
      case 'expired': return 'destructive';
      default: return 'outline';
    }
  };

  const formatCurrency = (amount?: number, currency?: string) => {
    if (!amount) return 'Not set';
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: currency || 'ZAR'
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getContractActions = (contract: LeaseContract) => {
    const actions = [];

    if (contract.status === 'draft' && isLandlord) {
      actions.push(
        <Button key="edit" variant="outline" size="sm" onClick={() => navigate(`/lease/builder/${contract.id}`)}>
          <FileText className="h-4 w-4 mr-1" />
          Edit
        </Button>
      );
    }

    if (contract.pdf_url) {
      actions.push(
        <Button key="view" variant="outline" size="sm" asChild>
          <a href={contract.pdf_url} target="_blank" rel="noopener noreferrer">
            <Eye className="h-4 w-4 mr-1" />
            View
          </a>
        </Button>
      );
    }

    if (contract.status !== 'draft' && 
        ((isLandlord && !contract.landlord_signed_at) || (!isLandlord && !contract.tenant_signed_at))) {
      actions.push(
        <Button key="sign" onClick={() => navigate(`/lease/sign/${contract.id}`)}>
          <FileText className="h-4 w-4 mr-1" />
          Sign
        </Button>
      );
    }

    return actions;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-muted rounded w-1/3"></div>
                <div className="h-3 bg-muted rounded w-full"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Lease Management</h2>
          <p className="text-muted-foreground">
            Manage your lease contracts and track signatures
          </p>
        </div>
        
        {isLandlord && (
          <Button onClick={() => navigate('/lease/builder')}>
            <Plus className="h-4 w-4 mr-2" />
            New Contract
          </Button>
        )}
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contracts by property address, tenant name..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="flex-1"
            />
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Contracts</TabsTrigger>
          <TabsTrigger value="draft">Drafts</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="signed">Signed</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {getDisplayContracts().map((contract) => (
            <Card key={contract.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Contract Info */}
                  <div className="space-y-3 flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{contract.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={getStatusColor(contract.status)}>
                            {contract.status.replace('_', ' ')}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            Version {contract.version}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{contract.contract_data?.propertyAddress || 'Address not set'}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <RIcon className="h-6 w-6 text-muted-foreground" />
                        <span>
                          {formatCurrency(
                            contract.contract_data?.rentAmount, 
                            contract.contract_data?.rentCurrency
                          )}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{formatDate(contract.contract_data?.leaseStartDate)}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {contract.contract_data?.tenantName || 
                           contract.contract_data?.tenantEmail || 
                           'Tenant TBD'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>Created {formatDate(contract.created_at)}</span>
                      </div>
                      
                      {contract.landlord_signed_at && (
                        <div className="flex items-center space-x-1">
                          <FileText className="h-3 w-3" />
                          <span>Landlord signed {formatDate(contract.landlord_signed_at)}</span>
                        </div>
                      )}
                      
                      {contract.tenant_signed_at && (
                        <div className="flex items-center space-x-1">
                          <FileText className="h-3 w-3" />
                          <span>Tenant signed {formatDate(contract.tenant_signed_at)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    {getContractActions(contract)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {getDisplayContracts().length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {searchQuery ? 'No contracts found' : 'No contracts yet'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery 
                    ? 'Try adjusting your search terms or filters'
                    : 'Create your first lease contract to get started'
                  }
                </p>
                {!searchQuery && isLandlord && (
                  <Button onClick={() => navigate('/lease/builder')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Contract
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}