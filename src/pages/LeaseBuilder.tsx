import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ContractBuilder } from '@/components/lease/ContractBuilder';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export function LeaseBuilder() {
  const { contractId, propertyId } = useParams();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </div>

      <ContractBuilder
        contractId={contractId}
        propertyId={propertyId}
        onComplete={(id) => navigate(`/lease/${id}`)}
        onCancel={() => navigate(-1)}
      />
    </div>
  );
}