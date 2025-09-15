import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileText } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { downloadFileFromUrl } from "@/lib/download";

interface SignedLease {
  id: string;
  property_id: string;
  landlord_id: string;
  tenant_id: string;
  monthly_rent: number;
  security_deposit: number | null;
  start_date: string;
  end_date: string | null;
  lease_document_path: string | null;
  lease_document_url?: string | null;
  lease_status?: string | null;
  created_at: string;
  properties?: { title: string; location: string } | null;
  tenant_profile?: { display_name: string } | null;
  landlord_profile?: { display_name: string } | null;
}

export function SignedLeasesList({ role }: { role: "landlord" | "tenant" }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [leases, setLeases] = useState<SignedLease[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      try {
        // Legacy tenancies (older system)
        const query = supabase
          .from("tenancies")
          .select(`*,
            properties(title, location),
            tenant_profile:profiles!tenant_id(display_name),
            landlord_profile:profiles!landlord_id(display_name)
          `)
          .in("lease_status", ["awaiting_tenant_signature", "awaiting_landlord_signature", "completed"]) 
          .order("created_at", { ascending: false });

        const { data: legacyData, error: legacyErr } = await (role === "landlord" ?
          query.eq("landlord_id", user.id) :
          query.eq("tenant_id", user.id));
        if (legacyErr) throw legacyErr;

        // New SwiftRent leases (27/28-section system)
        const { data: newLeases, error: newErr } = await supabase
          .from('leases')
          .select('id, property_id, status, created_at, properties:property_id(title, location)')
          .order('created_at', { ascending: false })
          .match(role === 'landlord' ? { landlord_user_id: user.id } : { tenant_user_id: user.id });
        if (newErr) throw newErr;

        // Normalize new leases to SignedLease shape for UI
        const normalizedNew: SignedLease[] = (newLeases as any[] || []).map((row) => ({
          id: row.id,
          property_id: row.property_id,
          landlord_id: '',
          tenant_id: '',
          monthly_rent: 0,
          security_deposit: null,
          start_date: row.created_at,
          end_date: null,
          lease_document_path: null,
          lease_document_url: null,
          lease_status: (row.status || '').toLowerCase(),
          created_at: row.created_at,
          properties: row.properties ? { title: row.properties.title, location: row.properties.location } : null,
          tenant_profile: null,
          landlord_profile: null,
        }));

        // Merge: show new leases first, then legacy
        const merged: SignedLease[] = [...normalizedNew, ...((legacyData as any[]) || [])];
        setLeases(merged);
      } catch (e: any) {
        toast({ variant: "destructive", title: "Failed to load signed leases", description: e.message });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [role, user, toast]);

  const downloadLease = async (lease: SignedLease) => {
    const title = lease.properties?.title || 'Lease_Agreement';
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
        await downloadFileFromUrl(swiftRentLease.pdf_url, fileName);
        toast({ title: 'SwiftRent lease downloaded successfully!' });
        return;
      }

      // Fallback to old leases table (legacy system)
      const { data: latestLease } = await supabase
        .from('leases')
        .select('id, pdf_draft_url, pdf_signed_url, created_at')
        .eq('property_id', lease.property_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const preferredUrl = latestLease?.pdf_signed_url || latestLease?.pdf_draft_url;
      if (preferredUrl) {
        await downloadFileFromUrl(preferredUrl, fileName);
        toast({ title: 'Lease downloaded successfully!' });
        return;
      }

      // Final fallback to legacy tenancy document if no new PDF exists
      const ref = lease.lease_document_path || lease.lease_document_url || '';
      if (!ref) {
        toast({ variant: 'destructive', title: 'No document to download' });
        return;
      }
      if (ref.startsWith('http')) {
        await downloadFileFromUrl(ref, fileName);
        toast({ title: 'Legacy lease downloaded successfully!' });
        return;
      }
      const { data, error } = await supabase.storage.from('lease-documents').download(ref);
      if (error) throw error;
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: 'Lease downloaded successfully!' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Download failed', description: e.message });
    }
  };

  const pending = leases.filter(l => l.lease_status !== 'completed');
  const signed = leases.filter(l => l.lease_status === 'completed');

  return (
    <section aria-labelledby="signed-leases-heading">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 id="signed-leases-heading" className="text-xl font-semibold">Contract</h2>
          <p className="text-sm text-muted-foreground">Review, sign, and download your contract documents</p>
        </div>
        <Badge variant="secondary">{leases.length}</Badge>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">Loading leases…</CardContent>
        </Card>
      ) : leases.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No contracts yet</CardTitle>
            <CardDescription>When a lease contract is sent to you for signing, it will appear here</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-8">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Pending</h3>
              <Badge variant="secondary">{pending.length}</Badge>
            </div>
            {pending.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-sm text-muted-foreground">No pending contracts</CardContent>
                </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pending.map((lease) => (
                  <Card key={lease.id} className="hover:shadow-sm transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        {lease.properties?.title || "Property"}
                      </CardTitle>
                      <CardDescription>{lease.properties?.location}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm mb-3">
                        <div>
                          <div>Landlord: {lease.landlord_profile?.display_name || 'Landlord'}</div>
                          {lease.start_date && <div>Start: {new Date(lease.start_date).toLocaleDateString()}</div>}
                        </div>
                        <Badge>{lease.lease_status?.replace(/_/g, ' ')}</Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" onClick={() => downloadLease(lease)}>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                        <Button className="flex-1" onClick={async () => {
                          try {
                            const { data: latestLease } = await supabase
                              .from('leases')
                              .select('id, created_at')
                              .eq('property_id', lease.property_id)
                              .order('created_at', { ascending: false })
                              .limit(1)
                              .maybeSingle();
                            let idToUse = latestLease?.id;
                            // If no lease exists yet and user is landlord, generate one on-demand
                            if (!idToUse && role === 'landlord' && (lease as any).tenant_id && lease.property_id) {
                              try {
                                const { data: genLeaseResp, error: genErr }: any = await supabase.functions.invoke('lease-management', {
                                  body: {
                                    action: 'generate',
                                    property_id: lease.property_id,
                                    tenant_user_id: (lease as any).tenant_id,
                                  }
                                });
                                if (!genErr && genLeaseResp?.lease?.id) {
                                  idToUse = genLeaseResp.lease.id;
                                }
                              } catch (e) {}
                            }
                            if (!idToUse) {
                              // Tenant cannot generate; show message
                              if (role === 'tenant') {
                                toast({ title: 'Lease not available yet', description: 'Waiting for landlord to generate the contract.' });
                                return;
                              }
                              toast({ title: 'Could not create lease', description: 'Please try again.' });
                              return;
                            }
                            const base = '/swiftrent-lease';
                            window.location.href = `${base}/${idToUse}`;
                          } catch {
                            const base = '/swiftrent-lease';
                            window.location.href = `${base}/${lease.id}`;
                          }
                        }}>
                          Review & Sign
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Signed</h3>
              <Badge variant="secondary">{signed.length}</Badge>
            </div>
            {signed.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-sm text-muted-foreground">No signed contracts yet</CardContent>
                </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {signed.map((lease) => (
                  <Card key={lease.id} className="hover:shadow-sm transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        {lease.properties?.title || "Property"}
                      </CardTitle>
                      <CardDescription>{lease.properties?.location}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm mb-3">
                        <div>
                          <div>Landlord: {lease.landlord_profile?.display_name || 'Landlord'}</div>
                          {lease.start_date && <div>Start: {new Date(lease.start_date).toLocaleDateString()}</div>}
                        </div>
                        <Badge>signed</Badge>
                      </div>
                      <Button className="w-full" onClick={() => downloadLease(lease)}>
                        <Download className="h-4 w-4 mr-2" />
                        Download PDF
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
