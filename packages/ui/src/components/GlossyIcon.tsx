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
        // Liquid glass: a bright glassy crown highlight, light transmitting up
        // through the lower edge, a luminous coloured body and a bright glass
        // rim — translucent and wet rather than an opaque marble.
        background: `
          radial-gradient(46% 36% at 30% 20%, rgba(255,255,255,1) 0%, rgba(255,255,255,0.5) 38%, rgba(255,255,255,0) 66%),
          radial-gradient(68% 46% at 50% 108%, rgba(255,255,255,0.7), rgba(255,255,255,0) 60%),
          radial-gradient(120% 118% at 42% 36%, ${light} 0%, ${base} 58%, ${dark} 100%)
        `,
        boxShadow: pressed
          ? `inset 0 0 0 1.2px rgba(255,255,255,0.3),
             inset 0 2px 5px rgba(255,255,255,0.5),
             inset 0 -5px 10px rgba(0,0,0,0.22),
             0 4px 10px -4px ${base}80,
             0 1px 3px rgba(0,0,0,0.14)`
          : `inset 0 0 0 1.4px rgba(255,255,255,0.35),
             inset 0 3px 7px rgba(255,255,255,0.6),
             inset 0 -9px 15px rgba(0,0,0,0.20),
             0 8px 18px -5px ${base}75,
             0 2px 5px rgba(0,0,0,0.12)`,
        transform: pressed ? 'scale(0.97)' : 'scale(1)',
        filter: pressed ? 'brightness(0.97) saturate(1.06)' : 'none',
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
