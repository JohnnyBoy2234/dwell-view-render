// @ts-nocheck
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import { Button } from '@mzanzihomes/ui/components/button';
import { Badge } from '@mzanzihomes/ui/components/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@mzanzihomes/ui/components/tabs';
import { Plus, FileText, Eye, Edit, Send, PenTool, Users, Calendar } from 'lucide-react';
import { useLeaseContracts } from '@/hooks/useLeaseContracts';
import { useAuth } from '@/hooks/useAuth';
import { LeaseDocumentViewer } from './LeaseDocumentViewer';
import { LeaseSignaturePad } from './LeaseSignaturePad';
import { CreateLeaseModal } from './CreateLeaseModal';
import { PROPERTY_CARD_STYLES } from '@mzanzihomes/common/constants/propertyCardConstants';
import type { LeaseContract } from '@mzanzihomes/common/types/lease';

interface LeaseDashboardProps {
  propertyId?: string;
}

export function LeaseDashboard({ propertyId }: LeaseDashboardProps = {}) {
  const navigate = useNavigate();
  const { contracts, loading } = useLeaseContracts(propertyId);
  const { user, isLandlord } = useAuth();
  const [selectedContract, setSelectedContract] = useState<LeaseContract | null>(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'secondary';
      case 'pending_tenant': return 'destructive';
      case 'pending_landlord': return 'destructive';
      case 'signed': return 'default';
      case 'expired': return 'outline';
      case 'terminated': return 'outline';
      default: return 'secondary';
    }
  };

  const getDraftContracts = () => contracts.filter(c => c.status === 'draft');
  const getPendingContracts = () => contracts.filter(c => 
    c.status === 'pending_tenant' || c.status === 'pending_landlord'
  );
  const getSignedContracts = () => contracts.filter(c => c.status === 'signed');

  const handleViewContract = (contract: LeaseContract) => {
    setSelectedContract(contract);
  };

  const handleSignContract = (contract: LeaseContract) => {
    setSelectedContract(contract);
    setShowSignaturePad(true);
  };

  const canSign = (contract: LeaseContract) => {
    if (isLandlord && !contract.landlord_signed_at) return true;
    if (!isLandlord && contract.tenant_id === user?.id && !contract.tenant_signed_at) return true;
    return false;
  };

  if (loading) {
    return <div className="flex justify-center items-center py-16">Loading contracts...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end items-center">
        {isLandlord && (
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Contract
          </Button>
        )}
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All ({contracts.length})</TabsTrigger>
          <TabsTrigger value="draft">Draft ({getDraftContracts().length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({getPendingContracts().length})</TabsTrigger>
          <TabsTrigger value="signed">Signed ({getSignedContracts().length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <ContractsList 
            contracts={contracts} 
            onView={handleViewContract}
            onSign={handleSignContract}
            onEdit={(contract) => navigate(`/lease/builder/${contract.id}`)}
            canSign={canSign}
            isLandlord={isLandlord}
          />
        </TabsContent>

        <TabsContent value="draft" className="space-y-4">
          <ContractsList 
            contracts={getDraftContracts()} 
            onView={handleViewContract}
            onSign={handleSignContract}
            onEdit={(contract) => navigate(`/lease/builder/${contract.id}`)}
            canSign={canSign}
            isLandlord={isLandlord}
          />
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <ContractsList 
            contracts={getPendingContracts()} 
            onView={handleViewContract}
            onSign={handleSignContract}
            onEdit={(contract) => navigate(`/lease/builder/${contract.id}`)}
            canSign={canSign}
            isLandlord={isLandlord}
          />
        </TabsContent>

        <TabsContent value="signed" className="space-y-4">
          <ContractsList 
            contracts={getSignedContracts()} 
            onView={handleViewContract}
            onSign={handleSignContract}
            onEdit={(contract) => navigate(`/lease/builder/${contract.id}`)}
            canSign={canSign}
            isLandlord={isLandlord}
          />
        </TabsContent>
      </Tabs>

      {/* Contract Details Modal */}
      {selectedContract && !showSignaturePad && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-end mb-4">
              <Button variant="outline" onClick={() => setSelectedContract(null)}>
                Close
              </Button>
            </div>
            <LeaseDocumentViewer contract={selectedContract} />
          </div>
        </div>
      )}

      {/* Signature Pad Modal */}
      {selectedContract && showSignaturePad && (
        <LeaseSignaturePad
          contract={selectedContract}
          open={showSignaturePad}
          onOpenChange={setShowSignaturePad}
          onSigned={() => {
            setShowSignaturePad(false);
            setSelectedContract(null);
            // Refresh contracts list
            window.location.reload();
          }}
        />
      )}

      {/* Create Lease Modal */}
      <CreateLeaseModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
      />
    </div>
  );
}

interface ContractsListProps {
  contracts: LeaseContract[];
  onView: (contract: LeaseContract) => void;
  onSign: (contract: LeaseContract) => void;
  onEdit: (contract: LeaseContract) => void;
  canSign: (contract: LeaseContract) => boolean;
  isLandlord: boolean;
}

function ContractsList({ contracts, onView, onSign, onEdit, canSign, isLandlord }: ContractsListProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'secondary';
      case 'pending_tenant': return 'destructive';
      case 'pending_landlord': return 'destructive';
      case 'signed': return 'default';
      case 'expired': return 'outline';
      case 'terminated': return 'outline';
      default: return 'secondary';
    }
  };

  if (contracts.length === 0) {
    return (
      <Card className={PROPERTY_CARD_STYLES.CARD}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No contracts found</h3>
          <p className="text-muted-foreground text-center mb-6 px-4">
            {isLandlord 
              ? "Get started by creating your first lease contract"
              : "You don't have any lease contracts yet"
            }
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {contracts.map((contract) => (
        <Card key={contract.id} className={PROPERTY_CARD_STYLES.CARD}>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
              <div className="min-w-0 flex-1">
                <CardTitle className="line-clamp-1">{contract.title}</CardTitle>
                <CardDescription>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 flex-shrink-0" />
                      <span className="line-clamp-1">Created {new Date(contract.created_at).toLocaleDateString()}</span>
                    </span>
                  </div>
                </CardDescription>
              </div>
              <Badge className="w-fit flex-shrink-0" variant={getStatusColor(contract.status)}>
                {contract.status.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground space-y-1">
                <p className="line-clamp-1"><strong>Property:</strong> {(
                  (contract.contract_data?.propertyAddress || '')
                ).split(',')[0] || 'Not specified'}</p>
                {contract.tenant_id && (
                  <p className="line-clamp-1"><strong>Tenant:</strong> {contract.contract_data?.tenantName || contract.contract_data?.tenantEmail}</p>
                )}
                <p className="line-clamp-1"><strong>Rent:</strong> {contract.contract_data?.rentCurrency || 'ZAR'} {contract.contract_data?.rentAmount?.toLocaleString() || 'Not specified'}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => onView(contract)}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </Button>

                {contract.status === 'draft' && isLandlord && (
                  <Button variant="outline" size="sm" onClick={() => onEdit(contract)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}

                {canSign(contract) && (
                  <Button size="sm" onClick={() => onSign(contract)}>
                    <PenTool className="h-4 w-4 mr-2" />
                    Sign Contract
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}