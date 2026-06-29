import React from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { SALeaseWizard } from '@/components/lease/SALeaseWizard';
import { Button } from '@mzanzihomes/ui/components/button';
import { ArrowLeft } from 'lucide-react';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';

export function LeaseBuilder() {
  const { contractId, propertyId: pathPropertyId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Support both path params and query params for propertyId
  const propertyId = pathPropertyId || searchParams.get('propertyId') || undefined;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </div>

      <SALeaseWizard
        contractId={contractId}
        propertyId={propertyId}
        onComplete={(id) => {
          toast({
            title: "Contract Completed",
            description: "Lease contract has been created and sent for tenant signature.",
          });
          navigate('/enhancedlandlorddashboard/leases');
        }}
        onCancel={() => navigate(-1)}
      />
    </div>
  );
}
