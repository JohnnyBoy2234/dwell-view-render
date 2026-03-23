import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PropertyHeroProps {
  children?: React.ReactNode;
}

export function PropertyHero({ children }: PropertyHeroProps) {
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

        {/* Badge */}
        <div
          className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-7 backdrop-blur-sm"
          style={{
            background: 'rgba(255,255,255,0.10)',
            border: '1px solid rgba(255,255,255,0.22)',
          }}
        >
          <span className="w-2 h-2 rounded-full bg-[hsl(142,72%,50%)] animate-pulse shrink-0" />
          <span className="text-sm font-semibold text-white/90 tracking-wide">
            Commission-Free Rentals
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-[82px] font-bold text-white text-center leading-[1.05] tracking-tight max-w-4xl mb-5">
          Find Your Perfect{' '}
          <span style={{ color: 'hsl(214,100%,75%)' }}>Home</span>{' '}
          in South Africa
        </h1>

        {/* Sub-headline */}
        <p className="text-base sm:text-xl text-white/65 text-center max-w-2xl leading-relaxed mb-10">
          Verified listings. Direct landlords. Zero agent fees.
          RentLekker makes renting simple, safe, and transparent.
        </p>

        {/* Search widget slot */}
        {children && (
          <div className="w-full max-w-4xl">
            {/* Mobile: frosted glass wrapper so search reads against the image */}
            <div
              className="sm:hidden rounded-2xl p-3 mb-0"
              style={{
                background: 'rgba(255,255,255,0.10)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.20)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.20)',
              }}
            >
              {children}
            </div>
            {/* Desktop: no wrapper */}
            <div className="hidden sm:block">{children}</div>
          </div>
        )}

        {/* Secondary CTA link */}
        <Link
          to="/list-property"
          className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-white/55 hover:text-white/90 transition-colors duration-200 group"
        >
          List your property — it's free
          <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* ── Scroll cue ── */}
      <div className="absolute bottom-7 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5 pointer-events-none">
        <div className="w-px h-10 bg-gradient-to-b from-transparent via-white/30 to-white/55" />
        <div className="w-1 h-1 rounded-full bg-white/40" />
      </div>
    </section>
  );
}
