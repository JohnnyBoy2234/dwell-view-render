import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Building2, FileText, Users, BarChart3, ArrowRight, Shield, CheckCircle, LucideProps } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Feature {
  icon: React.FC<LucideProps>;
  title: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    icon: Building2,
    title: 'List & Manage Properties',
    description: 'Publish listings, manage viewings and track applications from one place.',
  },
  {
    icon: Users,
    title: 'Tenant Management',
    description: 'Screen, invite and communicate with tenants. No spreadsheets, no chaos.',
  },
  {
    icon: FileText,
    title: 'Digital Leases & Payments',
    description: 'Sign contracts, collect rent and generate invoices — all in-app.',
  },
  {
    icon: BarChart3,
    title: 'Financial Overview',
    description: 'Track income, expenses and occupancy across your entire portfolio.',
  },
];

const TRUST_POINTS = [
  'Commission-free — keep 100% of your rental income',
  'Legally binding e-signatures',
  'Automated rent tracking & invoicing',
];

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/enhancedlandlorddashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: 'linear-gradient(160deg, #0a0f1e 0%, #0d1630 55%, #0c1a2e 100%)',
      }}
    >
      {/* ── Top bar ── */}
      <header className="flex items-center justify-between px-6 pt-safe-top pb-4 pt-12">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'hsl(214,100%,59%)' }}
          >
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">MzanziHomes</span>
        </div>
        <Link
          to="/auth"
          className="text-sm text-white/60 hover:text-white transition-colors font-medium"
        >
          Sign in
        </Link>
      </header>

      {/* ── Hero ── */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
        {/* Eyebrow */}
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest mb-8"
          style={{
            background: 'rgba(30,144,255,0.12)',
            border: '1px solid rgba(30,144,255,0.25)',
            color: 'hsl(214,100%,75%)',
          }}
        >
          <Shield className="w-3.5 h-3.5" />
          Property Dashboard
        </div>

        {/* Headline */}
        <h1
          className="text-4xl sm:text-5xl font-bold leading-tight tracking-tight text-white mb-5"
          style={{ maxWidth: 520 }}
        >
          Everything you need to manage your properties
        </h1>

        <p
          className="text-base sm:text-lg mb-10 leading-relaxed"
          style={{ color: 'rgba(255,255,255,0.55)', maxWidth: 400 }}
        >
          List properties, manage tenants, sign leases and collect rent — all from one professional dashboard.
        </p>

        {/* Trust points */}
        <ul className="flex flex-col gap-2 mb-10 text-left">
          {TRUST_POINTS.map((point) => (
            <li key={point} className="flex items-center gap-2.5">
              <CheckCircle className="w-4 h-4 shrink-0" style={{ color: 'hsl(214,100%,65%)' }} />
              <span className="text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>{point}</span>
            </li>
          ))}
        </ul>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-sm">
          <Button
            asChild
            className="w-full rounded-full py-6 text-sm font-bold shadow-lg"
            style={{
              background: 'hsl(214,100%,59%)',
              color: '#fff',
              boxShadow: '0 4px 24px rgba(30,144,255,0.4)',
            }}
          >
            <Link to="/auth">
              Sign In
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            className="w-full rounded-full py-6 text-sm font-semibold"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.75)',
            }}
          >
            <Link to="/auth?tab=signup">Create Account</Link>
          </Button>
        </div>
      </main>

      {/* ── Feature grid ── */}
      <section className="px-5 pb-12">
        <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-2xl p-4"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                style={{ background: 'rgba(30,144,255,0.15)' }}
              >
                <Icon className="w-4.5 h-4.5" style={{ color: 'hsl(214,100%,70%)' }} />
              </div>
              <p className="text-sm font-semibold text-white mb-1 leading-snug">{title}</p>
              <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
                {description}
              </p>
            </div>
          ))}
        </div>

        <p
          className="text-center text-xs mt-8"
          style={{ color: 'rgba(255,255,255,0.25)' }}
        >
          South Africa's commission-free rental platform
        </p>
      </section>
    </div>
  );
}
