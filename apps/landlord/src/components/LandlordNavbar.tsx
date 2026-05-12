import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface LandlordNavbarProps {
  mode?: 'rent' | 'buy';
  hideLandlordActions?: boolean;
  transparent?: boolean;
}

export function LandlordNavbar({ mode = 'rent', hideLandlordActions = false, transparent = false }: LandlordNavbarProps) {
  const { user, signOut, loading, isLandlord, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(!transparent);

  useEffect(() => {
    if (!transparent) { setScrolled(true); return; }
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [transparent]);

  const dashboardPath = isAdmin
    ? '/admin/dashboard'
    : isLandlord
    ? '/enhancedlandlorddashboard'
    : '/tenant-dashboard';

  const navLinks = [
    { label: 'Properties', to: '/properties' },
    { label: 'About',      to: '/about' },
    { label: 'Landlords',  to: '/about/landlord' },
    { label: 'Tenants',    to: '/about/tenant' },
    { label: 'Pricing',    to: '/pricing' },
  ];

  return (
    <header
      className="fixed z-50 top-0 left-0 right-0 flex items-end px-4 md:px-8"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        height: 'calc(68px + env(safe-area-inset-top))',
        transition: 'background 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease',
        background: scrolled ? 'rgba(255,255,255,0.97)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: `1px solid ${scrolled ? 'rgba(0,0,0,0.07)' : 'transparent'}`,
        boxShadow: scrolled ? '0 1px 16px rgba(0,0,0,0.06)' : 'none',
      }}
    >
      {/* Logo */}
      <Link to="/" className="flex items-center gap-3 shrink-0">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'hsl(214,100%,59%)' }}>
          <Home className="w-6 h-6 text-white" />
        </div>
        <span
          className="font-bold text-lg tracking-tight whitespace-nowrap"
          style={{
            color: scrolled ? 'hsl(222,84%,5%)' : '#fff',
            transition: 'color 0.3s ease',
          }}
        >
          MzanziHomes
        </span>
      </Link>

      {/* Desktop nav — centered */}
      <nav className="hidden md:flex flex-1 items-center justify-center gap-7">
        {navLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="text-sm font-medium transition-colors duration-200"
            style={{ color: scrolled ? 'hsl(220,9%,46%)' : 'rgba(255,255,255,0.80)' }}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {/* Right side */}
      <div className="flex items-center gap-2 ml-auto shrink-0">
        {/* Mobile: List + Add buttons (no hamburger — bottom bar handles navigation) */}
        {!hideLandlordActions && (
          <div className="flex md:hidden items-center">
            <Link
              to="/listing-type"
              className="px-5 py-2.5 text-sm font-semibold rounded-full text-white whitespace-nowrap"
              style={{ background: 'hsl(214,100%,59%)', boxShadow: '0 2px 12px rgba(37,99,235,0.35)' }}
            >
              + Add
            </Link>
          </div>
        )}

        {/* Desktop auth buttons */}
        {!loading && (
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <>
                <button
                  onClick={() => navigate(dashboardPath)}
                  className="px-4 py-2 text-sm font-medium rounded-full border transition-all duration-200"
                  style={{
                    color: scrolled ? 'hsl(220,9%,40%)' : 'rgba(255,255,255,0.82)',
                    borderColor: scrolled ? 'hsl(220,13%,88%)' : 'rgba(255,255,255,0.24)',
                  }}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => signOut()}
                  className="px-4 py-2 text-sm font-semibold rounded-full transition-all duration-200"
                  style={{
                    background: scrolled ? 'hsl(222,84%,5%)' : '#fff',
                    color: scrolled ? '#fff' : 'hsl(222,84%,5%)',
                  }}
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/auth"
                  className="px-4 py-2 text-sm font-medium transition-colors duration-200"
                  style={{ color: scrolled ? 'hsl(220,9%,40%)' : 'rgba(255,255,255,0.82)' }}
                >
                  Log In
                </Link>
                <Link
                  to="/auth"
                  className="px-4 py-2 text-sm font-semibold rounded-full text-white"
                  style={{ background: 'hsl(214,100%,59%)' }}
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
