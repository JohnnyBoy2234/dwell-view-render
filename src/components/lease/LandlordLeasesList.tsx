import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileText, ShieldCheck, Clock, FileSignature } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LeaseCreationWizard } from "@/components/lease/LeaseCreationWizard";
import { currentSigningProviderName } from "@/lib/signing";

interface LeaseRow {
  id: string;
  property_id: string;
  landlord_id: string;
  tenant_id: string;
  monthly_rent: number | null;
  security_deposit: number | null;
  start_date: string | null;
  end_date: string | null;
  lease_status: string | null;
  lease_document_path: string | null;
  lease_document_url?: string | null;
  created_at: string;
  properties?: { title?: string | null; location?: string | null } | null;
  tenant_profile?: { display_name?: string | null } | null;
}

export function LandlordLeasesList() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [leases, setLeases] = useState<LeaseRow[]>([]);
  const [search, setSearch] = useState("");
  const [propertyFilter, setPropertyFilter] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardLease, setWizardLease] = useState<LeaseRow | null>(null);
  const [selectedDraftId, setSelectedDraftId] = useState<string>("");
  const [newLeases, setNewLeases] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("tenancies")
          .select(
            `*,
             properties(title, location),
             tenant_profile:profiles!tenant_id(display_name)`
          )
          .eq("landlord_id", user.id)
          .order("created_at", { ascending: false });
        if (error) throw error;
        setLeases((data as any) || []);

        // Load new SwiftRent leases (27/28-section)
        const { data: latest, error: latestErr } = await supabase
          .from('leases')
          .select('id, property_id, landlord_user_id, tenant_user_id, status, created_at, properties:property_id(title, location)')
          .eq('landlord_user_id', user.id)
          .order('created_at', { ascending: false });
        if (latestErr) throw latestErr;
        setNewLeases(latest || []);
      } catch (e: any) {
        toast({ variant: "destructive", title: "Failed to load leases", description: e.message });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, toast]);

  const filtered = useMemo(() => {
    // Normalize new leases to LeaseRow-like shape
    const normalizedNew: LeaseRow[] = (newLeases || []).map((row: any) => ({
      id: row.id,
      property_id: row.property_id,
      landlord_id: row.landlord_user_id,
      tenant_id: row.tenant_user_id,
      monthly_rent: null,
      security_deposit: null,
      start_date: row.created_at,
      end_date: null,
      lease_status: (row.status || '').toLowerCase(),
      lease_document_path: null,
      lease_document_url: null,
      created_at: row.created_at,
      properties: row.properties || null,
      tenant_profile: null,
    }));

    const merged: LeaseRow[] = [...normalizedNew, ...leases];
    const byProperty = propertyFilter
      ? merged.filter((l) => l.property_id === propertyFilter)
      : merged;
    const query = search.trim().toLowerCase();
    if (!query) return byProperty;
    return byProperty.filter((l) => {
      const title = (l.properties?.title || "").toLowerCase();
      const loc = (l.properties?.location || "").toLowerCase();
      const tenantName = (l.tenant_profile?.display_name || "").toLowerCase();
      return (
        title.includes(query) || loc.includes(query) || tenantName.includes(query)
      );
    });
  }, [leases, newLeases, propertyFilter, search]);

  const signed = useMemo(
    () => filtered.filter((l) => (l.lease_status || '').toLowerCase() === 'completed'),
    [filtered]
  );
  const drafts = useMemo(
    () => filtered.filter((l) => (l.lease_status || '').toLowerCase() !== 'completed'),
    [filtered]
  );
  const draftTenancies = useMemo(
    () => leases.filter((l) => l.lease_status === 'draft'),
    [leases]
  );

  const statusBadge = (status: string | null | undefined) => {
    switch (status) {
      case "completed":
        return <Badge><ShieldCheck className="h-3 w-3 mr-1" />Signed</Badge>;
      case "generated":
      case "awaiting_tenant_signature":
      case "sent":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="outline">{status || "Draft"}</Badge>;
    }
  };

  const computeFileName = (lease: LeaseRow) => {
    const address = lease.properties?.location || lease.properties?.title || "Lease";
    const dateStr = new Date().toISOString().slice(0, 10);
    const suffix = lease.lease_status === "completed" ? "Signed" : "Draft";
    const safeAddress = String(address).replace(/[^a-z0-9]/gi, "_");
    return `SwiftRent_Lease_${safeAddress}_${dateStr}_${suffix}.pdf`;
  };

  const triggerDownload = (url: string, fileName: string) => {
    const a = document.createElement('a');
    // For data URLs, do not append query parameters
    if (url.startsWith('data:')) {
      a.href = url;
    } else {
      const joiner = url.includes('?') ? '&' : '?';
      a.href = `${url}${joiner}download=${encodeURIComponent(fileName)}&ts=${Date.now()}`;
    }
    a.download = fileName;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const download = async (lease: LeaseRow) => {
    const fileName = computeFileName(lease);
    try {
      // 1) Prefer SwiftRent lease_agreements (28-section system)
      const { data: swiftRentLease } = await supabase
        .from('lease_agreements')
        .select('pdf_url, created_at')
        .eq('property_id', lease.property_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (swiftRentLease?.pdf_url) {
        triggerDownload(swiftRentLease.pdf_url, fileName);
        return;
      }

      // 2) Try by this lease id first
      let preferredUrl: string | undefined;
      const { data: byId } = await supabase
        .from('leases')
        .select('id, pdf_draft_url, pdf_signed_url')
        .eq('id', lease.id)
        .maybeSingle();
      preferredUrl = byId?.pdf_signed_url || byId?.pdf_draft_url;

      // 3) Fallback to newest lease for this property
      if (!preferredUrl) {
        const { data: latestLease } = await supabase
          .from('leases')
          .select('id, pdf_draft_url, pdf_signed_url, created_at')
          .eq('property_id', lease.property_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        preferredUrl = latestLease?.pdf_signed_url || latestLease?.pdf_draft_url;
      }
      if (preferredUrl) {
        triggerDownload(preferredUrl, fileName);
        return;
      }
      // 4) On-demand generate from stored lease_data as a last resort
      const { data: fullLease } = await supabase
        .from('leases')
        .select('lease_data, version')
        .eq('id', lease.id)
        .maybeSingle();

      if (fullLease?.lease_data) {
        const { data: genResp, error: genErr }: any = await supabase.functions.invoke('generate-lease-pdf', {
          body: { lease_data: fullLease.lease_data, version: fullLease.version || 1 }
        });
        if (!genErr && genResp?.pdf_url) {
          const url = String(genResp.pdf_url);
          // Persist for next time
          await supabase.from('leases').update({ pdf_draft_url: url }).eq('id', lease.id);
          triggerDownload(url, fileName);
          return;
        }
      }

      toast({ variant: 'destructive', title: 'No generated lease PDF yet', description: 'Please try again shortly or regenerate the lease PDF.' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Download failed', description: e.message });
    }
  };

  const continueSigning = async (lease: LeaseRow) => {
    try {
      const { data: latestLease, error } = await supabase
        .from('leases')
        .select('id, created_at')
        .eq('property_id', lease.property_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!latestLease?.id) {
        toast({ title: 'No new lease found', description: 'Generate a lease first to proceed with signing.' });
        return;
      }
      window.location.href = `/swiftrent-lease/${latestLease.id}`;
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Failed to initiate signing', description: e.message });
    }
  };

  const openWizardFor = (lease: LeaseRow) => {
    setWizardLease(lease);
    setWizardOpen(true);
  };

  return (
    <section className="space-y-6" aria-labelledby="leases-heading">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-ocean-blue" />
          <h2 id="leases-heading" className="text-xl font-bold">Leases</h2>
          <Badge variant="secondary">{filtered.length}</Badge>
        </div>
        <div className="flex items-center gap-2 w-full max-w-xl">
          <Input
            placeholder="Search by property, location, or tenant"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select onValueChange={(val) => setPropertyFilter(val === 'ALL' ? null : val)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Filter by property" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All properties</SelectItem>
              {[...new Map(leases.map(l => [l.property_id, l])).values()].map((l) => (
                <SelectItem key={l.property_id} value={l.property_id}>
                  {l.properties?.title || l.properties?.location || l.property_id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select onValueChange={(val) => setSelectedDraftId(val)}>
            <SelectTrigger className="w-full sm:w-[320px]">
              <SelectValue placeholder="Select draft tenancy to generate" />
            </SelectTrigger>
            <SelectContent>
              {draftTenancies.length === 0 ? (
                <SelectItem value="NO_DRAFTS" disabled>No draft tenancies</SelectItem>
              ) : (
                draftTenancies.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {(l.properties?.title || l.properties?.location || 'Property')} — {l.tenant_profile?.display_name || 'Tenant'}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Button 
            onClick={() => {
              const lease = leases.find((x) => x.id === selectedDraftId);
              if (lease) {
                openWizardFor(lease);
              } else {
                toast({ title: 'Select a draft tenancy', description: 'Please choose a draft before generating.' });
              }
            }}
            disabled={!selectedDraftId}
          >
            <FileText className="h-4 w-4 mr-2" />
            Generate Lease
          </Button>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">Loading leases…</CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No leases yet</CardTitle>
            <CardDescription>Generated or signed leases will appear here</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-8">
          {signed.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">Signed</h3>
                <Badge variant="secondary">{signed.length}</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {signed.map((lease) => (
                  <Card key={lease.id} className="hover:shadow-sm transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-base">{lease.properties?.title || "Property"}</CardTitle>
                      <CardDescription>{lease.properties?.location}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm mb-3">
                        <div>
                          <div>Tenant: {lease.tenant_profile?.display_name || "Tenant"}</div>
                          {lease.monthly_rent != null && (
                            <div>Rent: R{Number(lease.monthly_rent).toLocaleString()}</div>
                          )}
                        </div>
                        {statusBadge(lease.lease_status)}
                      </div>
                      <Button className="w-full" onClick={() => download(lease)}>
                        <Download className="h-4 w-4 mr-2" />
                        Download PDF
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {drafts.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">Drafts & Pending</h3>
                <Badge variant="secondary">{drafts.length}</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {drafts.map((lease) => (
                  <Card key={lease.id} className="hover:shadow-sm transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-base">{lease.properties?.title || "Property"}</CardTitle>
                      <CardDescription>{lease.properties?.location}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm mb-3">
                        <div>
                          <div>Tenant: {lease.tenant_profile?.display_name || "Tenant"}</div>
                          {lease.monthly_rent != null && (
                            <div>Rent: R{Number(lease.monthly_rent).toLocaleString()}</div>
                          )}
                        </div>
                        {statusBadge(lease.lease_status)}
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        {lease.lease_status === 'draft' && (
                          <Button className="w-full" onClick={() => openWizardFor(lease)}>
                            <FileText className="h-4 w-4 mr-2" />
                            Generate Lease
                          </Button>
                        )}
                        <Button variant="outline" className="w-full" onClick={() => download(lease)}>
                          <Download className="h-4 w-4 mr-2" />
                          Download PDF
                        </Button>
                        {lease.lease_status !== 'completed' && (
                          <Button className="w-full" onClick={() => continueSigning(lease)}>
                            <FileSignature className="h-4 w-4 mr-2" />
                            Continue Signing
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {wizardOpen && wizardLease && (
        <LeaseCreationWizard
          isOpen={wizardOpen}
          onClose={() => setWizardOpen(false)}
          propertyId={wizardLease.property_id}
          onLeaseCreated={() => {
            setWizardOpen(false);
            // Reload list
            (async () => {
              if (!user) return;
              try {
                const { data } = await supabase
                  .from("tenancies")
                  .select(`*, properties(title, location), tenant_profile:profiles!tenant_id(display_name)`) 
                  .eq("landlord_id", user.id)
                  .order("created_at", { ascending: false });
                setLeases((data as any) || []);
              } catch {}
            })();
          }}
          selectedTenant={{ id: wizardLease.tenant_id, name: wizardLease.tenant_profile?.display_name || "Tenant" }}
        />
      )}
    </section>
  );
}


