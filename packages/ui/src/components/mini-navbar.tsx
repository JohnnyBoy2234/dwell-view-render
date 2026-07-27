import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';
import { useAuth } from '@mzanzihomes/supabase/hooks/useAuth';

interface MiniNavbarProps {
  mode?: 'rent' | 'buy';
  hideLandlordActions?: boolean;
  transparent?: boolean;
  minimal?: boolean;
}

export function MiniNavbar({ mode = 'rent', hideLandlordActions: hideLandlordActionsProp = false, transparent = false, minimal = false }: MiniNavbarProps) {
  const { user, signOut, loading, isLandlord, isAdmin } = useAuth();
  // Listing controls (List / Add Property) are landlord-only. Hide them for
  // signed-in tenants by role, not just when a caller remembers to pass the
  // prop — tenants must never see landlord listing actions (§3.1).
  const hideLandlordActions = hideLandlordActionsProp || (!!user && !isLandlord && !isAdmin);

  const dashboardPath = isAdmin
    ? '/admin/dashboard'
    : isLandlord
    ? '/enhancedlandlorddashboard'
    : '/tenant-dashboard';
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [shapeClass, setShapeClass] = useState('sm:rounded-full');
  const [scrolled, setScrolled] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (isOpen) {
      setShapeClass('sm:rounded-2xl');
    } else {
      timerRef.current = setTimeout(() => setShapeClass('sm:rounded-full'), 300);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isOpen]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { label: 'Properties', to: '/properties' },
    { label: 'About',      to: '/about' },
    { label: 'Landlords',  to: '/about/landlord' },
    { label: 'Tenants',    to: '/about/tenant' },
    { label: 'Pricing',    to: '/pricing' },
  ];

  const handleSignOut = async () => {
    await signOut();
    setIsOpen(false);
  };

  // Mobile: white when scrolled, transparent/dark when not.
  // Desktop (sm+): always dark floating pill.
  const mobileBg = scrolled
    ? 'bg-white border-gray-200 shadow-sm'
    : transparent && !isOpen
    ? 'bg-transparent border-transparent'
    : 'bg-[rgba(0,0,0,0.88)] border-white/10';

  const logoTextColor   = scrolled ? 'text-gray-900 sm:text-white' : 'text-white';
  const hamburgerColor  = scrolled ? 'text-gray-700 sm:text-gray-300' : 'text-gray-300';
  const dropdownBg      = scrolled ? 'bg-white' : '';
  const dropdownDivider = scrolled ? 'bg-gray-200' : 'bg-white/10';
  const dropdownLink    = scrolled
    ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
    : 'text-gray-300 hover:text-white hover:bg-white/8';

  return (
    <header
      className={`fixed z-50 flex flex-col backdrop-blur-md
                  top-4 left-2 right-2 rounded-xl px-4 py-3 border
                  sm:top-6 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:px-8 sm:py-3.5
                  sm:w-auto sm:min-w-[960px] sm:rounded-full
                  sm:bg-[rgba(0,0,0,0.78)] sm:border-white/10
                  transition-all duration-300 ${shapeClass} ${mobileBg}`}
      style={{
        // Drops below the tenant rent-due banner while it's visible (var is 0px otherwise)
        marginTop: 'var(--rent-banner-h, 0px)',
        ...(scrolled
          ? { boxShadow: '0 2px 16px rgba(0,0,0,0.08)' }
          : transparent && !isOpen && !scrolled
          ? {}
          : { boxShadow: '0 8px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.07)' }),
      }}
    >
      {/* ── Main row ── */}
      <div className="flex items-center gap-3 w-full">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-ocean-blue flex items-center justify-center shrink-0">
            <Home className="w-5 h-5 text-white" />
          </div>
          <span className={`font-bold text-base tracking-tight whitespace-nowrap transition-colors duration-300 ${logoTextColor}`}>
            MzanziHomes
          </span>
        </Link>

        {/* Desktop nav — centered */}
        {!minimal && (
          <nav className="hidden sm:flex flex-1 items-center justify-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="relative text-base text-gray-300 hover:text-white transition-colors duration-200 py-0.5 group"
              >
                {link.label}
                <span className="absolute bottom-0 left-0 w-0 h-px bg-white/60 transition-all duration-300 group-hover:w-full" />
              </Link>
            ))}
          </nav>
        )}

        {/* Desktop auth buttons */}
        <div className={`hidden sm:flex items-center gap-3 shrink-0 ${minimal ? 'ml-auto' : ''}`}>
          {!loading && (
            user ? (
              <>
                <button
                  onClick={() => navigate(dashboardPath)}
                  className="px-5 py-2 text-sm border border-white/15 bg-white/5 text-gray-300 rounded-full hover:border-white/35 hover:text-white transition-all duration-200 whitespace-nowrap"
                >
                  Dashboard
                </button>
                <button
                  onClick={handleSignOut}
                  className="px-5 py-2 text-sm font-semibold text-gray-900 bg-gradient-to-b from-gray-100 to-gray-300 rounded-full hover:brightness-110 transition-all duration-200 whitespace-nowrap"
                >
                  Sign Out
                </button>
              </>
            ) : minimal ? (
              <Link
                to="/auth"
                className="px-5 py-2 text-sm font-semibold text-gray-900 bg-gradient-to-b from-gray-100 to-gray-300 rounded-full hover:brightness-110 transition-all duration-200 whitespace-nowrap"
              >
                Sign In
              </Link>
            ) : (
              <>
                <Link
                  to="/auth"
                  className="px-5 py-2 text-sm border border-white/15 bg-white/5 text-gray-300 rounded-full hover:border-white/35 hover:text-white transition-all duration-200 whitespace-nowrap"
                >
                  Log In
                </Link>
                <Link
                  to="/auth"
                  className="px-5 py-2 text-sm font-semibold text-gray-900 bg-gradient-to-b from-gray-100 to-gray-300 rounded-full hover:brightness-110 transition-all duration-200 whitespace-nowrap"
                >
                  Sign Up
                </Link>
              </>
            )
          )}
        </div>

        {/* Mobile: landlord CTAs */}
        {!hideLandlordActions && (
          <div className="sm:hidden flex items-center gap-1.5 shrink-0">
            <Link
              to="/listing-type"
              className={`px-2.5 py-1 text-xs font-medium border rounded-full transition-all duration-200 whitespace-nowrap
                ${scrolled ? 'text-gray-600 border-gray-300 hover:text-gray-900' : 'text-gray-300 border-white/15 bg-white/5 hover:text-white hover:border-white/30'}`}
            >
              List
            </Link>
            <Link
              to="/listing-type"
              className="px-2.5 py-1 text-xs font-semibold text-white rounded-full whitespace-nowrap"
              style={{ background: 'hsl(214,100%,59%)' }}
            >
              + Add
            </Link>
          </div>
        )}

        {/* Mobile hamburger — always pushed to the right */}
        <button
          className={`sm:hidden ml-auto flex items-center justify-center w-8 h-8 focus:outline-none transition-colors duration-300 ${hamburgerColor}`}
          onClick={() => setIsOpen((v) => !v)}
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
        >
          {isOpen ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* ── Mobile dropdown ── */}
      <div
        className={`sm:hidden w-full transition-all duration-300 ease-in-out overflow-hidden ${dropdownBg}
                    ${isOpen ? 'max-h-[480px] opacity-100 pt-4 pb-2' : 'max-h-0 opacity-0 pt-0 pb-0 pointer-events-none'}`}
      >
        <div className={`h-px mb-4 ${dropdownDivider}`} />

        {!hideLandlordActions && (
          <Link
            to={mode === 'buy' ? '/list-sale' : '/listing-type'}
            className="flex items-center justify-center w-full py-2.5 mb-3 text-sm font-semibold rounded-full transition-all duration-200"
            style={{ background: 'hsl(214,100%,59%)', color: '#fff' }}
            onClick={() => setIsOpen(false)}
          >
            {mode === 'buy' ? 'List Property' : 'Add Property'}
          </Link>
        )}

        {!minimal && (
          <nav className="grid grid-cols-2 gap-1 w-full mb-4">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center justify-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${dropdownLink}`}
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}

        {!loading && (
          user ? (
            <div className="flex gap-2">
              <button
                onClick={() => { navigate(dashboardPath); setIsOpen(false); }}
                className={`flex-1 py-2.5 text-sm rounded-full transition-colors border
                  ${scrolled ? 'border-gray-200 text-gray-700 hover:text-gray-900' : 'border-white/15 bg-white/5 text-gray-300 hover:text-white'}`}
              >
                Dashboard
              </button>
              <button
                onClick={handleSignOut}
                className="flex-1 py-2.5 text-sm font-semibold text-gray-900 bg-gradient-to-b from-gray-100 to-gray-300 rounded-full"
              >
                Sign Out
              </button>
            </div>
          ) : minimal ? (
            <Link
              to="/auth"
              className="block w-full py-2.5 text-sm font-semibold text-center text-gray-900 bg-gradient-to-b from-gray-100 to-gray-300 rounded-full"
              onClick={() => setIsOpen(false)}
            >
              Sign In
            </Link>
          ) : (
            <div className="flex gap-2">
              <Link
                to="/auth"
                className={`flex-1 py-2.5 text-sm text-center rounded-full transition-colors border
                  ${scrolled ? 'border-gray-200 text-gray-700 hover:text-gray-900' : 'border-white/15 bg-white/5 text-gray-300 hover:text-white'}`}
                onClick={() => setIsOpen(false)}
              >
                Log In
              </Link>
              <Link
                to="/auth"
                className="flex-1 py-2.5 text-sm font-semibold text-center text-gray-900 bg-gradient-to-b from-gray-100 to-gray-300 rounded-full"
                onClick={() => setIsOpen(false)}
              >
                Sign Up
              </Link>
            </div>
          )
        )}
      </div>
    </header>
  );
}
