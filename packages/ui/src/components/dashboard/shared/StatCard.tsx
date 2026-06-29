import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { LucideIcon } from 'lucide-react';

// ─── Reduced motion ───────────────────────────────────────────────────────────
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduced;
}

// ─── Count-up hook ────────────────────────────────────────────────────────────
// Animates from 0 → target using ease-out-quart over `duration` ms,
// starting after `delay` ms. Skips animation when reduced motion is active.
function useCountUp(
  target: number,
  duration = 700,
  delay = 0,
  skip = false
): number {
  const [current, setCurrent] = useState(skip ? target : 0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (skip) {
      setCurrent(target);
      return;
    }
    setCurrent(0);
    const timeout = window.setTimeout(() => {
      const startTime = performance.now();
      const tick = (now: number) => {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - t, 4); // ease-out-quart
        setCurrent(Math.round(eased * target));
        if (t < 1) rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, delay, skip]);

  return current;
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  /** Accent colour for icon bg + value text — defaults to ocean-blue */
  accentColor?: string;
  loading?: boolean;
  onClick?: () => void;
  /** Kept for backwards-compat; ignored */
  gradient?: string;
  textColor?: string;
  /**
   * When true the card emits a soft urgency glow to signal action is needed.
   * Use for: pending applications > 0, overdue rent, etc.
   */
  urgent?: boolean;
  /**
   * Stagger offset index — each step adds 80 ms of entrance delay.
   * Pass the card's position in the grid (0-based).
   */
  index?: number;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function StatCard({
  title,
  value,
  icon: Icon,
  accentColor = 'hsl(214, 100%, 59%)',
  loading = false,
  onClick,
  urgent = false,
  index = 0,
}: StatCardProps) {
  const reduced = usePrefersReducedMotion();

  const isNumeric = typeof value === 'number';
  const animatedNum = useCountUp(
    isNumeric ? (value as number) : 0,
    700,
    index * 80,
    reduced || !isNumeric
  );
  const displayValue = isNumeric ? animatedNum : value;

  // Spring-feel hover via inline style mutation (avoids CSS re-layout)
  const handleEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onClick || reduced) return;
    const el = e.currentTarget;
    el.style.transform = 'translateY(-3px) scale(1.01)';
    el.style.boxShadow = `0 10px 28px ${accentColor}28, 0 4px 8px rgba(0,0,0,0.07)`;
  };
  const handleLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    el.style.transform = '';
    el.style.boxShadow = urgent
      ? `0 2px 14px ${accentColor}28, 0 1px 3px rgba(0,0,0,0.04)`
      : '0 2px 12px rgba(37,99,235,0.08), 0 1px 3px rgba(0,0,0,0.04)';
  };

  // Staggered entrance: animate-in (tailwindcss-animate) + inline delay
  const entranceStyle: React.CSSProperties = reduced
    ? {}
    : {
        animationDelay: `${index * 80}ms`,
        animationFillMode: 'both',
        animationDuration: '480ms',
        animationTimingFunction: 'cubic-bezier(.22,.61,.36,1)',
      };

  return (
    <div
      onClick={onClick}
      className={[
        'group relative rounded-2xl p-4 sm:p-5 overflow-hidden bg-white',
        reduced ? '' : 'animate-in fade-in slide-in-from-bottom-2',
        onClick ? 'cursor-pointer' : '',
      ].join(' ')}
      style={{
        boxShadow: urgent
          ? `0 2px 14px ${accentColor}28, 0 1px 3px rgba(0,0,0,0.04)`
          : '0 2px 12px rgba(37,99,235,0.08), 0 1px 3px rgba(0,0,0,0.04)',
        border: `1px solid ${urgent ? `${accentColor}30` : 'rgba(37,99,235,0.10)'}`,
        transition: 'transform 220ms cubic-bezier(.22,.61,.36,1), box-shadow 220ms cubic-bezier(.22,.61,.36,1)',
        ...entranceStyle,
      }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {/* Urgency ambient glow — radial gradient bleeding from the accent bar */}
      {urgent && !reduced && (
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 80% 60% at 0% 50%, ${accentColor}14 0%, transparent 70%)`,
          }}
        />
      )}

      {/* Left accent bar — full opacity when urgent */}
      <div
        className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full"
        style={{ background: accentColor, opacity: urgent ? 1 : 0.7 }}
      />

      <div className="flex items-start justify-between gap-3 pl-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5 truncate">
            {title}
          </p>
          {loading ? (
            <div className="h-7 w-16 bg-gray-100 animate-pulse rounded-lg" />
          ) : (
            <p
              className="text-2xl sm:text-3xl font-bold leading-none tabular-nums"
              style={{ color: accentColor }}
            >
              {displayValue}
            </p>
          )}
        </div>

        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${accentColor}18` }}
        >
          <Icon className="w-5 h-5" style={{ color: accentColor }} />
        </div>
      </div>
    </div>
  );
}
