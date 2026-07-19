import * as React from 'react';
import { cn } from '@mzanzihomes/common/lib/utils';

// Glossy candy-button finishes: one vibrant, saturated colour each, shaded as a
// sphere (bright crown, dark rim) with a big top crescent gloss. Pure white
// icon, no border — the edge is created by lighting and curvature alone.
export interface GlossyTone {
  light: string;
  base: string;
  dark: string;
}

export const GLOSSY_TONES: Record<string, GlossyTone> = {
  blue:     { light: '#6ea0ff', base: '#1f5fe0', dark: '#0e37a3' },
  green:    { light: '#5fd06f', base: '#1aa33a', dark: '#0d6b23' },
  red:      { light: '#ff6b5e', base: '#e01414', dark: '#9c0d0d' },
  orange:   { light: '#ffa25a', base: '#f26a12', dark: '#a8430a' },
  gold:     { light: '#ffd85e', base: '#f9c010', dark: '#b88900' },
  pink:     { light: '#ff77ac', base: '#ec2e7a', dark: '#a30f4e' },
  purple:   { light: '#bd6bef', base: '#8f1fd6', dark: '#5c0f97' },
  teal:     { light: '#5fe0c8', base: '#14b39a', dark: '#0a7566' },
  lime:     { light: '#aee65c', base: '#7ac91a', dark: '#4f8710' },
  sky:      { light: '#66cdf4', base: '#16a7e8', dark: '#0a6ea3' },
  navy:     { light: '#6b5fd6', base: '#2a1f9e', dark: '#16106b' },
  coral:    { light: '#ff9a8f', base: '#f0665e', dark: '#b23a33' },
  fuchsia:  { light: '#e86bf0', base: '#cc2ad6', dark: '#8a1493' },
  amber:    { light: '#ffc860', base: '#f5a012', dark: '#b06e00' },
  darkteal: { light: '#4fa5ad', base: '#14707a', dark: '#0a4750' },
  violet:   { light: '#a878f2', base: '#7a3fe0', dark: '#4c1fa3' },
  spring:   { light: '#66e6b4', base: '#22c98f', dark: '#12855c' },
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

/** A single glossy candy button with a centred white icon. */
export function GlossyIcon({ tone, icon: Icon, size = 54, pressed = false, className }: GlossyIconProps) {
  const { light, base, dark } = tone;
  const iconSize = Math.round(size * 0.44);

  return (
    <span
      aria-hidden="true"
      className={cn('relative inline-flex shrink-0 items-center justify-center rounded-full', className)}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(115% 115% at 50% 40%, ${light} 0%, ${base} 54%, ${dark} 100%)`,
        boxShadow: pressed
          ? `inset 0 -4px 8px rgba(0,0,0,0.28),
             inset 0 3px 6px rgba(255,255,255,0.20),
             0 3px 8px -3px ${dark}99,
             0 1px 3px rgba(0,0,0,0.18)`
          : `inset 0 -7px 12px rgba(0,0,0,0.24),
             inset 0 4px 8px rgba(255,255,255,0.22),
             0 9px 18px -5px ${dark}8c,
             0 3px 6px rgba(0,0,0,0.14)`,
        transform: pressed ? 'scale(0.96)' : 'scale(1)',
        filter: pressed ? 'brightness(0.95) saturate(1.05)' : 'none',
        transition:
          'transform 220ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 200ms ease, filter 150ms ease',
        willChange: 'transform',
      }}
    >
      {/* Big top crescent gloss */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute"
        style={{
          top: '7%',
          left: '13%',
          width: '74%',
          height: '42%',
          borderRadius: '50%',
          background: 'linear-gradient(to bottom, rgba(255,255,255,0.94) 0%, rgba(255,255,255,0.55) 32%, rgba(255,255,255,0) 100%)',
        }}
      />
      {/* Bright top-left flare */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute rounded-full"
        style={{
          top: '13%',
          left: '20%',
          width: '24%',
          height: '15%',
          background: 'radial-gradient(closest-side, rgba(255,255,255,1), rgba(255,255,255,0))',
        }}
      />
      <Icon size={iconSize} strokeWidth={2.4} color="#ffffff" className="relative" />
    </span>
  );
}
