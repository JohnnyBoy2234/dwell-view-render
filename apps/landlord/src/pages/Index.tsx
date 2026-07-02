import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ArrowRight, CheckCircle } from 'lucide-react';
import { Button } from '@mzanzihomes/ui/components/button';
import { PropertyHero } from '@mzanzihomes/ui/components/property-hero';
import { MiniNavbar } from '@/components/ui/mini-navbar';

const LANDLORD_HERO_IMAGE =
  'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=1920&auto=format&fit=crop';

const TRUST_POINTS = [
  'Commission-free — keep 100% of your rental income',
  'Cutting-edge payment automation — rent flows straight from tenant to landlord, no middleman',
  'Legally binding e-signatures',
  'Automated rent tracking & invoicing',
  'Designed for South Africa',
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
    <div className="min-h-screen pb-[80px] md:pb-0">
      <MiniNavbar transparent hideLandlordActions />

      <PropertyHero
        image={LANDLORD_HERO_IMAGE}
        headline={<>Your Property{' '}<span style={{ color: 'hsl(214,100%,80%)' }}>Dashboard</span></>}
        subtext="List properties, manage tenants, sign leases and collect rent — all from one professional dashboard."
      >
        <div className="w-full max-w-md mx-auto flex flex-col items-center">
          {/* Trust points */}
          <ul className="flex flex-col gap-2.5 mb-8 self-start sm:self-center sm:items-start">
            {TRUST_POINTS.map((point) => (
              <li key={point} className="flex items-center gap-2.5">
                <CheckCircle className="w-4 h-4 shrink-0" style={{ color: 'hsl(214,100%,75%)' }} />
                <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.9)', textShadow: '0 1px 6px rgba(0,0,0,0.4)' }}>
                  {point}
                </span>
              </li>
            ))}
          </ul>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
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
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff',
              }}
            >
              <Link to="/auth?tab=signup">Create Account</Link>
            </Button>
          </div>
        </div>
      </PropertyHero>
    </div>
  );
}
