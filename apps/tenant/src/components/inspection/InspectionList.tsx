import { ChevronRight } from 'lucide-react';
import type { ConditionEventType } from '@mzanzihomes/common';
import type { ConditionRecordListItem, RecordOffer } from '@mzanzihomes/features/condition-record';
import {
  EVENT_LABEL,
  EVENT_ICON,
  STATUS_META,
  tenantStatus,
  type TenantInspectionStatus,
} from './inspectionModel';

interface Row {
  key: string;
  eventType: ConditionEventType;
  status: TenantInspectionStatus;
  onClick: () => void;
}

/**
 * "Inspections" list — one row per real inspection (existing records shown with
 * their true status, plus startable move-in/move-out offers as "Not started").
 * No fake inspection types are invented.
 */
export function InspectionList({
  records,
  offers,
  onOpen,
  onStart,
}: {
  records: ConditionRecordListItem[];
  offers: RecordOffer[];
  onOpen: (recordId: string) => void;
  onStart: (tenancyId: string, eventType: ConditionEventType) => void;
}) {
  const rows: Row[] = [
    ...records.map((r) => ({
      key: r.record.id,
      eventType: r.record.event_type,
      status: tenantStatus(r.record),
      onClick: () => onOpen(r.record.id),
    })),
    ...offers.map((o) => ({
      key: `offer-${o.tenancy.id}-${o.eventType}`,
      eventType: o.eventType,
      status: 'not_started' as const,
      onClick: () => onStart(o.tenancy.id, o.eventType),
    })),
  ];

  return (
    <section>
      <h3 className="mb-3 text-[16px] font-extrabold tracking-tight text-slate-900">Inspections</h3>
      <div className="overflow-hidden rounded-[24px] bg-white shadow-[0_18px_38px_-26px_rgba(20,50,90,0.4)]">
        {rows.map((row, i) => {
          const ev = EVENT_ICON[row.eventType];
          const st = STATUS_META[row.status];
          return (
            <button
              key={row.key}
              onClick={row.onClick}
              className={`flex w-full items-center gap-3 px-4 py-4 text-left transition active:bg-slate-50 ${
                i > 0 ? 'border-t border-slate-100' : ''
              }`}
            >
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${ev.bg}`}>
                <ev.icon className="h-5 w-5" style={{ color: ev.color }} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-bold text-slate-900">{EVENT_LABEL[row.eventType]}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] font-medium" style={{ color: st.color }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: st.color }} />
                  {st.label}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </section>
  );
}
