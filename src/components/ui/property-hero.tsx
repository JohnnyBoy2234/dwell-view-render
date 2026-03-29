import React from 'react';

type Mode = 'rent' | 'buy';

interface PropertyHeroProps {
  children?: React.ReactNode;
  mode?: Mode;
  onModeChange?: (mode: Mode) => void;
}

export function PropertyHero({ children, mode = 'rent', onModeChange }: PropertyHeroProps) {
  const isRent = mode === 'rent';

  return (
    <section className="relative flex flex-col min-h-[75vh] sm:min-h-screen overflow-hidden">
      {/* ── Background image + layered gradients ── */}
      <div
        className="absolute inset-0 bg-cover sm:bg-cover bg-[center_35%] sm:bg-center"
        style={{
          backgroundImage:
            'url(https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=1920&auto=format&fit=crop)',
        }}
      >
        {/* Dark overlay — heavier at top (navbar) and bottom (search legibility) */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/35 to-black/72" />
        {/* Subtle blue colour wash to match brand */}
        <div className="absolute inset-0 bg-[hsl(214,100%,30%)] opacity-20" />
      </div>

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
            className="flex items-center mb-8 p-1 rounded-full"
            style={{
              background: 'rgba(0,0,0,0.35)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.15)',
            }}
          >
            <button
              onClick={() => onModeChange('rent')}
              className="px-6 py-2 rounded-full text-sm font-semibold transition-all duration-200"
              style={
                isRent
                  ? { background: 'hsl(214,100%,59%)', color: '#fff', boxShadow: '0 2px 12px rgba(37,99,235,0.45)' }
                  : { background: 'transparent', color: 'rgba(255,255,255,0.65)' }
              }
            >
              Rent
            </button>
            <button
              onClick={() => onModeChange('buy')}
              className="px-6 py-2 rounded-full text-sm font-semibold transition-all duration-200"
              style={
                !isRent
                  ? { background: 'hsl(214,100%,59%)', color: '#fff', boxShadow: '0 2px 12px rgba(37,99,235,0.45)' }
                  : { background: 'transparent', color: 'rgba(255,255,255,0.65)' }
              }
            >
              Buy
            </button>
          </div>
        )}

        {/* Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-[82px] font-bold text-center leading-[1.05] tracking-tight max-w-4xl mb-5" style={{ color: '#ffffff', textShadow: '0 2px 16px rgba(0,0,0,0.5)' }}>
          {isRent ? (
            <>Find Your Perfect{' '}<span style={{ color: 'hsl(214,100%,80%)' }}>Home</span>{' '}in South Africa</>
          ) : (
            <>Buy Your Dream{' '}<span style={{ color: 'hsl(214,100%,80%)' }}>Property</span>{' '}in South Africa</>
          )}
        </h1>

        {/* Sub-headline */}
        <p className="text-base sm:text-xl text-center max-w-2xl leading-relaxed mb-10" style={{ color: 'rgba(255,255,255,0.85)', textShadow: '0 1px 8px rgba(0,0,0,0.4)' }}>
          {isRent
            ? 'Verified listings. Direct landlords. Zero agent fees. RentLekker makes renting simple, safe, and transparent.'
            : 'Trusted property sales across South Africa. Browse verified listings and connect directly with sellers — no middlemen.'}
        </p>

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
      <div className="absolute bottom-7 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5 pointer-events-none">
        <div className="w-px h-10 bg-gradient-to-b from-transparent via-white/30 to-white/55" />
        <div className="w-1 h-1 rounded-full bg-white/40" />
      </div>
    </section>
  );
}
