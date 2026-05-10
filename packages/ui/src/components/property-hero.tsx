import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

type Mode = 'rent' | 'buy';

const heroImages: Record<Mode, string> = {
  rent: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=1920&auto=format&fit=crop',
  buy:  'https://images.unsplash.com/photo-1600210492493-0946911123ea?q=80&w=1920&auto=format&fit=crop',
};

const heroMobileBgPosition: Record<Mode, string> = {
  rent: 'center 35%',
  buy:  'center 50%',
};

const heroMobileBgSize: Record<Mode, string> = {
  rent: 'cover',
  buy:  'cover',
};

const heroCopy: Record<Mode, { headline: React.ReactNode; subtext: string }> = {
  rent: {
    headline: <>Find Your Perfect{' '}<span style={{ color: 'hsl(214,100%,80%)' }}>Home</span>{' '}in South Africa</>,
    subtext: 'Verified listings. Direct landlords. Zero agent fees. MzanziHomes makes renting simple, safe, and transparent.',
  },
  buy: {
    headline: <>Buy Your Dream{' '}<span style={{ color: 'hsl(214,100%,80%)' }}>Property</span>{' '}in South Africa</>,
    subtext: 'Trusted property sales across South Africa. Browse verified listings and connect directly with sellers. No middlemen.',
  },
};

interface PropertyHeroProps {
  children?: React.ReactNode;
  mode?: Mode;
  onModeChange?: (mode: Mode) => void;
}

export function PropertyHero({ children, mode = 'rent', onModeChange }: PropertyHeroProps) {
  return (
    <section className="relative flex flex-col min-h-screen overflow-hidden">
      {/* ── Background image — zoom-fade on mode change ── */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={mode}
          className="absolute inset-0 sm:!bg-cover sm:!bg-center"
          style={{
            backgroundImage: `url(${heroImages[mode]})`,
            backgroundSize: heroMobileBgSize[mode],
            backgroundPosition: heroMobileBgPosition[mode],
            backgroundRepeat: 'no-repeat',
          }}
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/35 to-black/72" />
          {/* Blue wash */}
          <div className="absolute inset-0 bg-[hsl(214,100%,30%)] opacity-20" />
        </motion.div>
      </AnimatePresence>

      {/* ── Vertical grid lines (decorative) ── */}
      <div className="absolute inset-0 z-10 pointer-events-none hidden sm:block">
        <div className="grid w-full grid-cols-12 divide-x divide-white/[0.07] h-full">
          <div className="col-span-1 h-full" />
          <div className="col-span-3 h-full" />
          <div className="col-span-4 h-full" />
          <div className="col-span-3 h-full" />
          <div className="col-span-1 h-full" />
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="relative z-20 flex flex-col flex-1 items-center justify-center px-5 sm:px-8 pt-28 pb-14 sm:pb-20">

        {/* Rent / Buy toggle */}
        {onModeChange && (
          <div
            role="group"
            aria-label="View mode"
            className="flex items-center mb-8 p-1 rounded-full"
            style={{
              background: 'rgba(0,0,0,0.35)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.15)',
            }}
          >
            {(['rent', 'buy'] as const).map((m) => (
              <button
                key={m}
                onClick={() => onModeChange(m)}
                aria-pressed={mode === m}
                className="relative px-6 py-2 rounded-full text-sm font-semibold transition-colors duration-200 z-10"
                style={{ color: mode === m ? '#fff' : 'rgba(255,255,255,0.65)', background: 'transparent' }}
              >
                {mode === m && (
                  <motion.div
                    layoutId="hero-mode-indicator"
                    className="absolute inset-0 rounded-full"
                    style={{ background: 'hsl(214,100%,59%)', boxShadow: '0 2px 12px rgba(37,99,235,0.45)' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 capitalize">{m}</span>
              </button>
            ))}
          </div>
        )}

        {/* Headline + Sub-headline — fade-up on mode change */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={mode}
            className="flex flex-col items-center"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1
              className="text-5xl sm:text-7xl lg:text-[100px] font-bold text-center leading-[1.05] tracking-tight max-w-5xl mb-5"
              style={{ color: '#ffffff', textShadow: '0 2px 16px rgba(0,0,0,0.5)' }}
            >
              {heroCopy[mode].headline}
            </h1>
            <p
              className="text-base sm:text-xl text-center max-w-2xl leading-relaxed mb-10"
              style={{ color: 'rgba(255,255,255,0.85)', textShadow: '0 1px 8px rgba(0,0,0,0.4)' }}
            >
              {heroCopy[mode].subtext}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Search widget slot */}
        {children && (
          <div className="w-full max-w-4xl">
            {/* Mobile: dark frosted wrapper for visibility against hero image */}
            <div
              className="sm:hidden rounded-2xl p-3"
              style={{
                background: 'rgba(0,0,0,0.45)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.12)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
              }}
            >
              {children}
            </div>
            {/* Desktop: no wrapper */}
            <div className="hidden sm:block">{children}</div>
          </div>
        )}

      </div>

      {/* ── Scroll cue ── */}
      <div aria-hidden="true" className="absolute bottom-7 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5 pointer-events-none">
        <div className="w-px h-10 bg-gradient-to-b from-transparent via-white/30 to-white/55" />
        <div className="w-1 h-1 rounded-full bg-white/40" />
      </div>
    </section>
  );
}
