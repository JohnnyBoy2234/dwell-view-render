import { useMemo, useState } from 'react';
import { Button } from '@mzanzihomes/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import { Badge } from '@mzanzihomes/ui/components/badge';
import { Textarea } from '@mzanzihomes/ui/components/textarea';
import {
  LOCATION_TAGS,
  conditionRecordState,
  groupPhotosByLocation,
  type ConditionEventType,
  type ConditionRecordState,
} from '@mzanzihomes/common';
import { useConditionRecords, type ConditionRecordListItem } from '../hooks/useConditionRecords';
import { useConditionRecordDetail } from '../hooks/useConditionRecordDetail';

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
    <div className="space-y-4 p-4">
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
        <CardTitle className="flex items-center justify-between text-base">
          <span>
            {item.propertyTitle} — {EVENT_LABEL[item.record.event_type]}
          </span>
          <Badge variant={state === 'locked' ? 'default' : 'secondary'}>{STATE_LABEL[state]}</Badge>
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
  const [locationTag, setLocationTag] = useState<string>(LOCATION_TAGS[0]);
  const [uploading, setUploading] = useState(false);
  const [notesDraft, setNotesDraft] = useState<string | null>(null);

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
  const iHaveAttested =
    d.myParty === 'tenant' ? !!d.record.tenant_attested_at : !!d.record.landlord_attested_at;
  const myNotes = d.myParty === 'tenant' ? d.record.tenant_notes : d.record.landlord_notes;
  const theirNotes = d.myParty === 'tenant' ? d.record.landlord_notes : d.record.tenant_notes;
  const groups = groupPhotosByLocation(d.photos);
  const photoById = new Map(d.photos.map((p) => [p.id, p]));

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      await d.uploadPhotos(Array.from(files), locationTag);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>← Back</Button>
        <Badge variant={locked ? 'default' : 'secondary'}>{STATE_LABEL[state]}</Badge>
      </div>

      {!locked && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Add photos</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <select
              className="rounded-md border bg-background px-3 py-2 text-sm"
              value={locationTag}
              onChange={(e) => setLocationTag(e.target.value)}
            >
              {LOCATION_TAGS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={uploading}
              onChange={(e) => onFiles(e.target.files)}
            />
            {uploading && <span className="text-sm text-muted-foreground">Uploading…</span>}
          </CardContent>
        </Card>
      )}

      {groups.length === 0 && <p className="text-muted-foreground">No photos yet.</p>}
      {groups.map((group) => (
        <div key={group.location}>
          <h3 className="mb-2 font-medium">{group.location}</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {group.photos.map((p) => {
              const photo = photoById.get(p.id)!;
              const isMine =
                d.myParty === 'tenant'
                  ? photo.uploaded_by === d.tenancy!.tenant_id
                  : photo.uploaded_by === d.tenancy!.landlord_id;
              return (
                <div key={p.id} className="relative overflow-hidden rounded-md border">
                  <img src={photo.url} alt={p.location_tag} className="aspect-square w-full object-cover" />
                  <Badge className="absolute left-1 top-1" variant={isMine ? 'default' : 'secondary'}>
                    {photo.uploaded_by === d.tenancy!.tenant_id ? 'Tenant' : 'Landlord'}
                  </Badge>
                  {!locked && isMine && (
                    <Button
                      size="sm"
                      variant="destructive"
                      className="absolute bottom-1 right-1"
                      onClick={() => d.deletePhoto(photo)}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

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
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">{d.myParty === 'tenant' ? 'Landlord' : 'Tenant'} notes:</span>{' '}
              {theirNotes}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Attestation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">{d.record.attestation_text}</p>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <AttestationStatus label="Tenant" at={d.record.tenant_attested_at} />
            <AttestationStatus label="Landlord" at={d.record.landlord_attested_at} />
          </div>
          {!locked && d.myParty && (
            <Button disabled={iHaveAttested} onClick={() => d.attest()}>
              {iHaveAttested ? 'You have attested' : 'I agree'}
            </Button>
          )}
          {!locked && (
            <p className="text-xs text-muted-foreground">
              Adding or removing any photo clears all attestations; once both parties agree the
              record locks permanently.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
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
