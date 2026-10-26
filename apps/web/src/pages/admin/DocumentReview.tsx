// @ts-nocheck
// The generated Supabase types (packages/supabase/src/types.ts) have not yet
// been regenerated to include the ownership-verification columns added on
// this branch (title_deed_path, ownership_status, etc.), so PostgREST query
// builder calls below report false type errors. Same workaround used in
// ListProperty.tsx and KycManagement.tsx for the same reason.
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import { Button } from '@mzanzihomes/ui/components/button';
import { Badge } from '@mzanzihomes/ui/components/badge';
import { Textarea } from '@mzanzihomes/ui/components/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@mzanzihomes/ui/components/dialog';
import { Label } from '@mzanzihomes/ui/components/label';
import { Eye, CheckCircle, XCircle, Clock, FileText } from 'lucide-react';
import { Skeleton } from '@mzanzihomes/ui/components/skeleton';
import { supabase } from '@mzanzihomes/supabase/client';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';

interface PendingDeed {
  id: string;
  title: string;
  location: string;
  landlord_id: string;
  title_deed_path: string;
  landlord_name: string | null;
}

export default function DocumentReview() {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<PendingDeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [declineReason, setDeclineReason] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      // properties.landlord_id references auth.users (not profiles) directly,
      // so there's no FK PostgREST can embed through. Fetch properties first,
      // then look up display names from profiles separately (same pattern as
      // KycManagement.tsx's fetchKycProfiles).
      const { data, error } = await supabase
        .from('properties')
        .select('id, title, location, landlord_id, title_deed_path')
        .eq('ownership_status', 'submitted')
        .order('updated_at', { ascending: true });

      if (error) throw error;

      const rows = data ?? [];
      let profilesMap = new Map<string, { display_name: string | null }>();
      if (rows.length > 0) {
        const landlordIds = Array.from(new Set(rows.map((r) => r.landlord_id)));
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, display_name')
          .in('user_id', landlordIds);

        if (profilesError) {
          console.warn('Error fetching landlord profiles:', profilesError);
        } else {
          profilesMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));
        }
      }

      const pending: PendingDeed[] = rows.map((r) => ({
        id: r.id,
        title: r.title,
        location: r.location,
        landlord_id: r.landlord_id,
        title_deed_path: r.title_deed_path,
        landlord_name: profilesMap.get(r.landlord_id)?.display_name ?? null,
      }));

      setDocuments(pending);

      const urls: Record<string, string> = {};
      for (const row of pending) {
        if (!row.title_deed_path) continue;
        const { data: signed } = await supabase.storage
          .from('title-deeds')
          .createSignedUrl(row.title_deed_path, 60 * 10);
        if (signed?.signedUrl) urls[row.id] = signed.signedUrl;
      }
      setSignedUrls(urls);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Could not load pending title deeds',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const approve = async (propertyId: string) => {
    setBusyId(propertyId);
    try {
      const { data, error } = await supabase.functions.invoke('admin-approve-property-ownership', {
        body: { property_id: propertyId },
      });

      if (error) throw new Error(error.message || 'Approval failed');
      if (data?.error) throw new Error(data.error);

      toast({ title: 'Ownership verified' });
      await load();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Could not approve', description: err.message });
    } finally {
      setBusyId(null);
    }
  };

  const decline = async (propertyId: string) => {
    if (!declineReason.trim()) {
      toast({ variant: 'destructive', title: 'A reason is required' });
      return;
    }
    setBusyId(propertyId);
    try {
      const { data, error } = await supabase.functions.invoke('admin-decline-property-ownership', {
        body: { property_id: propertyId, reason: declineReason.trim() },
      });

      if (error) throw new Error(error.message || 'Decline failed');
      if (data?.error) throw new Error(data.error);

      toast({ title: 'Ownership declined' });
      setDeclineReason('');
      await load();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Could not decline', description: err.message });
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Document Review</h1>
          <p className="text-muted-foreground">Review title deeds submitted for ownership verification</p>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Document Review</h1>
        <p className="text-muted-foreground">Review title deeds submitted for ownership verification</p>
      </div>

      {documents.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2" />
            Nothing pending review.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {documents.map((doc) => (
            <Card key={doc.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{doc.title}</CardTitle>
                    <CardDescription>
                      {doc.location} — {doc.landlord_name || 'Unknown landlord'}
                    </CardDescription>
                  </div>
                  <Badge variant="outline">
                    <Clock className="h-3 w-3 mr-1" /> Pending
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-3">
                {signedUrls[doc.id] ? (
                  <a href={signedUrls[doc.id]} target="_blank" rel="noreferrer">
                    <Button type="button" variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" /> View title deed
                    </Button>
                  </a>
                ) : (
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Loading document…
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button type="button" variant="destructive" size="sm" disabled={busyId === doc.id}>
                        <XCircle className="h-4 w-4 mr-2" /> Decline
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Decline title deed</DialogTitle>
                        <DialogDescription>Tell the landlord what to fix before re-uploading.</DialogDescription>
                      </DialogHeader>
                      <Label htmlFor="decline-reason">Reason</Label>
                      <Textarea
                        id="decline-reason"
                        value={declineReason}
                        onChange={(e) => setDeclineReason(e.target.value)}
                      />
                      <DialogFooter>
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={() => decline(doc.id)}
                          disabled={busyId === doc.id}
                        >
                          Confirm decline
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Button type="button" size="sm" onClick={() => approve(doc.id)} disabled={busyId === doc.id}>
                    <CheckCircle className="h-4 w-4 mr-2" /> Approve
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
