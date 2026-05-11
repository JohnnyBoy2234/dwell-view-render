import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Menu, X, ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { motion, AnimatePresence } from 'motion/react';

const NAV_LINKS = [
  { label: 'Properties', to: '/properties' },
  { label: 'About',      to: '/about' },
  { label: 'Landlords',  to: '/about/landlord' },
  { label: 'Tenants',    to: '/about/tenant' },
  { label: 'Pricing',    to: '/pricing' },
];

interface WebNavbarProps {
  mode?: 'rent' | 'buy';
  hideLandlordActions?: boolean;
  transparent?: boolean;
}

export function WebNavbar({ hideLandlordActions = false, transparent = false }: WebNavbarProps) {
  const { user, signOut, loading, isLandlord, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(!transparent);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!transparent) { setScrolled(true); return; }
    const onScroll = () => setScrolled(window.scrollY > 64);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [transparent]);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const dashboardPath = isAdmin
    ? '/admin/dashboard'
    : isLandlord
    ? '/enhancedlandlorddashboard'
    : '/tenant-dashboard';

  const handleSignOut = async () => {
    await signOut();
    setMobileOpen(false);
  };

  const isActive = (to: string) =>
    location.pathname === to ||
    (to.length > 1 && location.pathname.startsWith(to + '/') && to !== '/about');

  // True when we should show the welcome/centered-logo state
  const showWelcome = transparent && !scrolled;

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          transition: 'background 0.4s ease, box-shadow 0.4s ease, border-color 0.4s ease',
          background: scrolled ? 'rgba(255,255,255,0.97)' : 'transparent',
          backdropFilter: scrolled ? 'blur(24px)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(24px)' : 'none',
          borderBottom: `1px solid ${scrolled ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)'}`,
          boxShadow: scrolled ? '0 1px 24px rgba(0,0,0,0.06)' : 'none',
        }}
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-8 flex items-center h-[72px] gap-6">

          {/* ── Mobile logo — always visible on mobile ── */}
          <Link to="/" className="flex md:hidden items-center gap-3 shrink-0">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'hsl(214,100%,59%)' }}
            >
              <Home className="w-6 h-6 text-white" />
            </div>
            <span
              className="font-bold text-[17px] tracking-tight whitespace-nowrap"
              style={{ color: '#fff', transition: 'color 0.4s ease' }}
            >
              MzanziHomes
            </span>
          </Link>

          {/* ── Desktop logo — invisible placeholder when welcome state active ── */}
          <Link
            to="/"
            className="hidden md:flex items-center gap-3 shrink-0"
            style={{
              opacity: showWelcome ? 0 : 1,
              pointerEvents: showWelcome ? 'none' : 'auto',
              transition: 'opacity 0.35s ease',
            }}
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'hsl(214,100%,59%)' }}
            >
              <Home className="w-6 h-6 text-white" />
            </div>
            <span
              className="font-bold text-[17px] tracking-tight whitespace-nowrap"
              style={{
                color: scrolled ? 'hsl(222,84%,5%)' : '#fff',
                transition: 'color 0.4s ease',
              }}
            >
              MzanziHomes
            </span>
          </Link>

          {/* ── Center: welcome with big logo  ↔  nav links ── */}
          <div className="hidden md:flex flex-1 items-center justify-center">
            <AnimatePresence mode="wait" initial={false}>
              {showWelcome ? (
                <motion.div
                  key="welcome"
                  className="flex items-center gap-4"
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Link to="/">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
                      style={{
                        background: 'hsl(214,100%,59%)',
                        boxShadow: '0 8px 24px rgba(37,99,235,0.40)',
                      }}
                    >
                      <Home className="w-7 h-7 text-white" />
                    </div>
                  </Link>
                  <div className="flex flex-col">
                    <span
                      className="text-xs font-semibold uppercase tracking-widest leading-none mb-1"
                      style={{ color: 'rgba(255,255,255,0.55)' }}
                    >
                      Welcome to
                    </span>
                    <span
                      className="text-2xl font-bold leading-none tracking-tight"
                      style={{ color: '#ffffff' }}
                    >
                      MzanziHomes
                    </span>
                  </div>
                </motion.div>
              ) : (
                <motion.nav
                  key="links"
                  className="flex items-center gap-0.5"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                >
                  {NAV_LINKS.map(({ label, to }) => {
                    const active = isActive(to);
                    return (
                      <Link
                        key={to}
                        to={to}
                        className="relative px-3.5 py-2 rounded-lg text-[15px] font-medium"
                        style={{
                          transition: 'color 0.2s ease',
                          color: active
                            ? scrolled ? 'hsl(214,100%,50%)' : '#fff'
                            : scrolled
                            ? 'hsl(220,9%,46%)'
                            : 'rgba(255,255,255,0.72)',
                        }}
                      >
                        {active && (
                          <motion.div
                            layoutId="web-nav-active"
                            className="absolute inset-0 rounded-lg"
                            style={{
                              background: scrolled
                                ? 'hsl(214,100%,96%)'
                                : 'rgba(255,255,255,0.14)',
                            }}
                            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                          />
                        )}
                        <span className="relative">{label}</span>
                      </Link>
                    );
                  })}
                </motion.nav>
              )}
            </AnimatePresence>
          </div>

          {/* ── Desktop auth ── */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            {!loading && (
              user ? (
                <>
                  <button
                    onClick={() => navigate(dashboardPath)}
                    className="px-4 py-2 text-sm font-medium rounded-full"
                    style={{
                      transition: 'color 0.4s ease, border-color 0.4s ease',
                      color: scrolled ? 'hsl(220,9%,40%)' : 'rgba(255,255,255,0.82)',
                      border: `1px solid ${scrolled ? 'hsl(220,13%,88%)' : 'rgba(255,255,255,0.24)'}`,
                    }}
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="px-4 py-2 text-sm font-semibold rounded-full"
                    style={{
                      transition: 'background 0.4s ease, color 0.4s ease',
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
                    className="px-4 py-2 text-sm font-medium"
                    style={{
                      transition: 'color 0.4s ease',
                      color: scrolled ? 'hsl(220,9%,40%)' : 'rgba(255,255,255,0.82)',
                    }}
                  >
                    Log In
                  </Link>
                  <Link
                    to="/auth"
                    className="px-5 py-2 text-sm font-semibold rounded-full whitespace-nowrap"
                    style={{
                      transition: 'background 0.4s ease, color 0.4s ease, box-shadow 0.4s ease',
                      background: scrolled ? 'hsl(214,100%,59%)' : '#fff',
                      color: scrolled ? '#fff' : 'hsl(214,100%,44%)',
                      boxShadow: scrolled ? '0 2px 12px rgba(37,99,235,0.28)' : 'none',
                    }}
                  >
                    Sign Up
                  </Link>
                </>
              )
            )}
          </div>

          {/* ── Mobile hamburger ── */}
          <button
            className="md:hidden ml-auto flex items-center justify-center w-9 h-9 rounded-lg"
            style={{ color: scrolled ? 'hsl(222,84%,5%)' : '#fff', transition: 'color 0.4s ease' }}
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            <AnimatePresence mode="wait" initial={false}>
              {mobileOpen ? (
                <motion.div key="x" initial={{ opacity: 0, rotate: -90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: 90 }} transition={{ duration: 0.15 }}>
                  <X className="w-5 h-5" />
                </motion.div>
              ) : (
                <motion.div key="menu" initial={{ opacity: 0, rotate: 90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: -90 }} transition={{ duration: 0.15 }}>
                  <Menu className="w-5 h-5" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>
      </header>

      {/* ── Mobile menu ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="mobile-nav"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-[72px] left-0 right-0 z-40 md:hidden"
            style={{
              background: 'rgba(255,255,255,0.99)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              borderBottom: '1px solid rgba(0,0,0,0.06)',
              boxShadow: '0 20px 48px rgba(0,0,0,0.10)',
            }}
          >
            <nav className="px-4 pt-3 pb-2 flex flex-col gap-0.5">
              {NAV_LINKS.map(({ label, to }, i) => (
                <motion.div
                  key={to}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.18 }}
                >
                  <Link
                    to={to}
                    className="flex items-center justify-between px-4 py-3.5 rounded-xl text-[15px] font-medium transition-colors"
                    style={{
                      color: isActive(to) ? 'hsl(214,100%,50%)' : 'hsl(222,47%,11%)',
                      background: isActive(to) ? 'hsl(214,100%,96%)' : 'transparent',
                    }}
                    onClick={() => setMobileOpen(false)}
                  >
                    {label}
                    <ChevronRight className="w-4 h-4 opacity-20" />
                  </Link>
                </motion.div>
              ))}
            </nav>

            <div className="px-4 pb-5 pt-3 border-t border-gray-100 flex flex-col gap-2.5">
              {!loading && (
                user ? (
                  <>
                    <button
                      onClick={() => { navigate(dashboardPath); setMobileOpen(false); }}
                      className="w-full py-3.5 rounded-xl text-sm font-medium border border-gray-200 text-slate-700 hover:bg-gray-50 transition-colors"
                    >
                      Dashboard
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="w-full py-3.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity"
                      style={{ background: 'hsl(214,100%,59%)' }}
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/auth"
                      className="w-full py-3.5 rounded-xl text-sm font-medium text-center border border-gray-200 text-slate-700 hover:bg-gray-50 transition-colors block"
                      onClick={() => setMobileOpen(false)}
                    >
                      Log In
                    </Link>
                    <Link
                      to="/auth"
                      className="w-full py-3.5 rounded-xl text-sm font-bold text-center text-white hover:opacity-90 transition-opacity block"
                      style={{ background: 'hsl(214,100%,59%)', boxShadow: '0 4px 16px rgba(37,99,235,0.30)' }}
                      onClick={() => setMobileOpen(false)}
                    >
                      Sign Up
                    </Link>
                  </>
                )
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
