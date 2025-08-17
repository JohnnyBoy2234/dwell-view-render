import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileText } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
        const query = supabase
          .from("tenancies")
          .select(
            `*,
            properties(title, location),
            tenant_profile:profiles!tenant_id(display_name),
            landlord_profile:profiles!landlord_id(display_name)`
          )
          .eq("lease_status", "completed")
          .order("created_at", { ascending: false });

        const { data, error } = await (role === "landlord"
          ? query.eq("landlord_id", user.id)
          : query.eq("tenant_id", user.id));
        if (error) throw error;
        setLeases((data as any) || []);
      } catch (e: any) {
        toast({ variant: "destructive", title: "Failed to load signed leases", description: e.message });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [role, user, toast]);

  const downloadLease = async (lease: SignedLease) => {
    const title = lease.properties?.title || "Lease_Agreement";
    const ref = lease.lease_document_path || lease.lease_document_url || "";
    if (!ref) {
      toast({ variant: "destructive", title: "No document to download" });
      return;
    }
    try {
      if (ref.startsWith("http")) {
        const a = document.createElement("a");
        a.href = ref;
        a.download = `${title.replace(/[^a-z0-9]/gi, "_")}.pdf`;
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }
      const { data, error } = await supabase.storage.from("lease-documents").download(ref);
      if (error) throw error;
      const blob = new Blob([data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/[^a-z0-9]/gi, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Download failed", description: e.message });
    }
  };

  return (
    <section aria-labelledby="signed-leases-heading">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 id="signed-leases-heading" className="text-xl font-semibold">Signed Leases</h2>
          <p className="text-sm text-muted-foreground">Download finalized lease agreements anytime</p>
        </div>
        <Badge variant="secondary">{leases.length}</Badge>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">Loading signed leases…</CardContent>
        </Card>
      ) : leases.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No signed leases yet</CardTitle>
            <CardDescription>Completed leases will appear here</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {leases.map((lease) => (
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
                    <div>Rent: R{(lease.monthly_rent || 0).toLocaleString()}</div>
                    <div>Start: {new Date(lease.start_date).toLocaleDateString()}</div>
                  </div>
                  <Badge>Active</Badge>
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
    </section>
  );
}
