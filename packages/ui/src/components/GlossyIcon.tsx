import * as React from 'react';
import { cn } from '@mzanzihomes/common/lib/utils';

// Premium domed-resin icon buttons. Each tone is three shades of one vibrant,
// saturated colour so the dome shades from a light crown to a dark base — never
// a flat gradient. Pure white icon, no border/stroke; the edge is created by
// lighting and curvature alone.
export interface GlossyTone {
  light: string;
  base: string;
  dark: string;
}

export const GLOSSY_TONES: Record<string, GlossyTone> = {
  sapphire: { light: '#7db0ff', base: '#1e6bff', dark: '#0b3ea8' }, // Viewings
  emerald:  { light: '#5fe9b4', base: '#10b981', dark: '#046a49' }, // Maintenance
  orange:   { light: '#ffb267', base: '#f97316', dark: '#a8420a' }, // Applications
  purple:   { light: '#b48cff', base: '#7c3aed', dark: '#45177f' }, // Messages
  cyan:     { light: '#63e2f6', base: '#06b6d4', dark: '#046d92' }, // Payments
  indigo:   { light: '#8f89f6', base: '#4f46e5', dark: '#2a238c' }, // Lease Contracts
  teal:     { light: '#5fe8d8', base: '#14b8a6', dark: '#0a6d63' }, // Inventory
  ruby:     { light: '#ff6f8d', base: '#e11d48', dark: '#8e0d2c' }, // Inspection List
  amber:    { light: '#ffcd63', base: '#f59e0b', dark: '#a86200' }, // Support
};

interface GlossyIconProps {
  tone: GlossyTone;
  icon: React.ComponentType<{ size?: number | string; strokeWidth?: number; className?: string; color?: string }>;
  /** Diameter in px. */
  size?: number;
  /** Pressed state — usually driven by the parent tile's pointer state. */
  pressed?: boolean;
  className?: string;
}

/** A single glossy domed resin button with a centred white icon. */
export function GlossyIcon({ tone, icon: Icon, size = 54, pressed = false, className }: GlossyIconProps) {
  const { light, base, dark } = tone;
  const iconSize = Math.round(size * 0.46);

  return (
    <span
      aria-hidden="true"
      className={cn('relative inline-flex shrink-0 items-center justify-center rounded-full', className)}
      style={{
        width: size,
        height: size,
        // Reflections stacked over the tone dome (first = topmost layer).
        background: `
          radial-gradient(66% 42% at 33% 16%, rgba(255,255,255,0.95), rgba(255,255,255,0) 72%),
          radial-gradient(82% 54% at 50% 112%, rgba(255,255,255,0.42), rgba(255,255,255,0) 62%),
          radial-gradient(135% 130% at 50% 24%, ${light} 0%, ${base} 48%, ${dark} 100%)
        `,
        boxShadow: pressed
          ? `inset 0 2px 2px rgba(255,255,255,0.6),
             inset 0 -4px 8px rgba(0,0,0,0.34),
             inset 0 6px 12px rgba(255,255,255,0.14),
             0 3px 7px -3px ${dark}99,
             0 1px 2px rgba(0,0,0,0.20)`
          : `inset 0 2px 2px rgba(255,255,255,0.82),
             inset 0 -7px 12px rgba(0,0,0,0.30),
             inset 0 10px 18px rgba(255,255,255,0.20),
             0 9px 18px -4px ${dark}8c,
             0 3px 6px rgba(0,0,0,0.16)`,
        transform: pressed ? 'scale(0.97)' : 'scale(1)',
        filter: pressed ? 'brightness(0.96) saturate(1.05)' : 'none',
        transition:
          'transform 240ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 220ms ease, filter 160ms ease',
        willChange: 'transform',
      }}
    >
      {/* Tight specular highlight — the "wet" catch-light. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute rounded-full"
        style={{
          top: pressed ? '18%' : '13%',
          left: '21%',
          width: '42%',
          height: '27%',
          background: 'radial-gradient(closest-side, rgba(255,255,255,0.9), rgba(255,255,255,0))',
          filter: 'blur(1px)',
          transition: 'top 240ms ease',
        }}
      />
      <Icon size={iconSize} strokeWidth={2.4} color="#ffffff" className="relative" />
    </span>
  );
}
