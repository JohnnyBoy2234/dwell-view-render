import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { LeaseWizard } from '@mzanzihomes/features/lease';
import { Button } from '@mzanzihomes/ui/components/button';
import { ArrowLeft } from 'lucide-react';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';

/**
 * Parallel preview of the new essentials-first Lease Wizard, mounted at
 * /lease/wizard so it can be reviewed without touching the live
 * /lease/builder flow. Once approved it replaces LeaseBuilder.
 */
export function LeaseWizardPreview() {
  const { contractId, propertyId: pathPropertyId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const propertyId = pathPropertyId || searchParams.get('propertyId') || undefined;
  const tenantId = searchParams.get('tenantId') || undefined;

  return (
    <div className="min-h-screen bg-[#f6f8fc]">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-2xl px-4 py-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </div>
      </div>

      <LeaseWizard
        contractId={contractId}
        propertyId={propertyId}
        tenantId={tenantId}
        onContractSaved={(id) => navigate(`/lease/wizard/${id}`, { replace: true })}
        onComplete={() => {
          toast({ title: 'Lease sent', description: 'The tenant will receive it to review and sign.' });
          navigate('/enhancedlandlorddashboard/leases');
        }}
        onCancel={() => navigate(-1)}
      />
    </div>
  );
}
