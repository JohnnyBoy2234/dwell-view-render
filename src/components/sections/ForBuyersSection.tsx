import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { CheckCircle, Shield } from 'lucide-react';

type Mode = 'rent' | 'buy';

interface ForBuyersSectionProps {
  mode: Mode;
}

const forBuyersContent: Record<Mode, {
  label: string;
  headline: [string, string];
  subtext: string;
  bullets: string[];
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  badgeLabel: string;
  badgeValue: string;
}> = {
  rent: {
    label: 'For Tenants',
    headline: ['Find your next home.', 'No agent fees.'],
    subtext:
      'On RentLekker there are never any agent fees. We verify all listings so you never encounter dead adverts. Your safety and security are our priority.',
    bullets: [
      'No Agent Fees — Ever',
      'Verified Properties Only',
      'Direct Landlord Communication',
      'Secure Digital Leases',
    ],
    primaryLabel: 'Find Rental',
    primaryHref: '/properties',
    secondaryLabel: 'Learn More',
    secondaryHref: '/about/tenant',
    badgeLabel: 'All Properties',
    badgeValue: 'Verified & Safe',
  },
  buy: {
    label: 'For Buyers',
    headline: ['Find your dream property.', 'Own it.'],
    subtext:
      'Browse verified properties for sale across South Africa. Connect directly with sellers, submit digital offers, and get transfer attorney support — all in one place.',
    bullets: [
      'Verified Listings Only',
      'Direct Seller Communication',
      'Secure Digital Offers',
      'Transfer Attorney Support',
    ],
    primaryLabel: 'Browse for Sale',
    primaryHref: '/sale-listings',
    secondaryLabel: 'Learn More',
    secondaryHref: '/about/tenant',
    badgeLabel: 'All Listings',
    badgeValue: 'Verified & Safe',
  },
};

export function ForBuyersSection({ mode }: ForBuyersSectionProps) {
  return (
    <section
      className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 overflow-hidden"
      style={{ background: 'hsl(214 80% 94%)' }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          {/* Static image column */}
          <div className="relative h-[420px] order-2 md:order-1">
            <div
              className="absolute top-0 left-0 w-[62%] h-[70%] rounded-2xl overflow-hidden"
              style={{ boxShadow: '0 16px 48px rgba(37,99,235,0.14)' }}
            >
              <img
                src="https://images.unsplash.com/photo-1484154218962-a197022b5858?q=80&w=800&auto=format&fit=crop"
                alt="Happy family at home"
                className="w-full h-full object-cover"
              />
            </div>
            <div
              className="absolute bottom-0 right-0 w-[52%] h-[55%] rounded-2xl overflow-hidden border-4 border-white"
              style={{ boxShadow: '0 16px 48px rgba(0,0,0,0.10)' }}
            >
              <img
                src="https://images.unsplash.com/photo-1493809842364-78817add7ffb?q=80&w=600&auto=format&fit=crop"
                alt="Beautiful home"
                className="w-full h-full object-cover"
              />
            </div>
            <div
              className="absolute top-6 right-0 bg-white rounded-2xl border px-4 py-3 flex items-center gap-3"
              style={{
                boxShadow: '0 4px 20px rgba(37,99,235,0.10)',
                borderColor: 'hsl(214 60% 90%)',
              }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: 'hsl(214 100% 59% / 0.10)' }}
              >
                <Shield className="w-4 h-4" style={{ color: 'hsl(214 100% 50%)' }} />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">
                  {forBuyersContent[mode].badgeLabel}
                </p>
                <p className="text-sm font-bold text-gray-900">
                  {forBuyersContent[mode].badgeValue}
                </p>
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={mode}
              className="order-1 md:order-2"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <span
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: 'hsl(214 100% 45%)' }}
              >
                {forBuyersContent[mode].label}
              </span>
              <h2 className="mt-3 text-4xl md:text-5xl font-bold text-gray-900 leading-[1.1] tracking-tight">
                {forBuyersContent[mode].headline[0]}
                <br />
                <span className="text-success-green">
                  {forBuyersContent[mode].headline[1]}
                </span>
              </h2>
              <p className="mt-5 text-lg text-gray-500 leading-relaxed max-w-md">
                {forBuyersContent[mode].subtext}
              </p>
              <ul className="mt-7 space-y-3">
                {forBuyersContent[mode].bullets.map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <CheckCircle className="h-4 w-4 text-success-green flex-shrink-0" />
                    <span className="text-gray-700 text-sm font-medium">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Button
                  asChild
                  className="bg-ocean-blue hover:bg-ocean-blue/90 text-white rounded-full px-7 py-3 text-sm font-semibold shadow-md"
                >
                  <Link to={forBuyersContent[mode].primaryHref}>
                    {forBuyersContent[mode].primaryLabel}
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="border-gray-200 text-gray-700 hover:bg-white rounded-full px-7 py-3 text-sm font-semibold"
                >
                  <Link to={forBuyersContent[mode].secondaryHref}>
                    {forBuyersContent[mode].secondaryLabel}
                  </Link>
                </Button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
