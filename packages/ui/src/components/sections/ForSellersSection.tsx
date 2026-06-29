import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@mzanzihomes/ui/components/button';
import { Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

type Mode = 'rent' | 'buy';

interface ForSellersSectionProps {
  mode: Mode;
}

const forSellersContent: Record<Mode, {
  label: string;
  headline: [string, string];
  subtext: string;
  bullets: string[];
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
}> = {
  rent: {
    label: 'For Landlords',
    headline: ['List your property.', 'Keep your money.'],
    subtext:
      'MzanziHomes finds you tenants and handles referencing, contracts, and more — while you stay in full control and pay zero commission.',
    bullets: [
      '100% Commission-Free',
      'No Hidden Fees',
      'Full Property Management Tools',
      'Verified Tenant Screening',
      'Securely Stored Records',
    ],
    primaryLabel: 'Add Listing',
    primaryHref: '/list-property',
    secondaryLabel: 'Learn More',
    secondaryHref: '/about/landlord',
  },
  buy: {
    label: 'For Sellers',
    headline: ['Sell your property.', 'Zero agent fees.'],
    subtext:
      'List your property for sale on MzanziHomes and connect directly with verified buyers — no middlemen, no commissions, full control.',
    bullets: [
      'Zero Agent Fees',
      'Verified Buyer Screening',
      'Transparent Offer Management',
      'Secure Transfer Process',
      'No Hidden Costs',
    ],
    primaryLabel: 'List for Sale',
    primaryHref: '/list-sale',
    secondaryLabel: 'Learn More',
    secondaryHref: '/about/seller',
  },
};

export function ForSellersSection({ mode }: ForSellersSectionProps) {
  return (
    <section
      className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 overflow-hidden"
      style={{ background: 'hsl(214 60% 97%)' }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <span
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: 'hsl(214 100% 45%)' }}
              >
                {forSellersContent[mode].label}
              </span>
              <h2 className="mt-3 text-4xl md:text-5xl font-bold text-gray-900 leading-[1.1] tracking-tight">
                {forSellersContent[mode].headline[0]}
                <br />
                <span style={{ color: 'hsl(214 100% 50%)' }}>
                  {forSellersContent[mode].headline[1]}
                </span>
              </h2>
              <p className="mt-5 text-lg text-gray-500 leading-relaxed max-w-md">
                {forSellersContent[mode].subtext}
              </p>
              <ul className="mt-7 space-y-3">
                {forSellersContent[mode].bullets.map((item) => (
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
                  <Link to={forSellersContent[mode].primaryHref}>
                    {forSellersContent[mode].primaryLabel}
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="border-gray-200 text-gray-700 hover:bg-white rounded-full px-7 py-3 text-sm font-semibold"
                >
                  <Link to={forSellersContent[mode].secondaryHref}>
                    {forSellersContent[mode].secondaryLabel}
                  </Link>
                </Button>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Static image column */}
          <div className="relative h-[420px]">
            <div
              className="absolute top-0 right-0 w-[62%] h-[70%] rounded-2xl overflow-hidden"
              style={{ boxShadow: '0 16px 48px rgba(37,99,235,0.16)' }}
            >
              <img
                src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=800&auto=format&fit=crop"
                alt="Modern property"
                className="w-full h-full object-cover"
              />
            </div>
            <div
              className="absolute bottom-0 left-0 w-[55%] h-[58%] rounded-2xl overflow-hidden border-4 border-white"
              style={{ boxShadow: '0 16px 48px rgba(0,0,0,0.10)' }}
            >
              <img
                src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=600&auto=format&fit=crop"
                alt="Property owner"
                className="w-full h-full object-cover"
              />
            </div>
            <div
              className="absolute top-6 left-0 bg-white rounded-2xl border px-4 py-3 flex items-center gap-3"
              style={{
                boxShadow: '0 4px 20px rgba(37,99,235,0.10)',
                borderColor: 'hsl(214 60% 90%)',
              }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: 'hsl(142 72% 44% / 0.12)' }}
              >
                <span className="text-success-green font-bold text-sm">R</span>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">Zero Commission</p>
                <p className="text-sm font-bold text-gray-900">100% Yours</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
