import { useEffect, useState } from 'react';
import { FileText, Eye, Calendar, MapPin, PenTool, Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTenantDashboard } from '@/hooks/useTenantDashboard';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export default function TenantLeaseDocuments() {
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
    const fileName = `SwiftRent_${safe}_${new Date().toISOString().split('T')[0]}.pdf`;
    
    try {
      // First try the new lease_agreements table (SwiftRent 28-section system)
      const { data: swiftRentLease } = await supabase
        .from('lease_agreements')
        .select('pdf_url, pdf_path, created_at')
        .eq('property_id', lease.property_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (swiftRentLease?.pdf_url) {
        const a = document.createElement('a');
        const joiner = swiftRentLease.pdf_url.includes('?') ? '&' : '?';
        a.href = `${swiftRentLease.pdf_url}${joiner}download=${encodeURIComponent(fileName)}&ts=${Date.now()}`;
        a.download = fileName;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast({ title: 'SwiftRent lease downloaded successfully!' });
        return;
      }

      // Fallback to old leases table (legacy system)
      if (lease.pdf_draft_url) {
        const a = document.createElement('a');
        const joiner = lease.pdf_draft_url.includes('?') ? '&' : '?';
        a.href = `${lease.pdf_draft_url}${joiner}download=${encodeURIComponent(fileName)}&ts=${Date.now()}`;
        a.download = fileName;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
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
        <Card className="bg-gradient-to-r from-ocean-blue/5 to-success-green/5 border-ocean-blue/20">
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
                    {lease.pdf_draft_url && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(lease)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleView(lease.pdf_draft_url)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      onClick={() => window.location.href = `/tenant/contracts/${lease.id}/sign`}
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