// @ts-nocheck
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMaintenanceRequests, useCreateMaintenanceRequest } from '@mzanzihomes/features/maintenance';
import { useTenantResponses } from '@mzanzihomes/features/maintenance';
import {
  Plus, Wrench, Camera, ChevronRight, Droplets, Lightbulb, Plug, Bug,
  Clock, Send, Home, ClipboardCheck,
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
import MaintenanceToolbox from '@/components/MaintenanceToolbox';
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

const MAINTENANCE_TIPS = [
  { icon: Clock, title: 'Report issues promptly', desc: 'Report problems as soon as you notice them to prevent further damage.' },
  { icon: Send, title: 'Use the correct request channel', desc: 'Submit all maintenance requests through the platform or agreed contact method.' },
  { icon: Home, title: 'Take care of the property', desc: 'Treat the home with care and allow reasonable access for repairs when needed.' },
  { icon: ClipboardCheck, title: 'Know your responsibilities', desc: 'Understand your repair responsibilities, response times, and emergency procedures as outlined in your tenancy agreement.' },
];

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

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [category, setCategory] = useState<Category>('other');
  const [photos, setPhotos] = useState<FileList | null>(null);

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

  const requests = maintenanceRequests || [];
  const visible = showAll ? requests : requests.slice(0, 3);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <div className="h-44 animate-pulse rounded-3xl bg-white/70" />
        <div className="h-56 animate-pulse rounded-3xl bg-white/70" />
      </div>
    );
  }

  return (
    <div className="relative mx-auto w-full max-w-2xl pb-8 [animation:fadeUp_0.5s_ease-out]">
      {/* Hero */}
      <div
        className="relative overflow-hidden rounded-[28px] p-5 shadow-[0_20px_44px_-28px_rgba(22,101,52,0.55)]"
        style={{ background: 'linear-gradient(135deg, #e3f6e9 0%, #d1eed8 100%)' }}
      >
        <MaintenanceToolbox className="pointer-events-none absolute right-3 bottom-3 h-[184px] w-auto animate-soft-float" />
        <div className="relative z-10 max-w-[58%]">
          <h2 className="text-[23px] font-extrabold leading-tight text-slate-900">Need something fixed?</h2>
          <p className="mt-1.5 text-[13.5px] leading-snug text-slate-600">Let us know and we&apos;ll get it sorted.</p>
          <button
            onClick={() => setIsCreateDialogOpen(true)}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-[14px] font-bold text-white shadow-[0_14px_26px_-10px_rgba(22,163,74,0.75)] transition-transform active:scale-[0.97]"
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
      <div className="mt-7 flex items-center justify-between">
        <h3 className="text-[18px] font-extrabold tracking-tight text-slate-900">My requests</h3>
        {requests.length > 3 && (
          <button onClick={() => setShowAll((s) => !s)} className="text-[13px] font-bold text-green-600 active:opacity-70">
            {showAll ? 'Show less' : 'View all'}
          </button>
        )}
      </div>

      {requests.length === 0 ? (
        <div className="mt-3 rounded-[28px] bg-white p-8 text-center shadow-[0_18px_38px_-26px_rgba(20,50,90,0.4)]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
            <Wrench className="h-8 w-8 text-green-500" />
          </div>
          <p className="mt-4 text-[16px] font-bold text-slate-900">No requests so far</p>
          <p className="mx-auto mt-1.5 max-w-xs text-[13px] leading-relaxed text-slate-500">
            When you report a maintenance issue, it will appear here so you can track its progress from start to finish.
          </p>
        </div>
      ) : (
        <div className="mt-3 overflow-hidden rounded-[28px] bg-white shadow-[0_18px_38px_-26px_rgba(20,50,90,0.4)]">
          {visible.map((r, i) => {
            const cm = catMeta(r.category);
            const sm = statusMeta(r.status);
            return (
              <button
                key={r.id}
                onClick={() => navigate(`/maintenance/${r.id}`)}
                className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-slate-50 ${i > 0 ? 'border-t border-slate-100' : ''}`}
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

      {/* Maintenance tips */}
      <div className="mt-5 rounded-[28px] bg-white p-5 shadow-[0_18px_38px_-26px_rgba(20,50,90,0.4)]">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-green-600" />
          <h3 className="text-[16px] font-extrabold text-slate-900">Maintenance tips</h3>
        </div>
        <div className="mt-4 space-y-3.5">
          {MAINTENANCE_TIPS.map((t, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-green-50">
                <t.icon className="h-[18px] w-[18px] text-green-600" />
              </span>
              <div className="min-w-0">
                <p className="text-[13.5px] font-bold text-slate-900">{t.title}</p>
                <p className="mt-0.5 text-[12.5px] leading-snug text-slate-500">{t.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create request dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Report an issue</DialogTitle>
            <DialogDescription>Describe the problem and your landlord will get it sorted as soon as possible.</DialogDescription>
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
