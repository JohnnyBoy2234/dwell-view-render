// @ts-nocheck
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Eye, Calendar, MapPin, PenTool, Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTenantDashboard } from '@/hooks/useTenantDashboard';
import { downloadFileFromUrl, openUrlInNewTab } from '@/lib/download';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export default function TenantLeaseDocuments() {
  const navigate = useNavigate();
  const { tenantProperty, loading } = useTenantDashboard();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loadingLeases, setLoadingLeases] = useState(false);
  const [leases, setLeases] = useState<Array<{ id: string; status: string; created_at: string; pdf_draft_url?: string; property?: { title?: string; location?: string }; property_id?: string }>>([]);

  useEffect(() => {
    const fetchLeases = async () => {
      if (!user) return;
      setLoadingLeases(true);
      try {
        const { data, error } = await supabase
          .from('leases')
          .select('id, status, created_at, pdf_draft_url, property_id, properties:property_id(title, location)')
          .eq('tenant_user_id', user.id)
          .order('created_at', { ascending: false });
        if (!error && data) {
          // Map property relation to a simple object key 'property'
          const mapped = (data as any[]).map((row) => ({
            id: row.id,
            status: row.status,
            created_at: row.created_at,
            pdf_draft_url: row.pdf_draft_url,
            property_id: row.property_id,
            property: row.properties ? { title: row.properties.title, location: row.properties.location } : undefined,
          }));
          setLeases(mapped);
        }
      } finally {
        setLoadingLeases(false);
      }
    };
    fetchLeases();
  }, [user?.id]);

  const handleView = (url?: string) => {
    if (url) {
      const joiner = url.includes('?') ? '&' : '?';
      window.open(`${url}${joiner}ts=${Date.now()}`, '_blank');
    }
  };

  const handleDownload = async (lease: any) => {
    const title = lease.property?.title || 'Lease_Agreement';
    const safe = title.replace(/[^a-z0-9]/gi, '_');
    const fileName = `MzanziHomes_${safe}_${new Date().toISOString().split('T')[0]}.pdf`;
    
    try {
      // First try the leases table (new lease pack system)
      const { data: latestLease } = await supabase
        .from('leases')
        .select('id, pdf_draft_url, pdf_signed_url, lease_data, created_at')
        .eq('property_id', lease.property_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestLease) {
        const preferredUrl = latestLease.pdf_draft_url || latestLease.pdf_signed_url;
        
        if (preferredUrl) {
          // Try the stored URL first
          try {
            await downloadFileFromUrl(preferredUrl, fileName);
            toast({ title: 'Lease downloaded successfully!' });
            return;
          } catch (urlError) {
            console.log('Stored URL failed, attempting to regenerate...');
          }
        }
        
        // If no URL or URL failed, try to regenerate from lease_data
        const pdfPath = (latestLease.lease_data as any)?.pdf?.finalPath;
        if (pdfPath) {
          try {
            const { data: signedData, error: signedError } = await supabase.storage
              .from('lease-documents')
              .createSignedUrl(pdfPath, 60 * 60 * 24); // 24 hours
            
            if (!signedError && signedData) {
              await downloadFileFromUrl(signedData.signedUrl, fileName);
              toast({ title: 'Lease downloaded successfully!' });
              return;
            }
          } catch (regenerateError) {
            console.log('URL regeneration failed:', regenerateError);
          }
        }
      }

      // Fallback to legacy lease_agreements table (if it exists)
      const { data: MzanziHomesLease } = await supabase
        .from('lease_agreements')
        .select('pdf_url, pdf_path, created_at')
        .eq('property_id', lease.property_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (MzanziHomesLease?.pdf_url) {
        await downloadFileFromUrl(MzanziHomesLease.pdf_url, fileName);
        toast({ title: 'MzanziHomes lease downloaded successfully!' });
        return;
      }

      // Fallback to new leases table
      const { data: fallbackLease } = await supabase
        .from('leases')
        .select('pdf_signed_url, pdf_draft_url, created_at')
        .eq('id', lease.id)
        .maybeSingle();
      const preferred = fallbackLease?.pdf_signed_url || fallbackLease?.pdf_draft_url || lease.pdf_draft_url;
      if (preferred) {
        await downloadFileFromUrl(preferred, fileName);
        toast({ title: 'Lease downloaded successfully!' });
        return;
      }

      toast({ variant: 'destructive', title: 'No document to download' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Download failed', description: e.message });
    }
  };

  if (loading || loadingLeases) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted animate-pulse rounded"></div>
        <div className="grid gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 bg-muted animate-pulse rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  const documents = leases;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Lease Documents</h1>
        <p className="text-muted-foreground">
          Access and download your lease agreement and related documents
        </p>
      </div>

      {/* Property Information Card */}
      {tenantProperty && (
        <Card className="bg-ocean-blue/5 border-ocean-blue/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-ocean-blue">
              <MapPin className="h-5 w-5" />
              Current Property
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Address</p>
                <p className="font-semibold">{tenantProperty.title}</p>
                <p className="text-sm text-muted-foreground">{tenantProperty.location}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Rent</p>
                <p className="font-semibold text-lg">R{tenantProperty.monthlyRent.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Lease End Date</p>
                <p className="font-semibold flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(tenantProperty.leaseEndDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents Grid */}
      <div className="grid gap-6">
        {documents.length === 0 ? (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-lg">No leases yet</CardTitle>
              <CardDescription>When a landlord generates a lease for you, it will appear here.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          documents.map((lease) => (
            <Card key={lease.id} className="hover:shadow-medium transition-all duration-200">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-ocean-blue/10 rounded-lg flex items-center justify-center">
                      <FileText className="h-6 w-6 text-ocean-blue" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Lease Agreement</CardTitle>
                      <CardDescription>
                        {lease.property?.title || 'Property'} • {lease.property?.location || 'Address'}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge 
                    variant={lease.status?.toLowerCase() === 'completed' ? 'default' : 'secondary'}
                    className={lease.status?.toLowerCase() === 'completed' ? 'bg-success-green text-white' : ''}
                  >
                    {lease.status || 'draft'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <span>Updated: {new Date(lease.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(lease)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    {lease.pdf_draft_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleView(lease.pdf_draft_url)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => navigate(`/MzanziHomes-lease/${lease.id}`)}
                      className="bg-ocean-blue hover:bg-ocean-blue-dark"
                    >
                      <PenTool className="h-4 w-4 mr-2" />
                      Review & Sign
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}