import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Camera } from 'lucide-react';
import { Button } from '@mzanzihomes/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import { Badge } from '@mzanzihomes/ui/components/badge';
import { Textarea } from '@mzanzihomes/ui/components/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@mzanzihomes/ui/components/tabs';
import { Dialog, DialogContent, DialogTitle } from '@mzanzihomes/ui/components/dialog';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@mzanzihomes/ui/components/alert-dialog';
import {
  conditionRecordState,
  groupPhotosByLocation,
  type ConditionEventType,
  type ConditionParty,
  type ConditionRecordState,
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
  awaiting_tenant: 'Awaiting tenant attestation',
  awaiting_landlord: 'Awaiting landlord attestation',
  locked: 'Locked',
};

const PARTY_LABEL: Record<ConditionParty, string> = {
  tenant: 'Tenant',
  landlord: 'Landlord',
};

// Layout padding comes from the dashboard shell; the pb keeps the last card
// clear of the mobile bottom navigation and floating chat button.
const PAGE_PADDING = 'pb-[calc(7rem+env(safe-area-inset-bottom))]';

export function ConditionRecordsPage() {
  const navigate = useNavigate();
  const list = useConditionRecords();

  if (list.loading) {
    return (
      <div className={`space-y-4 ${PAGE_PADDING}`}>
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${PAGE_PADDING}`}>
      {list.error && <p className="text-destructive">{list.error}</p>}
      {!list.error && list.records.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Camera className="mx-auto mb-3 h-10 w-10 text-muted-foreground" aria-hidden="true" />
            <p className="font-medium">No condition records yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              A record is started automatically at move-in and move-out so both parties can
              photograph the property's condition.
            </p>
          </CardContent>
        </Card>
      )}
      {list.records.map((item) => (
        <RecordCard key={item.record.id} item={item} onOpen={() => navigate(item.record.id)} />
      ))}
      <StartRecordButtons list={list} />
    </div>
  );
}

// Route wrapper: /condition-records/:recordId. A routed detail deep-links from
// notifications, survives refresh, and lets the app-bar back button behave.
export function ConditionRecordDetailPage() {
  const { recordId } = useParams<{ recordId: string }>();
  return <RecordDetail recordId={recordId ?? null} />;
}

function RecordCard({ item, onOpen }: { item: ConditionRecordListItem; onOpen: () => void }) {
  const state = conditionRecordState(item.record);
  return (
    <Card className="cursor-pointer hover:bg-accent/50" onClick={onOpen}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-start justify-between gap-2 text-base">
          <span className="min-w-0 break-words">
            {item.propertyTitle} — {EVENT_LABEL[item.record.event_type]}
          </span>
          <Badge className="shrink-0 text-center" variant={state === 'locked' ? 'default' : 'secondary'}>
            {STATE_LABEL[state]}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Started {new Date(item.record.created_at).toLocaleDateString()}
        {state === 'locked' && item.record.landlord_attested_at && item.record.tenant_attested_at && (
          <>
            {' · '}Locked{' '}
            {new Date(
              [item.record.tenant_attested_at, item.record.landlord_attested_at].sort().slice(-1)[0]!,
            ).toLocaleDateString()}
          </>
        )}
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
        title: 'Could not start the record',
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
          {creating === `${tenancy.id}:${eventType}` ? 'Starting…' : `Start ${EVENT_LABEL[eventType].toLowerCase()} record`}
        </Button>
      ))}
    </div>
  );
}

function RecordDetail({ recordId }: { recordId: string | null }) {
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
          <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  const state = conditionRecordState(d.record);
  const locked = state === 'locked';
  const myAttestedAt =
    d.myParty === 'tenant' ? d.record.tenant_attested_at : d.record.landlord_attested_at;
  const otherParty: ConditionParty = d.myParty === 'landlord' ? 'tenant' : 'landlord';
  const otherAttestedAt =
    otherParty === 'tenant' ? d.record.tenant_attested_at : d.record.landlord_attested_at;
  const canEdit = !locked && !!d.myParty && !myAttestedAt;
  const myNotes = d.myParty === 'tenant' ? d.record.tenant_notes : d.record.landlord_notes;
  const theirNotes = d.myParty === 'tenant' ? d.record.landlord_notes : d.record.tenant_notes;

  const currentTag = d.locationTags.includes(locationTag) ? locationTag : d.locationTags[0];
  const partyOf = (p: PhotoWithUrl): ConditionParty =>
    p.uploaded_by === d.tenancy!.tenant_id ? 'tenant' : 'landlord';
  const myPhotos = d.photos.filter((p) => partyOf(p) === d.myParty);
  const theirPhotos = d.photos.filter((p) => partyOf(p) === otherParty);

  const onFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    void d.uploadPhotos(Array.from(files), currentTag);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className={`space-y-6 ${PAGE_PADDING}`}>
      {/* Back navigation lives in the dashboard app bar */}
      <div className="flex justify-end">
        <Badge variant={locked ? 'default' : 'secondary'}>{STATE_LABEL[state]}</Badge>
      </div>

      {canEdit && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Add photos</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
              Add photos
            </Button>
          </CardContent>
        </Card>
      )}
      {!canEdit && myAttestedAt && !locked && (
        <p className="text-sm text-muted-foreground">
          You attested on {new Date(myAttestedAt).toLocaleString()}. Your photos are locked.
        </p>
      )}

      <Tabs defaultValue="mine">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="mine" className="min-w-0 truncate">My Photos</TabsTrigger>
          <TabsTrigger value="theirs" className="min-w-0 truncate">
            {PARTY_LABEL[otherParty]} Photos
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
          <p className="text-sm text-muted-foreground">
            {PARTY_LABEL[otherParty]} attestation:{' '}
            {otherAttestedAt ? (
              <span className="text-green-600">
                attested {new Date(otherAttestedAt).toLocaleString()}
              </span>
            ) : (
              'not yet attested'
            )}
            {' · '}View only
          </p>
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

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-baseline justify-between gap-2 text-base">
            Notes
            <span className="text-xs font-normal text-muted-foreground" aria-live="polite">
              {notesStatus === 'saving' && 'Saving…'}
              {notesStatus === 'saved' && 'Saved'}
              {notesStatus === 'error' && (
                <span className="text-destructive">Not saved — keep typing to retry</span>
              )}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="Anything a photo can't show (e.g. geyser age, remotes handed over)…"
            value={notesDraft ?? myNotes ?? ''}
            disabled={locked}
            onChange={(e) => setNotesDraft(e.target.value)}
          />
          {theirNotes && (
            <p className="break-words text-sm text-muted-foreground">
              <span className="font-medium">{PARTY_LABEL[otherParty]} notes:</span> {theirNotes}
            </p>
          )}
        </CardContent>
      </Card>

      <AttestationCard
        record={d.record}
        myParty={d.myParty}
        myAttestedAt={myAttestedAt}
        locked={locked}
        hasPhotos={myPhotos.length > 0}
        onAttest={d.attest}
      />

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
                      className="overflow-hidden rounded-md border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => onView?.(photo)}
                      aria-label={`View ${p.location_tag} photo full size`}
                    >
                      <img
                        src={photo.url}
                        alt={p.location_tag}
                        loading="lazy"
                        className="aspect-square w-full cursor-zoom-in object-cover"
                      />
                    </button>
                  );
                })}
                {locationPending.map((u) => (
                  <div key={u.id} className="relative overflow-hidden rounded-md border">
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

function AttestationCard({
  record,
  myParty,
  myAttestedAt,
  locked,
  hasPhotos,
  onAttest,
}: {
  record: { attestation_text: string; tenant_attested_at: string | null; landlord_attested_at: string | null };
  myParty: ConditionParty | null;
  myAttestedAt: string | null;
  locked: boolean;
  hasPhotos: boolean;
  onAttest: () => Promise<void>;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [attesting, setAttesting] = useState(false);
  const [attestError, setAttestError] = useState<string | null>(null);

  const confirmAttest = async () => {
    if (attesting) return;
    setAttesting(true);
    setAttestError(null);
    try {
      await onAttest();
      setConfirmOpen(false);
    } catch (e: any) {
      setAttestError(e.message ?? String(e));
    } finally {
      setAttesting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Attestation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm">{record.attestation_text}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <AttestationStatus label="Tenant" at={record.tenant_attested_at} />
          <AttestationStatus label="Landlord" at={record.landlord_attested_at} />
        </div>
        {myParty && myAttestedAt && (
          <Badge>You attested on {new Date(myAttestedAt).toLocaleString()}</Badge>
        )}
        {!locked && myParty && !myAttestedAt && (
          <Button className="w-full sm:w-auto" disabled={!hasPhotos} onClick={() => setConfirmOpen(true)}>
            Confirm and lock my photos
          </Button>
        )}
        {!locked && myParty && !myAttestedAt && !hasPhotos && (
          <p className="text-xs text-muted-foreground">Add at least one photo before attesting.</p>
        )}
        {!locked && (
          <p className="text-xs text-muted-foreground">
            Attesting locks your own photo set; once both parties attest the record locks
            permanently.
          </p>
        )}
        {attestError && !confirmOpen && <p className="text-sm text-destructive">{attestError}</p>}
      </CardContent>

      <AlertDialog open={confirmOpen} onOpenChange={(open) => !attesting && setConfirmOpen(open)}>
        <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm your inspection photos</AlertDialogTitle>
            <AlertDialogDescription>
              By confirming, you attest that these photos accurately represent the condition of the
              property at the time of inspection. Once confirmed, the photos will be locked and you
              will no longer be able to add, edit, replace, or remove them.
              <br />
              <br />
              Please review all photos before continuing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {attestError && <p className="text-sm text-destructive">{attestError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={attesting}>Go Back and Review</AlertDialogCancel>
            <AlertDialogAction
              disabled={attesting}
              onClick={(e) => {
                e.preventDefault();
                void confirmAttest();
              }}
            >
              {attesting ? 'Confirming…' : 'Confirm and Lock Photos'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function AttestationStatus({ label, at }: { label: string; at: string | null }) {
  return (
    <span>
      {label}:{' '}
      {at ? (
        <span className="text-green-600">agreed {new Date(at).toLocaleString()}</span>
      ) : (
        <span className="text-muted-foreground">not yet agreed</span>
      )}
    </span>
  );
}
