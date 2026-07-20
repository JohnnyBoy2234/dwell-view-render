import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera } from 'lucide-react';
import type { ConditionEventType } from '@mzanzihomes/common';
import {
  useConditionRecords,
  missingRecordOffers,
} from '@mzanzihomes/features/condition-record';
import { supabase } from '@mzanzihomes/supabase/client';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';
import TileDetailLayout from '@/components/TileDetailLayout';
import { CORAL, selectHero } from '@/components/inspection/inspectionModel';
import { InspectionHero } from '@/components/inspection/InspectionHero';
import { InspectionList } from '@/components/inspection/InspectionList';
import {
  InspectionEmptyState,
  InspectionNoPropertyState,
  InspectionErrorState,
  InspectionSkeleton,
} from '@/components/inspection/InspectionStates';

/**
 * Tenant Inspection List landing — a coral redesign over the existing
 * condition-record system. Reuses the same data hooks, state machine and detail
 * route; only the list presentation changes. The detail / photo / sign-off flow
 * is unchanged. No fake inspection types are shown (backend supports only
 * move-in and move-out).
 */
export default function TenantInspectionList() {
  const { records, tenancies, loading, error, refetch, createRecord } = useConditionRecords();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const offers = useMemo(
    () => missingRecordOffers(records.map((r) => r.record), tenancies),
    [records, tenancies],
  );
  const hero = useMemo(() => selectHero(records, offers), [records, offers]);

  const openRecord = (recordId: string) => navigate(`/tenant/condition-records/${recordId}`);

  const startAndOpen = async (tenancyId: string, eventType: ConditionEventType) => {
    setBusy(true);
    try {
      await createRecord(tenancyId, eventType);
      // createRecord dedupes against the cron/edge-function paths; read the row
      // back so we can open the tenant straight into it.
      const { data } = await (supabase.from('condition_records') as any)
        .select('id')
        .eq('tenancy_id', tenancyId)
        .eq('event_type', eventType)
        .maybeSingle();
      if (data?.id) openRecord(data.id);
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Could not start the inspection',
        description: e.message ?? String(e),
      });
    } finally {
      setBusy(false);
    }
  };

  const onHeroAction = () => {
    if (!hero) return;
    if (hero.actionKind === 'start' && hero.tenancyId) {
      void startAndOpen(hero.tenancyId, hero.eventType);
    } else if (hero.actionKind === 'open' && hero.record) {
      openRecord(hero.record.id);
    }
  };

  let body: React.ReactNode;
  if (loading) {
    body = <InspectionSkeleton />;
  } else if (tenancies.length === 0) {
    body = (
      <div className="space-y-5 [animation:fadeUp_0.5s_ease-out]">
        <InspectionHero hero={null} />
        <InspectionNoPropertyState />
      </div>
    );
  } else if (error) {
    body = (
      <div className="space-y-5 [animation:fadeUp_0.5s_ease-out]">
        <InspectionHero hero={null} />
        <InspectionErrorState message={error} onRetry={() => refetch()} />
      </div>
    );
  } else if (records.length === 0 && offers.length === 0) {
    body = (
      <div className="space-y-5 [animation:fadeUp_0.5s_ease-out]">
        <InspectionHero hero={null} />
        <InspectionEmptyState />
      </div>
    );
  } else {
    body = (
      <div className="space-y-5 [animation:fadeUp_0.5s_ease-out]">
        <InspectionHero hero={hero} onAction={hero ? onHeroAction : undefined} busy={busy} />
        <InspectionList records={records} offers={offers} onOpen={openRecord} onStart={startAndOpen} />
      </div>
    );
  }

  return (
    <TileDetailLayout icon={Camera} accent={CORAL} title="Inspection List" subtitle="Photos, notes and sign-off">
      {body}
    </TileDetailLayout>
  );
}
