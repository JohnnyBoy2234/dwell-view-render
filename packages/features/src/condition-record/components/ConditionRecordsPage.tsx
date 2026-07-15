import { useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Camera, ChevronRight, ImagePlus, FileText, ShieldCheck, Download } from 'lucide-react';
import { Button } from '@mzanzihomes/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import { Badge } from '@mzanzihomes/ui/components/badge';
import { Textarea } from '@mzanzihomes/ui/components/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@mzanzihomes/ui/components/tabs';
import { Dialog, DialogContent, DialogTitle } from '@mzanzihomes/ui/components/dialog';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';
import {
  conditionRecordState,
  approvalWindowEndsAt,
  groupPhotosByLocation,
  type ConditionEventType,
  type ConditionParty,
  type ConditionRecordState,
  type ConditionRecord,
} from '@mzanzihomes/common';
import { useConditionRecords, type ConditionRecordListItem } from '../hooks/useConditionRecords';
import {
  useConditionRecordDetail,
  type PendingUpload,
  type PhotoWithUrl,
} from '../hooks/useConditionRecordDetail';
import { missingRecordOffers } from '../recordOffers';

const EVENT_LABEL: Record<ConditionEventType, string> = {
  move_in: 'Move-in',
  move_out: 'Move-out',
};

const STATE_LABEL: Record<ConditionRecordState, string> = {
  open: 'Open — collecting photos',
  awaiting_receipts: 'Awaiting receipt signatures',
  awaiting_approval: 'Awaiting acceptance',
  locked: 'Saved',
};

// Colour accents matching the landlord Applications cards: a coloured left bar
// plus a soft badge, keyed by where the inspection is in its lifecycle.
const STATE_ACCENT: Record<ConditionRecordState, { bar: string; badge: string }> = {
  open: { bar: 'border-l-blue-500', badge: 'bg-blue-100 text-blue-700 border-blue-200' },
  awaiting_receipts: { bar: 'border-l-amber-500', badge: 'bg-amber-100 text-amber-700 border-amber-200' },
  awaiting_approval: { bar: 'border-l-amber-500', badge: 'bg-amber-100 text-amber-700 border-amber-200' },
  locked: { bar: 'border-l-emerald-500', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
};

const PARTY_LABEL: Record<ConditionParty, string> = {
  tenant: 'Tenant',
  landlord: 'Landlord',
};

// Layout padding comes from the dashboard shell; the pb keeps the last card
// clear of the mobile bottom navigation and floating chat button.
const PAGE_PADDING = 'pb-[calc(7rem+env(safe-area-inset-bottom))]';

function StatePill({ state }: { state: ConditionRecordState }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATE_ACCENT[state].badge}`}>
      {STATE_LABEL[state]}
    </span>
  );
}

export function ConditionRecordsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const list = useConditionRecords();

  // Navigate to the detail within whatever base path this app mounted the list
  // at (landlord dashboard vs tenant dashboard), so it opens in the same shell.
  const openRecord = (id: string) => navigate(`${location.pathname.replace(/\/$/, '')}/${id}`);

  if (list.loading) {
    return (
      <div className={`space-y-4 ${PAGE_PADDING}`}>
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${PAGE_PADDING}`}>
      {list.error && <p className="text-destructive">{list.error}</p>}
      {!list.error && list.records.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50">
              <Camera className="h-6 w-6 text-blue-500" aria-hidden="true" />
            </div>
            <p className="font-semibold">No inspections yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              An inspection is started at move-in and move-out so both parties can photograph the
              property's condition and sign off on it.
            </p>
          </CardContent>
        </Card>
      )}
      {list.records.map((item) => (
        <RecordCard key={item.record.id} item={item} onOpen={() => openRecord(item.record.id)} />
      ))}
      <StartRecordButtons list={list} />
    </div>
  );
}

// Route wrapper for apps that mount the detail as its own <Route> (tenant).
export function ConditionRecordDetailPage() {
  const { recordId } = useParams<{ recordId: string }>();
  return <ConditionRecordDetail recordId={recordId ?? null} />;
}

function RecordCard({ item, onOpen }: { item: ConditionRecordListItem; onOpen: () => void }) {
  const state = conditionRecordState(item.record);
  const savedAt =
    state === 'locked' && item.record.tenant_attested_at && item.record.landlord_attested_at
      ? [item.record.tenant_attested_at, item.record.landlord_attested_at].sort().slice(-1)[0]!
      : null;
  return (
    <Card
      className={`cursor-pointer border-l-4 shadow-sm transition-all hover:shadow-md ${STATE_ACCENT[state].bar}`}
      onClick={onOpen}
    >
      <CardContent className="flex items-start gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50">
          <Camera className="h-5 w-5 text-blue-500" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="break-words font-semibold">
            {item.propertyTitle} — {EVENT_LABEL[item.record.event_type]} inspection
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Started {new Date(item.record.created_at).toLocaleDateString()}
            {savedAt && <> · Saved {new Date(savedAt).toLocaleDateString()}</>}
          </p>
          <div className="mt-2">
            <StatePill state={state} />
          </div>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
      </CardContent>
    </Card>
  );
}

// Manual creation covers early terminations and pre-auto-create tenancies;
// the DB unique constraint dedupes against the cron/edge-function paths.
function StartRecordButtons({ list }: { list: ReturnType<typeof useConditionRecords> }) {
  const { toast } = useToast();
  const [creating, setCreating] = useState<string | null>(null);
  const missing = useMemo(
    () => missingRecordOffers(list.records.map((r) => r.record), list.tenancies),
    [list.records, list.tenancies],
  );

  const create = async (tenancyId: string, eventType: ConditionEventType) => {
    setCreating(`${tenancyId}:${eventType}`);
    try {
      await list.createRecord(tenancyId, eventType);
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Could not start the inspection',
        description: e.message ?? String(e),
      });
    } finally {
      setCreating(null);
    }
  };

  if (missing.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {missing.map(({ tenancy, eventType }) => (
        <Button
          key={`${tenancy.id}:${eventType}`}
          variant="outline"
          disabled={creating !== null}
          onClick={() => void create(tenancy.id, eventType)}
        >
          {creating === `${tenancy.id}:${eventType}`
            ? 'Starting…'
            : `Start ${EVENT_LABEL[eventType].toLowerCase()} inspection`}
        </Button>
      ))}
    </div>
  );
}

// Small coloured section heading used across the detail page.
function SectionCard({
  icon: Icon,
  title,
  accent,
  action,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  accent: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="overflow-hidden border-l-4 shadow-sm" style={{ borderLeftColor: accent }}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: `${accent}1a`, color: accent }}>
            <Icon className="h-4 w-4" />
          </span>
          {title}
        </CardTitle>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

const BLUE = 'hsl(214, 100%, 59%)';
const GREEN = 'hsl(142, 72%, 44%)';
const AMBER = '#f59e0b';

export function ConditionRecordDetail({ recordId }: { recordId: string | null }) {
  const d = useConditionRecordDetail(recordId);
  const [locationTag, setLocationTag] = useState<string>('');
  const [notesDraft, setNotesDraft] = useState<string | null>(null);
  const [notesStatus, setNotesStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lightbox, setLightbox] = useState<PhotoWithUrl | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const myNotesSaved =
    d.myParty === 'tenant' ? d.record?.tenant_notes : d.record?.landlord_notes;

  // Autosave the notes draft: blur-only saving loses the draft when the user
  // navigates away with the textarea still focused.
  useEffect(() => {
    if (notesDraft === null || notesDraft === (myNotesSaved ?? '')) return;
    const timer = setTimeout(async () => {
      setNotesStatus('saving');
      try {
        await d.saveNotes(notesDraft);
        setNotesStatus('saved');
      } catch {
        setNotesStatus('error');
      }
    }, 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notesDraft]);

  if (d.error && !d.record) {
    return <p className="text-destructive">{d.error}</p>;
  }
  if (d.loading || !d.record || !d.tenancy) {
    return (
      <div className={`space-y-4 ${PAGE_PADDING}`}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    );
  }

  const state = conditionRecordState(d.record);
  const locked = state === 'locked';
  const otherParty: ConditionParty = d.myParty === 'landlord' ? 'tenant' : 'landlord';
  // Notes are editable only while the record is open.
  const canEdit = state === 'open' && !!d.myParty;
  const myAttestedAt =
    d.myParty === 'tenant' ? d.record.tenant_attested_at : d.record.landlord_attested_at;
  // Either party can keep adding their own photos until THEY sign off, so both
  // sides can document move-in and move-out even after the other has started
  // sign-off. Once you approve, your photo set is final.
  const canAddPhotos = !!d.myParty && !locked && !myAttestedAt;
  const myNotes = d.myParty === 'tenant' ? d.record.tenant_notes : d.record.landlord_notes;
  const theirNotes = d.myParty === 'tenant' ? d.record.landlord_notes : d.record.tenant_notes;

  const currentTag = d.locationTags.includes(locationTag) ? locationTag : d.locationTags[0];
  const partyOf = (p: PhotoWithUrl): ConditionParty =>
    p.uploaded_by === d.tenancy!.tenant_id ? 'tenant' : 'landlord';
  // Dispute photos render inside the sign-off section, so keep them out of the
  // main galleries.
  const gallery = (p: PhotoWithUrl) => !p.dispute_id;
  const myPhotos = d.photos.filter((p) => partyOf(p) === d.myParty && gallery(p));
  const theirPhotos = d.photos.filter((p) => partyOf(p) === otherParty && gallery(p));

  const onFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    void d.uploadPhotos(Array.from(files), currentTag);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className={`space-y-5 ${PAGE_PADDING}`}>
      {/* Permanent-record disclaimer — always visible until the record locks
          (once locked, the red "saved" banner below states the same). */}
      {!locked && (
        <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          Once this inspection has been completed and accepted, all photos and notes become a
          permanent record and can no longer be edited or deleted.
        </div>
      )}

      {/* 1. Status header */}
      {locked ? (
        <div className="space-y-3">
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            All photos and notes are now a permanent record and can no longer be edited or deleted.
            {d.record.report_ref && (
              <span className="mt-1 block font-normal">
                Report ID <span className="font-semibold">{d.record.report_ref}</span> — the signed
                PDF carries a QR code anyone can scan to verify it.
              </span>
            )}
          </div>
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={async () => {
              const url = await d.getReportUrl();
              if (url) window.open(url, '_blank');
            }}
            disabled={!d.record.pdf_path}
          >
            <Download className="mr-1.5 h-4 w-4" />
            {d.record.pdf_path ? 'Download signed report (PDF)' : 'Report PDF generating…'}
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 rounded-2xl border-l-4 border-l-blue-500 bg-white/70 px-4 py-3 shadow-sm dark:bg-white/5">
          <span className="text-sm font-medium text-muted-foreground">Inspection status</span>
          <StatePill state={state} />
        </div>
      )}

      {/* 2. Photos */}
      <SectionCard icon={Camera} title="Photos" accent={BLUE}>
        <div className="space-y-4">
          {canAddPhotos && (
            <div className="flex flex-col gap-3 rounded-xl bg-blue-50/60 p-3 sm:flex-row sm:items-center dark:bg-blue-950/20">
              <select
                aria-label="Photo location"
                className="w-full min-w-0 rounded-md border bg-background px-3 py-2 text-sm sm:w-auto"
                value={currentTag}
                onChange={(e) => setLocationTag(e.target.value)}
              >
                {d.locationTags.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => onFiles(e.target.files)}
              />
              <Button className="w-full sm:w-auto" onClick={() => fileInputRef.current?.click()}>
                <ImagePlus className="mr-1.5 h-4 w-4" /> Add photos
              </Button>
            </div>
          )}
          <Tabs defaultValue="mine">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="mine" className="min-w-0 truncate">My photos</TabsTrigger>
              <TabsTrigger value="theirs" className="min-w-0 truncate">
                {PARTY_LABEL[otherParty]} photos
              </TabsTrigger>
            </TabsList>
            <TabsContent value="mine" className="mt-4 space-y-6">
              <PartyGallery
                photos={myPhotos}
                pending={d.pendingUploads}
                tagOrder={d.locationTags}
                emptyLocationText="You have not uploaded photos for this location yet."
                emptyAllText="You have not uploaded any photos yet."
                onRetry={d.retryUpload}
                onDismiss={d.dismissUpload}
                onView={setLightbox}
              />
            </TabsContent>
            <TabsContent value="theirs" className="mt-4 space-y-6">
              <PartyGallery
                photos={theirPhotos}
                pending={[]}
                tagOrder={d.locationTags}
                emptyLocationText="The other party has not uploaded photos for this location yet."
                emptyAllText="The other party has not uploaded any photos yet."
                onView={setLightbox}
              />
            </TabsContent>
          </Tabs>
        </div>
      </SectionCard>

      {/* 3. Notes */}
      <SectionCard
        icon={FileText}
        title="Notes"
        accent={GREEN}
        action={
          <span className="text-xs font-normal text-muted-foreground" aria-live="polite">
            {notesStatus === 'saving' && 'Saving…'}
            {notesStatus === 'saved' && 'Saved'}
            {notesStatus === 'error' && (
              <span className="text-destructive">Not saved — keep typing to retry</span>
            )}
          </span>
        }
      >
        <div className="space-y-3">
          <Textarea
            placeholder="Anything a photo can't show (e.g. geyser age, remotes handed over)…"
            value={notesDraft ?? myNotes ?? ''}
            disabled={!canEdit}
            onChange={(e) => setNotesDraft(e.target.value)}
          />
          {theirNotes && (
            <p className="break-words rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
              <span className="font-medium">{PARTY_LABEL[otherParty]} notes:</span> {theirNotes}
            </p>
          )}
        </div>
      </SectionCard>

      {/* 4. Sign-off */}
      {state === 'open' && d.myParty && (
        <SectionCard icon={ShieldCheck} title="Sign off" accent={AMBER}>
          <SignOffCard onSendForSignoff={d.sendForSignoff} hasPhotos={d.photos.length > 0} />
        </SectionCard>
      )}
      {state === 'awaiting_approval' && d.myParty && (
        <SectionCard icon={ShieldCheck} title="Sign off" accent={AMBER}>
          <SignAndApproveCard
            record={d.record}
            myParty={d.myParty}
            onApprove={d.approve}
          />
        </SectionCard>
      )}

      {/* Full-size photo viewer — thumbnails are too small to inspect evidence */}
      <Dialog open={lightbox !== null} onOpenChange={(open) => !open && setLightbox(null)}>
        <DialogContent className="max-w-[calc(100vw-2rem)] p-2 sm:max-w-3xl">
          {lightbox && (
            <>
              <DialogTitle className="px-2 pt-1 text-sm font-medium">
                {lightbox.location_tag}
                <span className="ml-2 font-normal text-muted-foreground">
                  {PARTY_LABEL[partyOf(lightbox)]} · {new Date(lightbox.created_at).toLocaleString()}
                </span>
              </DialogTitle>
              <img
                src={lightbox.url}
                alt={lightbox.location_tag}
                className="max-h-[80vh] w-full rounded object-contain"
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PartyGallery({
  photos,
  pending,
  tagOrder,
  emptyLocationText,
  emptyAllText,
  onRetry,
  onDismiss,
  onView,
}: {
  photos: PhotoWithUrl[];
  pending: PendingUpload[];
  tagOrder: string[];
  emptyLocationText: string;
  emptyAllText: string;
  onRetry?: (id: string) => void;
  onDismiss?: (id: string) => void;
  onView?: (photo: PhotoWithUrl) => void;
}) {
  const groups = groupPhotosByLocation(photos, tagOrder);
  const photoById = new Map(photos.map((p) => [p.id, p]));
  const pendingByLocation = new Map<string, PendingUpload[]>();
  for (const u of pending) {
    const list = pendingByLocation.get(u.locationTag) ?? [];
    list.push(u);
    pendingByLocation.set(u.locationTag, list);
  }
  const locations = [
    ...groups.map((g) => g.location),
    ...[...pendingByLocation.keys()].filter((l) => !groups.some((g) => g.location === l)),
  ];

  if (locations.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyAllText}</p>;
  }

  const groupByLocation = new Map(groups.map((g) => [g.location, g.photos]));
  return (
    <>
      {locations.map((location) => {
        const locationPhotos = groupByLocation.get(location) ?? [];
        const locationPending = pendingByLocation.get(location) ?? [];
        return (
          <div key={location}>
            <h3 className="mb-2 break-words font-medium">{location}</h3>
            {locationPhotos.length === 0 && locationPending.length === 0 ? (
              <p className="text-sm text-muted-foreground">{emptyLocationText}</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {locationPhotos.map((p) => {
                  const photo = photoById.get(p.id)!;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className="overflow-hidden rounded-xl border bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => onView?.(photo)}
                      aria-label={`View ${p.location_tag} photo full size`}
                    >
                      <img
                        src={photo.url}
                        alt={p.location_tag}
                        loading="eager"
                        decoding="async"
                        className="aspect-square w-full cursor-zoom-in object-cover"
                      />
                    </button>
                  );
                })}
                {locationPending.map((u) => (
                  <div key={u.id} className="relative overflow-hidden rounded-xl border">
                    <img
                      src={u.previewUrl}
                      alt={u.fileName}
                      className="aspect-square w-full object-cover opacity-60"
                    />
                    {u.status === 'uploading' ? (
                      <span className="absolute inset-x-1 bottom-1 truncate rounded bg-background/80 px-1 text-center text-xs">
                        Uploading…
                      </span>
                    ) : (
                      <div className="absolute inset-x-1 bottom-1 flex flex-wrap justify-center gap-1">
                        <Button size="sm" variant="secondary" onClick={() => onRetry?.(u.id)}>
                          Retry
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => onDismiss?.(u.id)}>
                          Cancel
                        </Button>
                      </div>
                    )}
                    {u.status === 'error' && (
                      <span className="absolute inset-x-1 top-1 truncate rounded bg-destructive/90 px-1 text-center text-xs text-destructive-foreground">
                        Upload failed
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

// Stage gate while the record is open: freeze uploads and begin sign-off.
function SignOffCard({
  onSendForSignoff,
  hasPhotos,
}: {
  onSendForSignoff: () => Promise<unknown>;
  hasPhotos: boolean;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try {
      await onSendForSignoff();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Could not send for sign-off', description: e.message ?? String(e) });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        When everyone has added their photos and notes, start sign-off. This freezes uploads and
        gives both parties 7 days to review and accept the inspection.
      </p>
      <Button className="w-full sm:w-auto" disabled={!hasPhotos || busy} onClick={() => void go()}>
        {busy ? 'Starting…' : 'Ready to sign off'}
      </Button>
      {!hasPhotos && <p className="text-xs text-muted-foreground">Add at least one photo first.</p>}
    </div>
  );
}

function Countdown({ endsAt }: { endsAt: Date }) {
  const ms = endsAt.getTime() - Date.now();
  if (ms <= 0) return <span className="text-amber-600">window closed — finalising</span>;
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  return (
    <span>
      {days > 0 ? `${days} day${days === 1 ? '' : 's'} ` : ''}
      {hours} hour{hours === 1 ? '' : 's'} left to respond
    </span>
  );
}

// Accept the inspection with a simple yes/no. "No" just advises talking to the
// other party — there is no formal dispute flow.
function SignAndApproveCard({
  record,
  myParty,
  onApprove,
}: {
  record: ConditionRecord;
  myParty: ConditionParty;
  onApprove: () => Promise<unknown>;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [saidNo, setSaidNo] = useState(false);

  const otherParty: ConditionParty = myParty === 'landlord' ? 'tenant' : 'landlord';
  const myApprovedAt = myParty === 'tenant' ? record.tenant_attested_at : record.landlord_attested_at;
  const endsAt = approvalWindowEndsAt(record);

  const accept = async () => {
    setBusy(true);
    try {
      await onApprove();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Could not accept', description: e.message ?? String(e) });
    } finally {
      setBusy(false);
    }
  };

  if (myApprovedAt) {
    return <Badge>You accepted on {new Date(myApprovedAt).toLocaleString()}</Badge>;
  }

  return (
    <div className="space-y-3">
      {endsAt && <p className="text-sm font-medium"><Countdown endsAt={endsAt} /></p>}
      <p className="text-sm font-semibold">Does this portray an accurate inspection?</p>
      <div className="flex flex-wrap gap-2">
        <Button
          className="bg-emerald-600 hover:bg-emerald-700"
          disabled={busy}
          onClick={() => { setSaidNo(false); void accept(); }}
        >
          {busy ? 'Saving…' : 'Yes'}
        </Button>
        <Button variant="outline" disabled={busy} onClick={() => setSaidNo(true)}>
          No
        </Button>
      </div>
      {saidNo && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300">
          We advise you to talk to the {PARTY_LABEL[otherParty].toLowerCase()} before accepting.
        </p>
      )}
    </div>
  );
}
