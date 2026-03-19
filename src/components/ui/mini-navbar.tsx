import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const AnimatedNavLink = ({
  to,
  children,
}: {
  to: string;
  children: React.ReactNode;
}) => (
  <Link
    to={to}
    className="group relative inline-flex overflow-hidden h-5 items-center text-sm"
  >
    <div className="flex flex-col transition-transform duration-300 ease-out group-hover:-translate-y-1/2">
      <span className="text-gray-300">{children}</span>
      <span className="text-white">{children}</span>
    </div>
  </Link>
);

export function MiniNavbar() {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [shapeClass, setShapeClass] = useState('rounded-full');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (isOpen) {
      setShapeClass('rounded-2xl');
    } else {
      timerRef.current = setTimeout(() => setShapeClass('rounded-full'), 300);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isOpen]);

  const navLinks = [
    { label: 'Properties', to: '/properties' },
    { label: 'Landlords', to: '/about/landlord' },
    { label: 'Tenants', to: '/about/tenant' },
    { label: 'Pricing', to: '/pricing' },
  ];

  const handleDashboard = () => {
    navigate('/dashboard');
  };

  const handleSignOut = async () => {
    await signOut();
    setIsOpen(false);
  };

  return (
    <header
      className={`fixed top-5 left-1/2 z-50 flex flex-col items-center
                  -translate-x-1/2 pl-5 pr-5 py-3
                  backdrop-blur-md border border-white/10
                  bg-[rgba(10,10,20,0.62)]
                  w-[calc(100%-2rem)] sm:w-auto
                  transition-[border-radius] duration-0 ${shapeClass}`}
      style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.24), 0 1px 0 rgba(255,255,255,0.06) inset' }}
    >
      {/* ── Desktop row ── */}
      <div className="flex items-center justify-between w-full gap-x-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-ocean-blue flex items-center justify-center">
            <Home className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-sm tracking-tight hidden sm:block">
            RentLekker
          </span>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden sm:flex items-center gap-6">
          {navLinks.map((link) => (
            <AnimatedNavLink key={link.to} to={link.to}>
              {link.label}
            </AnimatedNavLink>
          ))}
        </nav>

        {/* Desktop auth buttons */}
        <div className="hidden sm:flex items-center gap-2">
          {!loading && (
            user ? (
              <>
                <button
                  onClick={handleDashboard}
                  className="px-4 py-1.5 text-sm border border-white/15 bg-white/8 text-gray-300 rounded-full hover:border-white/30 hover:text-white transition-colors duration-200"
                >
                  Dashboard
                </button>
                <button
                  onClick={handleSignOut}
                  className="px-4 py-1.5 text-sm font-semibold text-gray-900 bg-gradient-to-b from-gray-100 to-gray-300 rounded-full hover:from-white hover:to-gray-200 transition-all duration-200"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/auth"
                  className="px-4 py-1.5 text-sm border border-white/15 bg-white/8 text-gray-300 rounded-full hover:border-white/30 hover:text-white transition-colors duration-200"
                >
                  Log In
                </Link>
                <div className="relative group">
                  <div className="absolute inset-0 -m-1.5 rounded-full bg-white/20 opacity-0 blur-lg group-hover:opacity-40 transition-all duration-300 pointer-events-none" />
                  <Link
                    to="/auth"
                    className="relative z-10 px-4 py-1.5 text-sm font-semibold text-gray-900 bg-gradient-to-b from-gray-100 to-gray-300 rounded-full hover:from-white hover:to-gray-200 transition-all duration-200 block"
                  >
                    Sign Up
                  </Link>
                </div>
              </>
            )
          )}
        </div>

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
        className={`sm:hidden flex flex-col items-center w-full transition-all duration-300 ease-in-out overflow-hidden
                    ${isOpen ? 'max-h-[400px] opacity-100 pt-4' : 'max-h-0 opacity-0 pt-0 pointer-events-none'}`}
      >
        <nav className="flex flex-col items-center gap-4 w-full">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-gray-300 hover:text-white transition-colors text-center w-full text-sm"
              onClick={() => setIsOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-col items-center gap-3 mt-5 w-full pb-1">
          {!loading && (
            user ? (
              <>
                <button
                  onClick={handleDashboard}
                  className="w-full py-2 text-sm border border-white/15 bg-white/8 text-gray-300 rounded-full hover:text-white transition-colors"
                >
                  Dashboard
                </button>
                <button
                  onClick={handleSignOut}
                  className="w-full py-2 text-sm font-semibold text-gray-900 bg-gradient-to-b from-gray-100 to-gray-300 rounded-full"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/auth"
                  className="w-full py-2 text-sm text-center border border-white/15 bg-white/8 text-gray-300 rounded-full hover:text-white transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  Log In
                </Link>
                <Link
                  to="/auth"
                  className="w-full py-2 text-sm font-semibold text-center text-gray-900 bg-gradient-to-b from-gray-100 to-gray-300 rounded-full"
                  onClick={() => setIsOpen(false)}
                >
                  Sign Up
                </Link>
              </>
            )
          )}
        </div>
      </div>
    </header>
  );
}
