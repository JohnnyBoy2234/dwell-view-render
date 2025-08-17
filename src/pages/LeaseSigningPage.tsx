import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Checkbox } from '../components/ui/checkbox';
import { useToast } from '../hooks/use-toast';
import { Skeleton } from '../components/ui/skeleton';

const LeaseSigningPage = () => {
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
            landlord_profile:profiles!fk_tenancies_landlord (
              display_name
            )
          `)
          .eq('id', tenancyId)
          .single();

        if (error) throw error;
        // Security check: ensure the current user is the tenant for this tenancy
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id !== data.tenant_id) {
            toast({ title: 'Unauthorized', description: 'You do not have permission to view this page.', variant: 'destructive' });
            navigate('/tenant-dashboard');
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
            tenant_signed_at: new Date().toISOString(),
            lease_status: 'awaiting_landlord_signature' // Tenant has signed, awaiting landlord
        })
        .eq('id', tenancyId);

      if (error) throw error;

      // Notify landlord via edge function
      try {
        await supabase.functions.invoke('notify-lease-signed', {
          body: { 
            tenancyId: tenancyId,
            signedBy: 'tenant'
          }
        });
      } catch (notifyError) {
        console.error('Error sending notification:', notifyError);
      }

      toast({ title: 'Lease Signed!', description: 'We have notified the landlord to add their signature.' });
      navigate('/tenant-dashboard');
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
  
  const canTenantSign = !tenancy.tenant_signed_at;
  const isFullySigned = tenancy.tenant_signed_at && tenancy.landlord_signed_at;

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Review and Sign Your Lease Agreement</CardTitle>
          <CardDescription>For property: {tenancy.properties?.title}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <h3 className="font-semibold mb-2">Lease Document</h3>
            {tenancy.lease_document_path ? (
              <>
                <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-blue-800 font-medium">Lease document is ready for review</p>
                  <p className="text-sm text-blue-600">Please download and review the lease document before signing.</p>
                </div>
                <Button variant="outline" onClick={() => handleDownload(tenancy.lease_document_path, `lease-${tenancy.properties?.title}.pdf`)}>
                    Download PDF
                </Button>
              </>
            ) : (
              <p className="text-red-500">Lease document is not yet available.</p>
            )}
          </div>
          
          {/* Lease Summary */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold mb-2">Lease Summary</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Property:</span> {tenancy.properties?.title}
              </div>
              <div>
                <span className="font-medium">Landlord:</span> {tenancy.landlord_profile?.display_name || 'N/A'}
              </div>
              <div>
                <span className="font-medium">Monthly Rent:</span> ${tenancy.monthly_rent?.toLocaleString()}
              </div>
              <div>
                <span className="font-medium">Security Deposit:</span> ${tenancy.security_deposit?.toLocaleString()}
              </div>
              <div>
                <span className="font-medium">Start Date:</span> {new Date(tenancy.start_date).toLocaleDateString()}
              </div>
              {tenancy.end_date && (
                <div>
                  <span className="font-medium">End Date:</span> {new Date(tenancy.end_date).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        </CardContent>
        
        {/* Signing Section */}
        {canTenantSign && (
          <CardFooter className="flex flex-col items-start gap-4 bg-blue-50 p-6">
            <div className="flex items-center space-x-2">
              <Checkbox id="terms" checked={agreed} onCheckedChange={(checked) => setAgreed(!!checked)} />
              <label htmlFor="terms" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                I have read, understood, and agree to all the terms and conditions in this lease agreement.
              </label>
            </div>
            <Button onClick={handleSignLease} disabled={!agreed || signing}>
              {signing ? 'Signing...' : 'Digitally Sign Lease'}
            </Button>
          </CardFooter>
        )}
        
        {/* Status Messages */}
        {tenancy.tenant_signed_at && !tenancy.landlord_signed_at && (
          <CardFooter className="bg-yellow-50 p-6">
            <p className="text-yellow-800 font-semibold">
              You signed this lease on {new Date(tenancy.tenant_signed_at).toLocaleDateString()}. 
              Waiting for landlord signature to finalize the agreement.
            </p>
          </CardFooter>
        )}
        
        {isFullySigned && (
          <CardFooter className="bg-green-50 p-6">
            <p className="text-green-800 font-semibold">
              This lease is fully executed! Both parties signed on: 
              You - {new Date(tenancy.tenant_signed_at).toLocaleDateString()}, 
              Landlord - {new Date(tenancy.landlord_signed_at).toLocaleDateString()}
            </p>
          </CardFooter>
        )}
      </Card>
    </div>
  );
};

export default LeaseSigningPage;