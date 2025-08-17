import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Checkbox } from '../components/ui/checkbox';
import { useToast } from '../hooks/use-toast';
import { Skeleton } from '../components/ui/skeleton';

const LandlordLeaseSigningPage = () => {
  const { tenancyId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tenancy, setTenancy] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    const fetchTenancy = async () => {
      if (!tenancyId) return;
      try {
        const { data, error } = await supabase
          .from('tenancies')
          .select(`
            *,
            properties!inner (
              title,
              location
            ),
            tenant_profile:profiles!fk_tenancies_tenant (
              display_name
            )
          `)
          .eq('id', tenancyId)
          .single();

        if (error) throw error;
        // Security check: ensure the current user is the landlord for this tenancy
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id !== data.landlord_id) {
            toast({ title: 'Unauthorized', description: 'You do not have permission to view this page.', variant: 'destructive' });
            navigate('/dashboard');
            return;
        }
        setTenancy(data);
      } catch (error: any) {
        console.error('Error fetching tenancy:', error);
        toast({ title: 'Error', description: 'Could not fetch lease details.', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    fetchTenancy();
  }, [tenancyId, toast, navigate]);

  const handleSignLease = async () => {
    if (!agreed) {
      toast({ title: 'Agreement Required', description: 'You must agree to the terms before signing.', variant: 'destructive' });
      return;
    }
    setSigning(true);
    try {
      const { error } = await supabase
        .from('tenancies')
        .update({ 
            landlord_signed_at: new Date().toISOString(),
            lease_status: 'completed',
            status: 'active'
        })
        .eq('id', tenancyId);

      if (error) throw error;

      toast({ title: 'Lease Finalized!', description: 'The lease is now active and signed by both parties.' });
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Error signing lease:', error);
      toast({ title: 'Signing Failed', description: error.message, variant: 'destructive' });
    } finally {
      setSigning(false);
    }
  };
  
  const handleDownload = async (filePath: string, filename: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('lease-documents')
        .download(filePath);

      if (error) throw error;

      const blob = new Blob([data], { type: 'application/pdf' });
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename || 'lease-agreement.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed:', error);
      toast({ title: 'Download Failed', description: 'Could not download the PDF.', variant: 'destructive' });
    }
  };


  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <Skeleton className="h-12 w-1/2 mb-4" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!tenancy) {
    return <div className="container mx-auto p-4">Lease not found.</div>;
  }
  
  const isReadyForLandlordSignature = tenancy.tenant_signed_at && !tenancy.landlord_signed_at;

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Finalize Lease Agreement</CardTitle>
          <CardDescription>For property: {tenancy.properties?.title}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <h3 className="font-semibold mb-2">Lease Document</h3>
            {tenancy.lease_document_path ? (
              <>
                <div className="mb-4 p-4 bg-green-50 rounded-lg">
                  <p className="text-green-800 font-medium">Tenant has signed the lease</p>
                  <p className="text-sm text-green-600">Please download and review the lease document before adding your signature.</p>
                </div>
                <Button variant="outline" onClick={() => handleDownload(tenancy.lease_document_path, `lease-${tenancy.properties?.title}.pdf`)}>
                    Download PDF
                </Button>
              </>
            ) : (
              <p className="text-red-500">Lease document is not yet available.</p>
            )}
          </div>
        </CardContent>
        {isReadyForLandlordSignature && (
            <CardFooter className="flex flex-col items-start gap-4 bg-slate-50 p-6">
                <div className="flex items-center space-x-2">
                    <Checkbox id="terms" checked={agreed} onCheckedChange={(checked) => setAgreed(!!checked)} />
                    <label htmlFor="terms" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        I confirm this lease is correct and agree to digitally sign as the landlord.
                    </label>
                </div>
                <Button onClick={handleSignLease} disabled={!agreed || signing}>
                    {signing ? 'Finalizing...' : 'Digitally Sign and Finalize Lease'}
                </Button>
            </CardFooter>
        )}
        {tenancy.landlord_signed_at && (
            <CardFooter className="bg-green-50 p-6">
                <p className="text-green-800 font-semibold">This lease was finalized on {new Date(tenancy.landlord_signed_at).toLocaleDateString()}.</p>
            </CardFooter>
        )}
      </Card>
    </div>
  );
};

export default LandlordLeaseSigningPage;