import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Upload, CreditCard, Wrench, Eye, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ManageTenantsTabProps } from '@/types/dashboard';
import { useState } from 'react';
import { LeaseSigningDialog } from '@/components/lease/LeaseSigningDialog';
import { PaymentRequestButton } from '@/components/payments/PaymentRequestButton';

export function ManageTenantsTab({ property, activeTenancy }: ManageTenantsTabProps) {
  const navigate = useNavigate();
  const [leaseDialogOpen, setLeaseDialogOpen] = useState(false);

  const handleUploadLease = () => {
    setLeaseDialogOpen(true);
  };

  const handleCreateLease = () => {
    if (activeTenancy) {
      setLeaseDialogOpen(true);
    } else {
      // Navigate to create tenancy first
      navigate(`/dashboard/property/${property.id}/create-tenancy`);
    }
  };

  const handleViewPayments = () => {
    navigate(`/dashboard/property/${property.id}/payments`);
  };

  const handleViewMaintenance = () => {
    navigate(`/dashboard/property/${property.id}/maintenance`);
  };

  const handleViewDocuments = () => {
    navigate(`/dashboard/property/${property.id}/documents`);
  };

  const getLeaseStatusBadge = () => {
    if (!activeTenancy) {
      return <Badge variant="outline">No Active Tenancy</Badge>;
    }
    
    switch (activeTenancy.lease_status) {
      case 'signed':
        return <Badge className="bg-green-500/10 text-green-700">Active Lease</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/10 text-yellow-700">Pending Signature</Badge>;
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
      default:
        return <Badge variant="outline">No Lease</Badge>;
    }
  };

  const getRentStatus = () => {
    // This would be calculated based on payment data
    const today = new Date();
    const dayOfMonth = today.getDate();
    
    if (dayOfMonth < 5) {
      return { status: 'paid', message: 'Rent paid for this month' };
    } else if (dayOfMonth < 10) {
      return { status: 'due', message: 'Rent due in 3 days' };
    } else {
      return { status: 'overdue', message: 'Rent is overdue' };
    }
  };

  const rentStatus = getRentStatus();

  return (
    <div className="space-y-4">
      {/* Lease Management */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Lease Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">Current Status:</span>
            {getLeaseStatusBadge()}
          </div>
          
          {activeTenancy && (
            <div className="text-sm text-muted-foreground">
              <p>Tenant: {activeTenancy.tenant_name}</p>
              <p>Term: {new Date(activeTenancy.start_date).toLocaleDateString()} - {new Date(activeTenancy.end_date).toLocaleDateString()}</p>
              <p>Rent: R{activeTenancy.monthly_rent.toLocaleString()}/month</p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button variant="outline" size="sm" onClick={handleUploadLease}>
              <Upload className="w-4 h-4 mr-2" />
              Upload a lease agreement
            </Button>
            <Button variant="outline" size="sm" onClick={handleCreateLease}>
              <FileText className="w-4 h-4 mr-2" />
              Create a lease agreement
            </Button>
            {activeTenancy?.lease_document_url && (
              <Button variant="outline" size="sm" onClick={handleViewDocuments}>
                <Eye className="w-4 h-4 mr-2" />
                View documents
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Online Payments */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Online Payments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium">This Month's Rent</p>
                <p className={`text-sm ${
                  rentStatus.status === 'paid' ? 'text-green-600' :
                  rentStatus.status === 'due' ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {rentStatus.message}
                </p>
              </div>
            </div>
            <Badge variant={
              rentStatus.status === 'paid' ? 'default' :
              rentStatus.status === 'due' ? 'secondary' : 'destructive'
            }>
              {rentStatus.status}
            </Badge>
          </div>
          
          <PaymentRequestButton
            tenancyId={property.id}
            monthlyRent={property.price}
            securityDeposit={0}
          />
        </CardContent>
      </Card>

      {/* Maintenance */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg mb-3">
            <div className="flex items-center gap-3">
              <Wrench className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium">Maintenance Requests</p>
                <p className="text-sm text-muted-foreground">0 pending requests</p>
              </div>
            </div>
          </div>
          
          <Button variant="outline" size="sm" className="w-full" onClick={handleViewMaintenance}>
            <Wrench className="w-4 h-4 mr-2" />
            View all maintenance requests
          </Button>
        </CardContent>
      </Card>

      {activeTenancy && activeTenancy.lease_document_url && (
        <LeaseSigningDialog
          isOpen={leaseDialogOpen}
          onClose={() => setLeaseDialogOpen(false)}
          onSigned={() => {
            setLeaseDialogOpen(false);
            // Handle successful signing
          }}
          tenancyId={activeTenancy.id}
          leaseDocumentUrl={activeTenancy.lease_document_url}
          currentStatus={activeTenancy.lease_status || 'draft'}
        />
      )}
    </div>
  );
}