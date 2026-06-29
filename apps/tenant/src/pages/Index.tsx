import { useState } from "react";
import React from "react";
import { Button } from "@mzanzihomes/ui/components/button";
import { Link } from "react-router-dom";
import { PropertySearchWidget } from "@/components/search/PropertySearchWidget";
import { MoreFiltersModal } from "@/components/search/MoreFiltersModal";
import { usePropertySearchFilters } from "@/hooks/usePropertySearchFilters";
import { BlogPostCard } from "@/components/blog/BlogPostCard";
import { Footer } from "@/components/Footer";
import { PropertyHero } from "@mzanzihomes/ui/components/property-hero";
import { MiniNavbar } from "@/components/ui/mini-navbar";
import { Marquee } from "@mzanzihomes/ui/components/marquee";
import {
  TestimonialsColumn,
  rentLekkerTestimonials,
} from "@mzanzihomes/ui/components/testimonials-columns-1";
import { motion, AnimatePresence } from "motion/react";
import { ForBuyersSection } from "@/components/sections/ForBuyersSection";
import { SellingStepsPreview } from "@/components/sections/SellingStepsPreview";
import {
  Shield,
  ArrowRight,
  MessageSquare,
  Smartphone,
  Zap,
  LayoutDashboard,
  Calculator,
  Layers,
  MapPin,
  Home,
  FileText,
  Star,
  Lock,
  Banknote,
  Handshake,
  ClipboardList,
} from "lucide-react";

type Mode = 'rent' | 'buy';

const dummyBlogPost = {
  id: "safe-transparent-new-way",
  title: "Safe, Simple, and Transparent - The New Way to Rent in South Africa",
  excerpt:
    "Renting shouldn't feel risky or confusing. Discover how MzanziHomes combines verified safety, data protection, and complete transparency.",
  publishedAt: "2024-12-19",
  readTime: 4,
  category: "Safety & Trust",
  featured: true,
};

const marqueeContent: Record<Mode, { icon: React.ElementType; label: string }[]> = {
  rent: [
    { icon: Banknote, label: "Commission-Free" },
    { icon: Shield, label: "Verified Listings" },
    { icon: FileText, label: "Digital Leases" },
    { icon: Star, label: "Credit Checks" },
    { icon: MessageSquare, label: "In-App Messaging" },
    { icon: Calculator, label: "Auto Invoicing" },
    { icon: Lock, label: "Secure Contracts" },
    { icon: LayoutDashboard, label: "Smart Dashboard" },
    { icon: Smartphone, label: "Mobile-First" },
    { icon: Zap, label: "Fast Applications" },
    { icon: Layers, label: "50+ SA Cities" },
    { icon: MapPin, label: "Verified Landlords" },
  ],
  buy: [
    { icon: Banknote, label: "Zero Agent Fees" },
    { icon: Shield, label: "Verified Listings" },
    { icon: ClipboardList, label: "Offer Management" },
    { icon: Star, label: "Credit Checks" },
    { icon: MessageSquare, label: "In-App Messaging" },
    { icon: Handshake, label: "Transfer Support" },
    { icon: Lock, label: "Secure Contracts" },
    { icon: LayoutDashboard, label: "Smart Dashboard" },
    { icon: Smartphone, label: "Mobile-First" },
    { icon: Zap, label: "Fast Offers" },
    { icon: Layers, label: "50+ SA Cities" },
    { icon: MapPin, label: "Verified Sellers" },
  ],
};

const featuresContent: Record<Mode, {
  icon: React.ElementType | (() => React.ReactElement);
  title: string;
  description: string;
  accent: string;
}[]> = {
  rent: [
    {
      icon: () => <span className="text-xl font-bold text-ocean-blue leading-none">R</span>,
      title: "Commission-Free",
      description: "No agent fees, ever. Every listing you see is direct from the landlord.",
      accent: "hsl(214 100% 59%)",
    },
    {
      icon: Smartphone,
      title: "Smart Platform",
      description: "Digital applications, e-signatures, and smart dashboards built for modern tenants.",
      accent: "hsl(142 72% 44%)",
    },
    {
      icon: Zap,
      title: "Apply in Minutes",
      description: "Submit your application, get screened, and sign your lease — all in-app.",
      accent: "hsl(25 95% 53%)",
    },
    {
      icon: LayoutDashboard,
      title: "Tenant Dashboard",
      description: "Your lease, payments, maintenance requests, and messages in one place.",
      accent: "hsl(275 84% 67%)",
    },
    {
      icon: Calculator,
      title: "Rent Payments",
      description: "Pay rent securely in-app. Auto invoices sent to your landlord every month.",
      accent: "hsl(174 72% 56%)",
    },
    {
      icon: Shield,
      title: "Verified & Secure",
      description: "Verified listings, credit-screened landlords, and legally binding leases.",
      accent: "hsl(0 78% 62%)",
    },
    {
      icon: MessageSquare,
      title: "In-App Messaging",
      description: "Chat with your landlord, share documents, and track issues. No WhatsApp chaos.",
      accent: "hsl(235 85% 70%)",
    },
    {
      icon: Layers,
      title: "Maintenance Requests",
      description: "Log, track, and communicate on repairs directly in your dashboard.",
      accent: "hsl(25 95% 53%)",
    },
  ],
  buy: [
    {
      icon: () => <span className="text-xl font-bold text-ocean-blue leading-none">R</span>,
      title: "Zero Agent Fees",
      description: "Buy direct. No commission layers, no hidden fees — just the price on the listing.",
      accent: "hsl(214 100% 59%)",
    },
    {
      icon: Smartphone,
      title: "Smart Platform",
      description: "Digital offers, e-signatures, and smart dashboards built for modern property buyers.",
      accent: "hsl(142 72% 44%)",
    },
    {
      icon: Zap,
      title: "Make Offers Fast",
      description: "Submit a binding offer, negotiate, and close — without setting foot in an office.",
      accent: "hsl(25 95% 53%)",
    },
    {
      icon: LayoutDashboard,
      title: "Buyer Dashboard",
      description: "Your saved listings, active offers, and transfer status all in one place.",
      accent: "hsl(275 84% 67%)",
    },
    {
      icon: ClipboardList,
      title: "Offer Management",
      description: "Track your offer status in real time. Full audit trail included.",
      accent: "hsl(174 72% 56%)",
    },
    {
      icon: Shield,
      title: "Verified & Secure",
      description: "Verified listings, credit-checked sellers, and legally binding offer documents.",
      accent: "hsl(0 78% 62%)",
    },
    {
      icon: MessageSquare,
      title: "In-App Messaging",
      description: "Chat with sellers, share documents, and track offer updates. No WhatsApp chaos.",
      accent: "hsl(235 85% 70%)",
    },
    {
      icon: Handshake,
      title: "Transfer Support",
      description: "Built-in transfer attorney referral network. We guide you through to registration.",
      accent: "hsl(25 95% 53%)",
    },
  ],
};

const ctaContent: Record<Mode, {
  line1: string;
  line2: string;
  subtext: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
}> = {
  rent: {
    line1: 'Rent smarter.',
    line2: 'Rent safer.',
    subtext: "Join South Africa's most trusted commission-free rental platform today.",
    primaryLabel: 'Browse Properties',
    primaryHref: '/properties',
    secondaryLabel: 'Sign Up Free',
    secondaryHref: '/auth',
  },
  buy: {
    line1: 'Buy smarter.',
    line2: 'Buy safer.',
    subtext: "Find your dream property on South Africa's most trusted commission-free platform.",
    primaryLabel: 'Browse for Sale',
    primaryHref: '/sale-listings',
    secondaryLabel: 'Sign Up Free',
    secondaryHref: '/auth',
  },
};

const firstCol = rentLekkerTestimonials.slice(0, 3);
const secondCol = rentLekkerTestimonials.slice(3, 6);
const thirdCol = rentLekkerTestimonials.slice(6, 9);

const Index = () => {
  const { filters, updateFilters, executeSearch, clearFilters } = usePropertySearchFilters();
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [mode, setMode] = useState<Mode>('rent');

  const onFiltersChange = (patch: Partial<typeof filters>) => updateFilters(patch);
  const handleSearch = () => executeSearch();

  return (
    <div className="min-h-screen" style={{ background: "hsl(214 60% 97%)" }}>
      {/* NAVBAR */}
      <MiniNavbar transparent hideLandlordActions mode={mode} />

      {/* HERO */}
      <PropertyHero mode={mode} onModeChange={setMode}>
        <PropertySearchWidget
          filters={{
            searchTerm: filters.searchTerm,
            propertyType: filters.propertyType,
            minPrice: filters.minPrice,
            maxPrice: filters.maxPrice,
            bedrooms: filters.bedrooms,
            bathrooms: filters.bathrooms,
            propertyTypes: filters.propertyTypes || [],
            amenities: filters.amenities || [],
            availableFrom: filters.availableFrom,
          }}
          onFiltersChange={onFiltersChange}
          onSearch={handleSearch}
          onMoreFiltersOpen={() => setShowMoreFilters(true)}
        />
      </PropertyHero>

      {/* MARQUEE */}
      <section
        className="py-5 border-y"
        style={{ background: "hsl(214 70% 96%)", borderColor: "hsl(214 60% 88%)" }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <Marquee duration={30} pauseOnHover fadeAmount={8}>
              {marqueeContent[mode].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="mx-5 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
                  style={{
                    background: "hsl(214 100% 59% / 0.08)",
                    color: "hsl(214 100% 40%)",
                    border: "1px solid hsl(214 100% 59% / 0.15)",
                  }}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {label}
                </div>
              ))}
            </Marquee>
          </motion.div>
        </AnimatePresence>
      </section>

      {/* FOR TENANTS / BUYERS */}
      <ForBuyersSection mode={mode} />

      {/* SELLING STEPS — buy mode only */}
      {mode === 'buy' && (
        <div style={{ background: "hsl(214 60% 97%)" }}>
          <SellingStepsPreview />
        </div>
      )}

      {/* FEATURES GRID */}
      <section className="py-20 md:py-28 px-4 sm:px-6 lg:px-8" style={{ background: "hsl(214 60% 97%)" }}>
        <div className="max-w-7xl mx-auto">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="text-center mb-14">
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "hsl(214 100% 45%)" }}>
                  Everything you need
                </span>
                <h2 className="mt-3 text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
                  {mode === 'rent' ? 'Built for modern renting' : 'Built for smart buying'}
                </h2>
                <p className="mt-3 text-gray-500 max-w-xl mx-auto">
                  One platform. Every tool you need to {mode === 'rent' ? 'find, rent, and manage your home' : 'search, offer, and own your home'}. Commission-free.
                </p>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {featuresContent[mode].map(({ icon: Icon, title, description, accent }) => (
                  <div
                    key={title}
                    className="group p-6 rounded-2xl border transition-all duration-300"
                    style={{ background: "rgba(255,255,255,0.7)", borderColor: "hsl(214 60% 90%)" }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "white";
                      (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 32px rgba(37,99,235,0.09)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.7)";
                      (e.currentTarget as HTMLElement).style.boxShadow = "none";
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                      style={{ background: `${accent}14` }}
                    >
                      {typeof Icon === "function" && Icon.length === 0 ? (
                        <Icon />
                      ) : (
                        <Icon className="w-5 h-5" style={{ color: accent }} />
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 text-sm mb-1.5">{title}</h3>
                    <p className="text-gray-500 text-xs leading-relaxed">{description}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section
        className="py-20 md:py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
        style={{ background: "hsl(214 80% 94%)" }}
      >
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            viewport={{ once: true }}
            className="flex flex-col items-center justify-center max-w-[540px] mx-auto mb-12 text-center"
          >
            <div
              className="border py-1 px-4 rounded-full text-sm font-semibold mb-4"
              style={{
                borderColor: "hsl(214 100% 59% / 0.25)",
                color: "hsl(214 100% 45%)",
                background: "hsl(214 100% 59% / 0.06)",
              }}
            >
              Testimonials
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900">
              What our users say
            </h2>
            <p className="mt-4 text-gray-500">
              Landlords and tenants across South Africa trust MzanziHomes.
            </p>
          </motion.div>
          <div
            className="flex justify-center gap-6 mt-4"
            style={{
              maskImage: "linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)",
              WebkitMaskImage: "linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)",
              maxHeight: "720px",
              overflow: "hidden",
            }}
          >
            <TestimonialsColumn testimonials={firstCol} duration={18} />
            <TestimonialsColumn testimonials={secondCol} className="hidden md:block" duration={22} />
            <TestimonialsColumn testimonials={thirdCol} className="hidden lg:block" duration={16} />
          </div>
        </div>
      </section>

      {/* FEATURED PROPERTIES */}
      <section className="py-16 md:py-20 px-4 sm:px-6 lg:px-8" style={{ background: "hsl(214 60% 97%)" }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "hsl(214 100% 45%)" }}>
                Listings
              </span>
              <h2 className="mt-2 text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
                Featured Properties
              </h2>
              <p className="mt-2 text-gray-500 max-w-md">
                Verified properties from trusted landlords across South Africa
              </p>
            </div>
            <Button
              asChild
              variant="outline"
              className="hidden sm:flex items-center gap-2 border-gray-200 text-gray-700 hover:bg-white rounded-full px-5 py-2.5 text-sm font-semibold"
            >
              <Link to="/properties">
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
          <div
            className="rounded-2xl border border-dashed py-16 text-center"
            style={{ borderColor: "hsl(214 60% 84%)", background: "rgba(255,255,255,0.6)" }}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "hsl(214 100% 59% / 0.08)" }}
            >
              <Home className="w-7 h-7" style={{ color: "hsl(214 100% 59% / 0.5)" }} />
            </div>
            <p className="text-gray-400 font-medium text-sm">Featured properties coming soon</p>
            <Button
              asChild
              className="mt-5 bg-ocean-blue hover:bg-ocean-blue/90 text-white rounded-full px-6 py-2.5 text-sm font-semibold shadow-sm"
            >
              <Link to="/properties" className="flex items-center gap-2">
                Browse all listings <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* BLOG */}
      <section className="py-16 md:py-20 px-4 sm:px-6 lg:px-8" style={{ background: "hsl(214 80% 94%)" }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "hsl(214 100% 45%)" }}>
              Resources
            </span>
            <h2 className="mt-2 text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
              Blog of the Week
            </h2>
          </div>
          <div className="max-w-md mx-auto">
            <BlogPostCard {...dummyBlogPost} />
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section
        className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, hsl(214 100% 48%) 0%, hsl(214 100% 36%) 100%)" }}
      >
        <div
          className="absolute inset-0 pointer-events-none opacity-10"
          style={{
            backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div
          className="absolute -top-24 -right-24 w-72 h-72 rounded-full opacity-20"
          style={{ background: "hsl(214 100% 70%)", filter: "blur(70px)" }}
        />
        <div
          className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full opacity-20"
          style={{ background: "hsl(142 72% 44%)", filter: "blur(70px)" }}
        />
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-white/60 mb-4">
            Join MzanziHomes
          </span>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.05] tracking-tight">
                {ctaContent[mode].line1}
                <br />
                {ctaContent[mode].line2}
              </h2>
              <p className="mt-5 text-lg text-white/75 max-w-xl mx-auto">
                {ctaContent[mode].subtext}
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  asChild
                  className="bg-white text-ocean-blue hover:bg-white/90 rounded-full px-8 py-3.5 text-sm font-bold shadow-lg"
                >
                  <Link to={ctaContent[mode].primaryHref}>{ctaContent[mode].primaryLabel}</Link>
                </Button>
                <Button
                  asChild
                  className="bg-white/15 hover:bg-white/25 text-white border border-white/30 rounded-full px-8 py-3.5 text-sm font-semibold backdrop-blur-sm"
                >
                  <Link to={ctaContent[mode].secondaryHref}>{ctaContent[mode].secondaryLabel}</Link>
                </Button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      <Footer />

      <MoreFiltersModal
        open={showMoreFilters}
        onClose={() => setShowMoreFilters(false)}
        filters={filters}
        onFiltersChange={onFiltersChange}
        onClearFilters={clearFilters}
        onApplyFilters={handleSearch}
      />
    </div>
  );
};

export default Index;
