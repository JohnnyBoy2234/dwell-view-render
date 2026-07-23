/**
 * Shared theme for the Applications / Rental Application flow.
 *
 * The Applications module owns the warm **orange** feature accent across the
 * whole journey (invitation hero, progress banner, step indicators, status
 * accents, primary buttons). Use it strategically on a clean light background —
 * never flood the screen orange. Import these tokens instead of hard-coding
 * `#f97316` in individual components so the accent stays consistent.
 */
export const applicationTheme = {
  /** Primary feature accent — buttons, active steps, key highlights. */
  primary: '#F97316',
  /** Pressed / hover / strong emphasis. */
  primaryDark: '#C2410C',
  /** Deep text on light orange grounds (e.g. banner copy). */
  text: '#7C2D12',
  /** Very light tint for banners, hero backgrounds, info panels. */
  primaryLight: '#FFF7ED',
  /** Slightly stronger tint for filled chips / soft badges. */
  primarySoft: '#FFEDD5',
  /** Hairline borders on orange surfaces. */
  border: '#FED7AA',
  /** Muted supporting text on light grounds. */
  muted: '#9A6A4A',
} as const;

export type ApplicationTheme = typeof applicationTheme;

/** Inline style helpers for the most common patterns. */
export const applicationStyles = {
  /** Slim progress / info banner. */
  banner: {
    background: applicationTheme.primaryLight,
    border: `1px solid ${applicationTheme.border}`,
    color: applicationTheme.text,
  },
  /** Primary CTA. */
  primaryButton: {
    background: applicationTheme.primary,
    color: '#ffffff',
  },
  /** Non-interactive info chip. */
  chip: {
    background: applicationTheme.primarySoft,
    color: applicationTheme.primaryDark,
  },
} as const;
