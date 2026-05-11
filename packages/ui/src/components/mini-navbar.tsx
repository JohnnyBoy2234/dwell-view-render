import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

/** Clean nav link with sliding underline on hover */
const NavLink = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <Link
    to={to}
    className="relative text-base text-gray-300 hover:text-white transition-colors duration-200 py-0.5 group"
  >
    {children}
    <span className="absolute bottom-0 left-0 w-0 h-px bg-white/60 transition-all duration-300 group-hover:w-full" />
  </Link>
);

interface MiniNavbarProps {
  mode?: 'rent' | 'buy';
  hideLandlordActions?: boolean;
}

export function MiniNavbar({ mode = 'rent', hideLandlordActions = false }: MiniNavbarProps) {
  const { user, signOut, loading, isLandlord, isAdmin } = useAuth();

  const dashboardPath = isAdmin
    ? '/admin/dashboard'
    : isLandlord
    ? '/enhancedlandlorddashboard'
    : '/tenant-dashboard';
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [shapeClass, setShapeClass] = useState('sm:rounded-full');
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

  return (
    <header
      className={`fixed z-50 flex flex-col items-center
                  backdrop-blur-md border-b border-white/10
                  bg-[rgba(0,0,0,0.88)]
                  top-0 left-0 right-0 rounded-none px-4 py-3
                  sm:top-6 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:px-8 sm:py-3.5
                  sm:w-auto sm:min-w-[960px] sm:border sm:border-white/10
                  transition-[border-radius] duration-0 ${shapeClass}`}
      style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.07)' }}
    >
      {/* ── Desktop row ── */}
      <div className="flex items-center gap-10 w-full">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-ocean-blue flex items-center justify-center shrink-0">
            <Home className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-base tracking-tight whitespace-nowrap">
            MzanziHomes
          </span>
        </Link>

        {/* Desktop nav — centered via flex-1 + justify-center */}
        <nav className="hidden sm:flex flex-1 items-center justify-center gap-8">
          {navLinks.map((link) => (
            <NavLink key={link.to} to={link.to}>{link.label}</NavLink>
          ))}
        </nav>

        {/* Desktop auth buttons */}
        <div className="hidden sm:flex items-center gap-3 shrink-0">
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
                  className="px-5 py-2 text-sm font-semibold text-gray-900 bg-gradient-to-b from-gray-100 to-gray-300 rounded-full hover:brightness-110 transition-all duration-200 whitespace-nowrap block"
                >
                  Sign Up
                </Link>
              </>
            )
          )}
        </div>

        {/* Mobile action buttons — landlord only */}
        {!hideLandlordActions && (
          <div className="sm:hidden ml-auto flex items-center gap-1.5 shrink-0">
            <Link
              to="/listing-type"
              className="px-2.5 py-1 text-xs font-medium text-gray-300 border border-white/15 bg-white/5 rounded-full hover:text-white hover:border-white/30 transition-all duration-200 whitespace-nowrap"
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

        {/* Mobile hamburger */}
        <button
          className="sm:hidden flex items-center justify-center w-8 h-8 text-gray-300 focus:outline-none"
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
        className={`sm:hidden w-full transition-all duration-300 ease-in-out overflow-hidden
                    ${isOpen ? 'max-h-[480px] opacity-100 pt-4 pb-2' : 'max-h-0 opacity-0 pt-0 pb-0 pointer-events-none'}`}
      >
        {/* Thin separator */}
        <div className="h-px bg-white/10 mb-4" />

        {/* Mode CTA — Add Property (Rent) or List Property (Buy) — landlord only */}
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

        {/* Nav links — 2-column grid */}
        <nav className="grid grid-cols-2 gap-1 w-full mb-4">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="flex items-center justify-center px-4 py-3 rounded-xl text-sm text-gray-300 hover:text-white hover:bg-white/8 transition-colors font-medium"
              onClick={() => setIsOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Auth — side by side */}
        {!loading && (
          user ? (
            <div className="flex gap-2">
              <button
                onClick={() => { navigate(dashboardPath); setIsOpen(false); }}
                className="flex-1 py-2.5 text-sm border border-white/15 bg-white/5 text-gray-300 rounded-full hover:text-white transition-colors"
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
          ) : (
            <div className="flex gap-2">
              <Link
                to="/auth"
                className="flex-1 py-2.5 text-sm text-center border border-white/15 bg-white/5 text-gray-300 rounded-full hover:text-white transition-colors"
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
