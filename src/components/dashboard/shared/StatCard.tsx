import * as React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  /** accent colour for icon bg + value text — defaults to ocean-blue */
  accentColor?: string;
  loading?: boolean;
  onClick?: () => void;
  /** kept for backwards-compat; ignored */
  gradient?: string;
  textColor?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  accentColor = 'hsl(214, 100%, 59%)',
  loading = false,
  onClick,
}: StatCardProps) {
  return (
    <div
      onClick={onClick}
      className={`group relative bg-white rounded-2xl p-4 sm:p-5 transition-all duration-200 overflow-hidden ${onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-lg' : ''}`}
      style={{
        boxShadow: '0 2px 12px rgba(37,99,235,0.08), 0 1px 3px rgba(0,0,0,0.04)',
        border: '1px solid rgba(37,99,235,0.10)',
      }}
    >
      {/* Left accent bar */}
      <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full" style={{ background: accentColor, opacity: 0.7 }} />

      <div className="flex items-start justify-between gap-3 pl-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5 truncate">{title}</p>
          {loading ? (
            <div className="h-7 w-16 bg-gray-100 animate-pulse rounded-lg" />
          ) : (
            <p className="text-2xl sm:text-3xl font-bold leading-none" style={{ color: accentColor }}>
              {value}
            </p>
          )}
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${accentColor}18` }}>
          <Icon className="w-5 h-5" style={{ color: accentColor }} />
        </div>
      </div>
    </div>
  );
}