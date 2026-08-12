import * as React from 'react';
import { cn } from '@mzanzihomes/common/lib/utils';
import { GlossyIcon, GLOSSY_TONES } from '../../GlossyIcon';

// Glossy candy-button tone per tool, matching the tenant home's tile tones.
const TONE_BY_TITLE: Record<string, keyof typeof GLOSSY_TONES> = {
  Applications: 'orange',
  Maintenance: 'green',
  Payments: 'teal',
  Leases: 'navy',
  Inventory: 'darkteal',
  'Inspection List': 'red',
  Support: 'gold',
  Messages: 'purple',
  SwiftBooks: 'violet',
  'Invite Tenant': 'green',
  'List Property': 'violet',
  'Rent collection': 'spring',
};

export interface ToolItem {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  tab?: string;
  path?: string;
  count?: number;
  action?: () => void;
}

// Design token colours per tool — aligned with the ios-* CSS variables in index.css
const TOOL_COLORS: Record<string, { bg: string; iconColor: string; glow: string }> = {
  Applications: { bg: 'hsl(235 85% 60% / 0.12)', iconColor: 'hsl(235 85% 50%)',  glow: 'hsl(235 85% 60% / 0.22)' },
  Maintenance:  { bg: 'hsl(142 72% 44% / 0.12)', iconColor: 'hsl(142 72% 34%)',  glow: 'hsl(142 72% 44% / 0.28)' },
  Payments:     { bg: 'hsl(142 72% 44% / 0.12)', iconColor: 'hsl(142 72% 34%)',  glow: 'hsl(142 72% 44% / 0.22)' },
  SwiftBooks:   { bg: 'hsl(275 84% 67% / 0.12)', iconColor: 'hsl(275 84% 52%)',  glow: 'hsl(275 84% 67% / 0.22)' },
  Leases:       { bg: 'hsl(214 100% 59% / 0.12)', iconColor: 'hsl(214 100% 44%)', glow: 'hsl(214 100% 59% / 0.22)' },
  Inventory:    { bg: 'hsl(174 72% 56% / 0.12)', iconColor: 'hsl(174 72% 36%)',  glow: 'hsl(174 72% 56% / 0.22)' },
  'Inspection List': { bg: 'hsl(0 84% 60% / 0.12)', iconColor: 'hsl(0 72% 45%)', glow: 'hsl(0 84% 60% / 0.25)' },
  Support:        { bg: 'hsl(220 9% 46% / 0.09)',  iconColor: 'hsl(220 9% 34%)',   glow: 'hsl(220 9% 46% / 0.18)' },
  'Invite Tenant':{ bg: 'hsl(214 100% 59% / 0.12)', iconColor: 'hsl(214 100% 44%)', glow: 'hsl(214 100% 59% / 0.22)' },
  'List Property':{ bg: 'hsl(270 80% 60% / 0.12)', iconColor: 'hsl(270 80% 44%)',  glow: 'hsl(270 80% 60% / 0.22)' },
};
const DEFAULT_COLOR = {
  bg: 'hsl(214 60% 97%)',
  iconColor: 'hsl(214 50% 40%)',
  glow: 'hsl(214 100% 59% / 0.15)',
};

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(
    () => typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  );
  React.useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduced;
}

interface ToolTileProps {
  tool: ToolItem;
  index: number;
  onClick: () => void;
  reduced: boolean;
}

function ToolTile({ tool, index, onClick, reduced }: ToolTileProps) {
  const colors = TOOL_COLORS[tool.title] ?? DEFAULT_COLOR;
  const urgent = (tool.count ?? 0) > 0;

  // Spring-feel hover via inline style mutation — bypasses CSS transition stiffness
  const handleEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (reduced) return;
    const el = e.currentTarget;
    el.style.transform = 'translateY(-3px)';
    el.style.boxShadow = `0 8px 22px ${colors.glow}, 0 2px 6px rgba(0,0,0,0.06)`;
  };
  const handleLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    const el = e.currentTarget;
    el.style.transform = '';
    el.style.boxShadow = urgent
      ? `0 0 0 1.5px ${colors.iconColor}30, 0 2px 8px rgba(0,0,0,0.04)`
      : '0 1px 3px rgba(0,0,0,0.06)';
  };

  return (
    <button
      onClick={onClick}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      className={cn(
        'group relative rounded-2xl p-3.5 text-center bg-white border border-black/[0.06]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        'active:scale-95',
        reduced ? '' : 'animate-in fade-in slide-in-from-bottom-2',
      )}
      style={{
        boxShadow: urgent
          ? `0 0 0 1.5px ${colors.iconColor}30, 0 2px 8px rgba(0,0,0,0.04)`
          : '0 1px 3px rgba(0,0,0,0.06)',
        transition: 'transform 200ms cubic-bezier(.22,.61,.36,1), box-shadow 200ms cubic-bezier(.22,.61,.36,1), scale 75ms ease',
        animationDelay: reduced ? undefined : `${index * 45}ms`,
        animationFillMode: 'both',
        animationDuration: '360ms',
        animationTimingFunction: 'cubic-bezier(.22,.61,.36,1)',
      }}
    >
      {/* Urgency radial glow bleeds from the top of the tile */}
      {urgent && !reduced && (
        <div
          aria-hidden
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 90% 55% at 50% 0%, ${colors.glow} 0%, transparent 70%)`,
          }}
        />
      )}

      <div className="flex flex-col items-center gap-1.5">
        {/* Glossy candy-button icon, matching the tenant home */}
        <div className="relative mt-0.5">
          <GlossyIcon
            tone={GLOSSY_TONES[TONE_BY_TITLE[tool.title] ?? 'sky']}
            icon={tool.icon as React.ComponentType<{ size?: number; strokeWidth?: number; color?: string; className?: string }>}
            size={48}
            className="mx-auto"
          />

          {/* Urgency count badge */}
          {urgent && (
            <span
              aria-label={`${tool.count} item${(tool.count ?? 0) > 1 ? 's' : ''} require attention`}
              className="absolute -top-1.5 -right-1.5 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full text-white flex items-center justify-center leading-none font-bold animate-in zoom-in-50 duration-200"
              style={{
                fontSize: '9px',
                background: 'hsl(0 78% 62%)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
              }}
            >
              {(tool.count ?? 0) > 99 ? '99+' : tool.count}
            </span>
          )}
        </div>

        {/* Label — minimum 12px for legibility on mobile */}
        <span className="text-xs font-semibold text-foreground leading-tight mt-0.5">
          {tool.title}
        </span>
        <span className="text-[10px] text-muted-foreground leading-tight hidden sm:block">
          {tool.subtitle}
        </span>
      </div>
    </button>
  );
}

interface ToolGridProps {
  tools: ToolItem[];
  onToolClick: (tool: ToolItem) => void;
}

export function ToolGrid({ tools, onToolClick }: ToolGridProps) {
  const reduced = usePrefersReducedMotion();
  return (
    <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
      {tools.map((tool, i) => (
        <ToolTile
          key={tool.title}
          tool={tool}
          index={i}
          onClick={() => onToolClick(tool)}
          reduced={reduced}
        />
      ))}
    </div>
  );
}
