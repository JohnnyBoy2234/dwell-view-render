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
  sapphire: { light: '#7db0ff', base: '#1f6bff', dark: '#0b3ca6' }, // Viewings — royal blue
  emerald:  { light: '#7bea90', base: '#22c55e', dark: '#12763a' }, // Maintenance — vivid green
  orange:   { light: '#ffb35f', base: '#f97316', dark: '#a8420a' }, // Applications — orange
  purple:   { light: '#b492ff', base: '#7c3aed', dark: '#45177f' }, // Messages — royal purple
  cyan:     { light: '#54dcc9', base: '#0f9e8e', dark: '#0a5b53' }, // Payments — sea teal
  indigo:   { light: '#6d8cf3', base: '#2447c8', dark: '#132873' }, // Lease Contracts — deep navy
  teal:     { light: '#5ce7d6', base: '#14b8a6', dark: '#0a6d63' }, // Inventory — teal
  ruby:     { light: '#ff8072', base: '#ef4444', dark: '#a01818' }, // Inspection List — red
  amber:    { light: '#ffce63', base: '#f4a009', dark: '#a86200' }, // Support — gold
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
        // Glossy 3D marble: a bright soft catch-light upper-left, a broad top
        // sheen, a colour bounce along the bottom rim, over a sphere-shaded
        // body (bright crown → base → dark lower edge). Layers top→bottom.
        background: `
          radial-gradient(40% 32% at 30% 22%, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.35) 42%, rgba(255,255,255,0) 68%),
          radial-gradient(85% 58% at 42% 4%, rgba(255,255,255,0.42), rgba(255,255,255,0) 55%),
          radial-gradient(62% 40% at 50% 104%, ${light} 0%, rgba(255,255,255,0) 58%),
          radial-gradient(125% 120% at 40% 32%, ${light} 0%, ${base} 44%, ${dark} 100%)
        `,
        boxShadow: pressed
          ? `inset 0 2px 4px rgba(255,255,255,0.35),
             inset 0 -5px 10px rgba(0,0,0,0.38),
             0 4px 9px -4px ${dark}99,
             0 1px 3px rgba(0,0,0,0.20)`
          : `inset 0 3px 5px rgba(255,255,255,0.45),
             inset 0 -9px 15px rgba(0,0,0,0.34),
             0 10px 20px -5px ${dark}94,
             0 3px 6px rgba(0,0,0,0.16)`,
        transform: pressed ? 'scale(0.97)' : 'scale(1)',
        filter: pressed ? 'brightness(0.95) saturate(1.06)' : 'none',
        transition:
          'transform 240ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 220ms ease, filter 160ms ease',
        willChange: 'transform',
      }}
    >
      {/* Tight specular glint — the "wet" catch-light core. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute rounded-full"
        style={{
          top: pressed ? '20%' : '15%',
          left: '26%',
          width: '22%',
          height: '15%',
          background: 'radial-gradient(closest-side, rgba(255,255,255,1), rgba(255,255,255,0))',
          transition: 'top 240ms ease',
        }}
      />
      <Icon size={iconSize} strokeWidth={2.4} color="#ffffff" className="relative" />
    </span>
  );
}
