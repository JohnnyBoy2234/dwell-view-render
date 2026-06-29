// @ts-nocheck
import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  Clock,
  FileSignature,
  FileCheck,
  FileClock,
  FileEdit,
  FileX
} from 'lucide-react';
import { useLeaseContracts } from '@/hooks/useLeaseContracts';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import type { LeaseContract } from '@mzanzihomes/common/types/lease';
import { useToast } from '@/hooks/use-toast';

// Tab configuration
const tabs = [
  { id: 'all', label: 'All Leases', icon: <FileText className="h-4 w-4" /> },
  { id: 'draft', label: 'Drafts', icon: <FileEdit className="h-4 w-4" /> },
  { id: 'pending', label: 'Pending', icon: <FileClock className="h-4 w-4" /> },
  { id: 'signed', label: 'Signed', icon: <FileCheck className="h-4 w-4" /> },
  { id: 'expired', label: 'Expired', icon: <FileX className="h-4 w-4" /> },
];

export function LeaseManagement() {
  const { 
    contracts = [], 
    loading, 
    searchContracts,
    refetch
  } = useLeaseContracts();
  
  const { isLandlord, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredContracts, setFilteredContracts] = useState<LeaseContract[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  
  // Fetch leases on component mount
  useEffect(() => {
    const loadLeases = async () => {
      try {
        await refetch();
      } catch (error) {
        console.error('Error loading leases:', error);
        toast({
          title: 'Error',
          description: 'Failed to load leases. Please try again.',
          variant: 'destructive',
        });
      }
    };
    
    loadLeases();
  }, [refetch, toast]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      // If searchContracts is not available, implement client-side search
      if (typeof searchContracts === 'function') {
        const results = await searchContracts(query);
        setFilteredContracts(Array.isArray(results) ? results : []);
      } else {
        // Client-side search fallback
        const searchTerm = query.toLowerCase();
        const filtered = contracts.filter(contract => 
          (contract.contract_data?.propertyAddress?.toLowerCase().includes(searchTerm)) ||
          (contract.contract_data?.tenantName?.toLowerCase().includes(searchTerm)) ||
          (contract.contract_data?.landlordName?.toLowerCase().includes(searchTerm)) ||
          (contract.status?.toLowerCase().includes(searchTerm))
        );
        setFilteredContracts(filtered);
      }
    } else {
      setFilteredContracts([]);
    }
  };

  const displayContracts = useMemo(() => {
    const baseContracts = searchQuery.trim() ? filteredContracts : contracts;
    
    switch (activeTab) {
      case 'draft':
        return baseContracts.filter(c => c.status === 'draft');
      case 'pending':
        return baseContracts.filter(c => c.status.includes('pending'));
      case 'signed':
        return baseContracts.filter(c => c.status === 'signed');
      case 'expired':
        return baseContracts.filter(c => c.status === 'expired');
      default:
        return baseContracts;
    }
  }, [activeTab, contracts, filteredContracts, searchQuery]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'signed':
        return { text: 'Signed', className: 'bg-success-green text-white' };
      case 'pending_tenant':
        return { text: 'Pending Tenant', className: 'bg-amber-500 text-white' };
      case 'pending_landlord':
        return { text: 'Pending Landlord', className: 'bg-amber-500 text-white' };
      case 'draft':
        return { text: 'Draft', className: 'bg-gray-500 text-white' };
      case 'expired':
        return { text: 'Expired', className: 'bg-destructive text-white' };
      default:
        return { text: status, className: 'bg-gray-200 text-gray-800' };
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
          <a href={`${contract.pdf_url}${contract.pdf_url.includes('?') ? '&' : '?'}ts=${Date.now()}`} target="_blank" rel="noopener noreferrer">
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lease Management</h1>
          <p className="text-muted-foreground">
            Manage all your lease agreements in one place
          </p>
        </div>
        <Button onClick={() => navigate('/lease/builder')} className="w-full md:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          New Lease
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search leases..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  handleSearch(e.target.value);
                }}
              />
            </div>
            <Button variant="outline" className="hidden sm:flex">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <Tabs 
            value={activeTab} 
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="w-full justify-start overflow-x-auto py-0 h-auto">
              {tabs.map((tab) => (
                <TabsTrigger 
                  key={tab.id} 
                  value={tab.id}
                  className="flex items-center gap-2 py-2 px-4"
                >
                  {tab.icon}
                  <span className="whitespace-nowrap">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="mt-6">
              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-24 bg-muted/50 animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : displayContracts.length === 0 ? (
                <div className="text-center py-12 space-y-4">
                  <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-muted/50">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium">
                      No {activeTab !== 'all' ? activeTab : ''} leases found
                    </h3>
                    <p className="text-muted-foreground mt-1">
                      {activeTab === 'all' 
                        ? 'Get started by creating a new lease agreement.'
                        : `You don't have any ${activeTab} leases at the moment.`}
                    </p>
                  </div>
                  {activeTab === 'all' && (
                    <Button 
                      onClick={() => navigate('/lease/builder')} 
                      className="mt-4"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Lease
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {displayContracts.map((contract) => {
                    const status = getStatusBadge(contract.status);
                    return (
                      <Card key={contract.id} className="overflow-hidden hover:shadow-md transition-shadow">
                        <CardContent className="p-0">
                          <div className="p-4 md:p-6">
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                              <div className="space-y-2 flex-1">
                                <div className="flex items-center gap-3">
                                  <h3 className="text-lg font-semibold">
                                    {contract.title || 'Lease Agreement'}
                                  </h3>
                                  <Badge className={status.className}>
                                    {status.text}
                                  </Badge>
                                </div>
                                
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                                  <div className="flex items-center">
                                    <User className="h-4 w-4 mr-1.5" />
                                    <span>{contract.contract_data?.tenantName || 'No tenant assigned'}</span>
                                  </div>
                                  <div className="flex items-center">
                                    <MapPin className="h-4 w-4 mr-1.5" />
                                    <span>{contract.contract_data?.propertyAddress?.split(',')[0] || 'No address'}</span>
                                  </div>
                                  <div className="flex items-center">
                                    <Calendar className="h-4 w-4 mr-1.5" />
                                    <span>
                                      {formatDate(contract.contract_data?.leaseStartDate)} - {formatDate(contract.contract_data?.leaseEndDate)}
                                    </span>
                                  </div>
                                  <div className="flex items-center">
                                    <span className="font-medium">
                                      {formatCurrency(contract.contract_data?.rentAmount, contract.contract_data?.rentCurrency)}/mo
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex flex-col sm:flex-row gap-2">
                                {getContractActions(contract)}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}