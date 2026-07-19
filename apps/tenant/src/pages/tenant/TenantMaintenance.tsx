// @ts-nocheck
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMaintenanceRequests, useCreateMaintenanceRequest } from '@mzanzihomes/features/maintenance';
import { useTenantResponses } from '@mzanzihomes/features/maintenance';
import {
  Plus, Wrench, Camera, ChevronRight, Droplets, Lightbulb, Plug, Bug,
  Phone, SquarePen, Clock, CheckCircle2,
} from 'lucide-react';
import { Button } from '@mzanzihomes/ui/components/button';
import { Textarea } from '@mzanzihomes/ui/components/textarea';
import { Input } from '@mzanzihomes/ui/components/input';
import { Label } from '@mzanzihomes/ui/components/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@mzanzihomes/ui/components/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@mzanzihomes/ui/components/dialog';
import { useTenantDashboard } from '@/hooks/useTenantDashboard';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@mzanzihomes/supabase/client';
import type { Priority, Category } from '@mzanzihomes/common/types/maintenance';

const GREEN = '#16a34a';

// Green identity, with amber for "pending" so it still reads as "waiting".
const STATUS_META: Record<string, { label: string; text: string; pill: string }> = {
  submitted:   { label: 'Pending',      text: 'text-amber-600',  pill: 'bg-amber-50 text-amber-700' },
  in_progress: { label: 'In progress',  text: 'text-green-600',  pill: 'bg-green-50 text-green-700' },
  completed:   { label: 'Completed',    text: 'text-green-700',  pill: 'bg-green-100 text-green-700' },
  cancelled:   { label: 'Cancelled',    text: 'text-red-500',    pill: 'bg-red-50 text-red-600' },
};
const statusMeta = (s: string) => STATUS_META[s] || { label: s, text: 'text-slate-500', pill: 'bg-slate-100 text-slate-600' };

const CATEGORY_META: Record<string, { icon: any; bg: string; fg: string }> = {
  plumbing:     { icon: Droplets,  bg: 'bg-green-50',  fg: 'text-green-600' },
  electrical:   { icon: Lightbulb, bg: 'bg-amber-50',  fg: 'text-amber-500' },
  appliance:    { icon: Plug,      bg: 'bg-sky-50',    fg: 'text-sky-600' },
  pest_control: { icon: Bug,       bg: 'bg-orange-50', fg: 'text-orange-500' },
  general:      { icon: Wrench,    bg: 'bg-green-50',  fg: 'text-green-600' },
  other:        { icon: Wrench,    bg: 'bg-slate-100', fg: 'text-slate-500' },
};
const catMeta = (c: string) => CATEGORY_META[c] || CATEGORY_META.other;
const capitalize = (v: string) => v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, ' ');

const HOW_IT_WORKS = [
  { icon: SquarePen,   n: 1, title: 'Submit request', body: 'Tell us what needs fixing' },
  { icon: Clock,       n: 2, title: 'We respond',     body: "We'll review and confirm ASAP" },
  { icon: Wrench,      n: 3, title: 'Issue resolved', body: 'Our team gets it done' },
  { icon: CheckCircle2,n: 4, title: "You're updated", body: "We'll let you know it's fixed" },
];

/** Toolbox illustration for the hero. */
function ToolboxArt() {
  return (
    <svg viewBox="0 0 180 150" className="h-full w-auto" aria-hidden="true">
      <path d="M8 118 L38 96 L68 118 Z M150 120 q10 -22 24 0" fill="#cdeacd" opacity="0.6" />
      <circle cx="150" cy="46" r="2.5" fill="#a7d7a7" /><circle cx="60" cy="40" r="2" fill="#a7d7a7" />
      {/* wrenches */}
      <g fill="#4aa14a">
        <path d="M58 108 v-46 a10 10 0 0 1 -6 -18 a10 10 0 0 1 12 0 l-4 6 4 4 6 -4 a10 10 0 0 1 -2 12 a10 10 0 0 1 -10 0 z" />
        <path d="M126 108 v-40 a9 9 0 0 0 5 -16 a9 9 0 0 0 -11 0 l4 5 -3 4 -5 -3 a9 9 0 0 0 1 11 a9 9 0 0 0 9 1 z" />
      </g>
      {/* pipe/spanner in the middle */}
      <rect x="86" y="34" width="10" height="76" rx="5" fill="#e2e8f0" />
      <path d="M86 34 h10 v-8 a8 8 0 0 0 -16 0" fill="none" stroke="#cbd5e1" strokeWidth="6" strokeLinecap="round" />
      {/* toolbox body */}
      <rect x="44" y="104" width="96" height="40" rx="9" fill="#3f9b3f" />
      <rect x="44" y="104" width="96" height="12" rx="6" fill="#57b357" />
      <rect x="78" y="120" width="28" height="20" rx="5" fill="#ffffff" opacity="0.92" />
      <path d="M84 130 l8 -7 8 7 v8 h-16 z" fill="#3f9b3f" />
    </svg>
  );
}

export default function TenantMaintenance() {
  const { user } = useAuth();
  const { tenantProperty } = useTenantDashboard();
  const navigate = useNavigate();
  const { data: responses } = useTenantResponses();
  const { data: maintenanceRequests, isLoading } = useMaintenanceRequests();
  const createMaintenance = useCreateMaintenanceRequest();
  const { toast } = useToast();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [landlordPhone, setLandlordPhone] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [category, setCategory] = useState<Category>('other');
  const [photos, setPhotos] = useState<FileList | null>(null);

  // Landlord phone powers the emergency "Call now" (falls back to chat).
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: t } = await supabase.from('tenancies').select('landlord_id').eq('tenant_id', user.id).eq('status', 'active').maybeSingle();
      const lid = t?.landlord_id;
      if (!lid) return;
      const { data: p } = await supabase.from('profiles').select('phone').eq('user_id', lid).maybeSingle();
      if (p?.phone) setLandlordPhone(p.phone);
    })();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: 'Error', description: 'Please log in to submit a maintenance request.', variant: 'destructive' });
      return;
    }
    if (!title.trim() || !description.trim()) {
      toast({ title: 'Validation Error', description: 'Please fill in both title and description.', variant: 'destructive' });
      return;
    }
    try {
      let propertyId = tenantProperty?.id;
      if (!propertyId) {
        const { data: tenancyData } = await supabase.from('tenancies').select('property_id').eq('tenant_id', user.id).eq('status', 'active').maybeSingle();
        if (tenancyData) {
          propertyId = tenancyData.property_id;
        } else {
          const { data: leaseData } = await supabase
            .from('lease_contracts')
            .select('property_id')
            .eq('tenant_id', user.id)
            .in('status', ['signed', 'pending_tenant'])
            .not('property_id', 'is', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (leaseData?.property_id) {
            propertyId = leaseData.property_id;
          } else {
            toast({ title: 'No Property Assigned', description: "You don't have an active lease. Please contact your landlord.", variant: 'destructive' });
            return;
          }
        }
      }

      const imageUrls: string[] = [];
      if (photos && photos.length > 0) {
        for (let i = 0; i < photos.length; i++) {
          const file = photos[i];
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}/${Date.now()}_${i}.${fileExt}`;
          const { error: uploadError } = await supabase.storage.from('maintenance-images').upload(fileName, file);
          if (uploadError) {
            console.error('Error uploading image:', uploadError);
          } else {
            const { data: { publicUrl } } = supabase.storage.from('maintenance-images').getPublicUrl(fileName);
            imageUrls.push(publicUrl);
          }
        }
      }

      await createMaintenance.mutateAsync({
        property_id: propertyId,
        title: title.trim(),
        description: description.trim(),
        priority,
        category,
        images: imageUrls,
      });

      setTitle(''); setDescription(''); setPriority('medium'); setCategory('other'); setPhotos(null);
      setIsCreateDialogOpen(false);
      toast({ title: 'Request submitted', description: 'Your landlord has been notified.' });
    } catch (error: any) {
      console.error('Error creating maintenance request:', error);
      toast({ title: 'Submission Failed', description: error.message || 'Failed to submit. Please try again.', variant: 'destructive' });
    }
  };

  const callEmergency = () => {
    if (landlordPhone) window.location.href = `tel:${landlordPhone}`;
    else navigate('/messages');
  };

  const requests = maintenanceRequests || [];
  const visible = showAll ? requests : requests.slice(0, 3);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <div className="h-40 animate-pulse rounded-3xl bg-white/70" />
        <div className="h-56 animate-pulse rounded-3xl bg-white/70" />
      </div>
    );
  }

  return (
    <div className="relative mx-auto w-full max-w-2xl pb-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl p-5" style={{ background: '#eaf6ea' }}>
        <div className="pointer-events-none absolute right-1 bottom-1 h-[120px]"><ToolboxArt /></div>
        <div className="relative z-10 max-w-[60%]">
          <h2 className="text-[22px] font-extrabold leading-tight text-slate-900">Need something fixed?</h2>
          <p className="mt-1 text-[13.5px] leading-snug text-slate-500">Let us know and we&apos;ll get it sorted.</p>
          <button
            onClick={() => setIsCreateDialogOpen(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-[14px] font-bold text-white shadow-[0_12px_24px_-10px_rgba(22,163,74,0.7)] active:scale-[0.98]"
            style={{ background: GREEN }}
          >
            <Plus className="h-5 w-5" /> New request
          </button>
        </div>
      </div>

      {/* Landlord responses banner */}
      {responses && responses.length > 0 && (
        <button
          onClick={() => navigate('/tenant/maintenance/responses')}
          className="mt-4 flex w-full items-center gap-2 rounded-2xl border border-green-200 bg-green-50 px-4 py-2.5 text-left text-sm text-green-800 active:scale-[0.99]"
        >
          <Wrench className="h-4 w-4 shrink-0 text-green-600" />
          <span className="flex-1">{responses.length} response{responses.length === 1 ? '' : 's'} from your landlord</span>
          <span className="font-semibold text-green-700">View</span>
        </button>
      )}

      {/* My requests */}
      <div className="mt-6 flex items-center justify-between">
        <h3 className="text-[18px] font-extrabold tracking-tight text-slate-900">My requests</h3>
        {requests.length > 3 && (
          <button onClick={() => setShowAll((s) => !s)} className="text-[13px] font-bold text-green-600">
            {showAll ? 'Show less' : 'View all'}
          </button>
        )}
      </div>

      {requests.length === 0 ? (
        <div className="mt-3 rounded-3xl bg-white p-8 text-center shadow-[0_14px_32px_-22px_rgba(20,50,90,0.4)]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
            <Wrench className="h-8 w-8 text-green-500" />
          </div>
          <p className="mt-4 text-[16px] font-bold text-slate-900">No maintenance requests yet</p>
          <p className="mx-auto mt-1 max-w-xs text-[13px] leading-relaxed text-slate-500">
            Something needs fixing? Report it and your landlord is notified straight away.
          </p>
          <button
            onClick={() => setIsCreateDialogOpen(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-[14px] font-bold text-white active:scale-95"
            style={{ background: GREEN }}
          >
            <Plus className="h-4 w-4" /> Report an issue
          </button>
        </div>
      ) : (
        <div className="mt-3 overflow-hidden rounded-3xl bg-white shadow-[0_14px_32px_-22px_rgba(20,50,90,0.4)]">
          {visible.map((r, i) => {
            const cm = catMeta(r.category);
            const sm = statusMeta(r.status);
            return (
              <button
                key={r.id}
                onClick={() => navigate(`/maintenance/${r.id}`)}
                className={`flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-slate-50 ${i > 0 ? 'border-t border-slate-100' : ''}`}
              >
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${cm.bg}`}>
                  <cm.icon className={`h-[20px] w-[20px] ${cm.fg}`} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14.5px] font-bold text-slate-900">{r.title}</p>
                  <p className="truncate text-[12.5px] text-slate-500">{capitalize(r.category)}</p>
                  <p className={`mt-0.5 text-[12.5px] font-semibold ${sm.text}`}>{sm.label}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-bold ${sm.pill}`}>{sm.label}</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
              </button>
            );
          })}
        </div>
      )}

      {/* How it works */}
      <div className="mt-6 rounded-3xl p-5" style={{ background: '#eef7ee' }}>
        <h3 className="text-[16px] font-extrabold text-slate-900">How it works</h3>
        <div className="mt-4 flex items-start justify-between gap-1">
          {HOW_IT_WORKS.map((s, i) => (
            <div key={s.n} className="relative flex flex-1 flex-col items-center text-center">
              {i < HOW_IT_WORKS.length - 1 && (
                <span className="absolute left-[60%] top-6 hidden h-px w-[80%] border-t border-dashed border-green-300 sm:block" />
              )}
              <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
                <s.icon className="h-5 w-5 text-green-600" />
                <span className="absolute -bottom-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: GREEN }}>{s.n}</span>
              </span>
              <p className="mt-3 text-[12px] font-bold leading-tight text-slate-900">{s.title}</p>
              <p className="mt-1 text-[10.5px] leading-tight text-slate-500">{s.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Emergency */}
      <div className="mt-5 flex items-center gap-3 rounded-3xl bg-white p-4 shadow-[0_14px_32px_-22px_rgba(20,50,90,0.4)]">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-green-50">
          <Phone className="h-5 w-5 text-green-600" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] font-extrabold text-slate-900">Emergency maintenance</p>
          <p className="text-[12px] leading-snug text-slate-500">For urgent issues outside office hours</p>
        </div>
        <button
          onClick={callEmergency}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-green-300 px-4 py-2.5 text-[13px] font-bold text-green-700 active:scale-95"
        >
          <Phone className="h-4 w-4" /> Call now
        </button>
      </div>

      {/* Floating add */}
      <button
        onClick={() => setIsCreateDialogOpen(true)}
        aria-label="New maintenance request"
        className="fixed bottom-6 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-[0_14px_30px_-10px_rgba(22,163,74,0.8)] active:scale-95"
        style={{ background: GREEN }}
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Create request dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Report an issue</DialogTitle>
            <DialogDescription>Describe the problem and we&apos;ll get it sorted as soon as possible.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Issue title *</Label>
              <Input id="title" placeholder="e.g., Leaking tap in kitchen" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea id="description" placeholder="Please provide detailed information about the issue…" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={(v: Category) => setCategory(v)}>
                  <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="plumbing">Plumbing</SelectItem>
                    <SelectItem value="electrical">Electrical</SelectItem>
                    <SelectItem value="appliance">Appliance</SelectItem>
                    <SelectItem value="pest_control">Pest Control</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={priority} onValueChange={(v: Priority) => setPriority(v)}>
                  <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="photos">Photos (optional)</Label>
              <Input id="photos" type="file" multiple accept="image/*" capture="environment" onChange={(e) => setPhotos(e.target.files)} />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Camera className="h-4 w-4" />
                <span>Add photos to help your landlord see the issue</span>
              </div>
              {photos && photos.length > 0 && (
                <p className="text-xs text-muted-foreground">{photos.length} photo{photos.length === 1 ? '' : 's'} selected</p>
              )}
            </div>
            <Button type="submit" className="w-full text-white" style={{ background: GREEN }} disabled={createMaintenance.isPending}>
              {createMaintenance.isPending ? 'Submitting…' : 'Submit request'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
