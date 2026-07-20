import houseCameraUrl from '@/assets/inspection-house-camera.png';
import { CORAL, EVENT_LABEL, type HeroContent } from './inspectionModel';

/**
 * Coral inspection hero. Content is driven by the most relevant inspection's
 * real state; the action button only renders when the tenant is actually
 * allowed to act (start / continue / review / view).
 */
export function InspectionHero({
  hero,
  onAction,
  busy,
}: {
  hero: HeroContent | null;
  onAction?: () => void;
  busy?: boolean;
}) {
  return (
    <div
      className="relative min-h-[188px] overflow-hidden rounded-[24px] p-5 shadow-[0_18px_38px_-26px_rgba(239,68,68,0.5)]"
      style={{ background: 'linear-gradient(135deg, #fdecec 0%, #fbe0e1 100%)' }}
    >
      {/* Centered via top/bottom + my-auto (not translate) so the float
          animation's transform can't clobber the centering. */}
      <img
        src={houseCameraUrl}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="pointer-events-none absolute bottom-0 right-1 top-0 my-auto h-[152px] w-auto animate-soft-float"
      />
      <div className="relative z-10 max-w-[56%]">
        <h2 className="text-[21px] font-extrabold leading-tight text-slate-900">
          {hero ? EVENT_LABEL[hero.eventType] : 'Inspection List'}
        </h2>
        {hero ? (
          <>
            <p className="mt-1 text-[14px] font-bold" style={{ color: hero.statusColor }}>
              {hero.statusLabel}
            </p>
            <p className="mt-1.5 text-[13px] leading-snug text-slate-600">{hero.description}</p>
            {onAction && (
              <button
                onClick={onAction}
                disabled={busy}
                className="mt-4 inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-[14px] font-bold text-white shadow-[0_14px_26px_-10px_rgba(239,68,68,0.8)] transition-transform active:scale-[0.97] disabled:opacity-70"
                style={{ background: CORAL }}
              >
                {busy ? 'Working…' : hero.actionLabel}
              </button>
            )}
          </>
        ) : (
          <p className="mt-1.5 text-[13px] leading-snug text-slate-600">
            Move-in and move-out inspections will appear here for your property.
          </p>
        )}
      </div>
    </div>
  );
}
