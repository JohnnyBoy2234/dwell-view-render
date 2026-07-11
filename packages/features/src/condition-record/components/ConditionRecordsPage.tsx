import { useMemo, useRef, useState } from 'react';
import { Button } from '@mzanzihomes/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import { Badge } from '@mzanzihomes/ui/components/badge';
import { Textarea } from '@mzanzihomes/ui/components/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@mzanzihomes/ui/components/tabs';
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

export function ConditionRecordsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const list = useConditionRecords();

  if (selectedId) {
    return (
      <RecordDetail
        recordId={selectedId}
        onBack={() => {
          setSelectedId(null);
          list.refetch();
        }}
      />
    );
  }

  return (
    <div className="space-y-4 p-4 pb-[calc(7rem+env(safe-area-inset-bottom))]">
      {list.loading && <p className="text-muted-foreground">Loading condition records…</p>}
      {list.error && <p className="text-destructive">{list.error}</p>}
      {!list.loading && list.records.length === 0 && (
        <p className="text-muted-foreground">No condition records yet.</p>
      )}
      {list.records.map((item) => (
        <RecordCard key={item.record.id} item={item} onOpen={() => setSelectedId(item.record.id)} />
      ))}
      <StartRecordButtons list={list} />
    </div>
  );
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
  const missing = useMemo(() => {
    const have = new Set(list.records.map((r) => `${r.record.tenancy_id}:${r.record.event_type}`));
    return list.activeTenancies.flatMap((t) =>
      (['move_in', 'move_out'] as ConditionEventType[])
        .filter((e) => !have.has(`${t.id}:${e}`))
        .map((e) => ({ tenancy: t, eventType: e })),
    );
  }, [list.records, list.activeTenancies]);

  if (missing.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {missing.map(({ tenancy, eventType }) => (
        <Button
          key={`${tenancy.id}:${eventType}`}
          variant="outline"
          onClick={() => list.createRecord(tenancy.id, eventType)}
        >
          Start {EVENT_LABEL[eventType].toLowerCase()} record
        </Button>
      ))}
    </div>
  );
}

function RecordDetail({ recordId, onBack }: { recordId: string; onBack: () => void }) {
  const d = useConditionRecordDetail(recordId);
  const [locationTag, setLocationTag] = useState<string>('');
  const [notesDraft, setNotesDraft] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (d.loading || !d.record || !d.tenancy) {
    return (
      <div className="p-4">
        <Button variant="ghost" onClick={onBack}>← Back</Button>
        <p className="text-muted-foreground">{d.error ?? 'Loading…'}</p>
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
    <div className="space-y-6 p-4 pb-[calc(7rem+env(safe-area-inset-bottom))]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" onClick={onBack}>← Back</Button>
        <Badge variant={locked ? 'default' : 'secondary'}>{STATE_LABEL[state]}</Badge>
      </div>

      {canEdit && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Add photos</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
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
          />
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="Anything a photo can't show (e.g. geyser age, remotes handed over)…"
            value={notesDraft ?? myNotes ?? ''}
            disabled={locked}
            onChange={(e) => setNotesDraft(e.target.value)}
            onBlur={() => {
              if (notesDraft !== null && notesDraft !== (myNotes ?? '')) d.saveNotes(notesDraft);
            }}
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
}: {
  photos: PhotoWithUrl[];
  pending: PendingUpload[];
  tagOrder: string[];
  emptyLocationText: string;
  emptyAllText: string;
  onRetry?: (id: string) => void;
  onDismiss?: (id: string) => void;
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
                    <div key={p.id} className="overflow-hidden rounded-md border">
                      <img
                        src={photo.url}
                        alt={p.location_tag}
                        className="aspect-square w-full object-cover"
                      />
                    </div>
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
