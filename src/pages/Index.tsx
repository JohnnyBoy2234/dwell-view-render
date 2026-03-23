import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { PropertySearchWidget } from "@/components/search/PropertySearchWidget";
import { MoreFiltersModal } from "@/components/search/MoreFiltersModal";
import { usePropertySearchFilters } from "@/hooks/usePropertySearchFilters";
import { BlogPostCard } from "@/components/blog/BlogPostCard";
import { Footer } from "@/components/Footer";
import { PropertyHero } from "@/components/ui/property-hero";
import { MiniNavbar } from "@/components/ui/mini-navbar";
import { Marquee } from "@/components/ui/marquee";
import {
  TestimonialsColumn,
  rentLekkerTestimonials,
} from "@/components/ui/testimonials-columns-1";
import { motion } from "motion/react";
import {
  Shield,
  CheckCircle,
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
} from "lucide-react";

const dummyBlogPost = {
  id: "safe-transparent-new-way",
  title: "Safe, Simple, and Transparent - The New Way to Rent in South Africa",
  excerpt:
    "Renting shouldn't feel risky or confusing. Discover how RentLekker combines verified safety, data protection, and complete transparency.",
  publishedAt: "2024-12-19",
  readTime: 4,
  category: "Safety & Trust",
  featured: true,
};



const marqueeFeatures = [
  { icon: Banknote, label: "Commission-Free" },
  { icon: Shield, label: "Verified Listings" },
  { icon: FileText, label: "Digital Leases" },
  { icon: Star, label: "Credit Checks" },
  { icon: MessageSquare, label: "In-App Messaging" },
  { icon: Calculator, label: "Auto Invoicing" },
  { icon: Lock, label: "Secure Contracts" },
  { icon: LayoutDashboard, label: "Smart Dashboard" },
  { icon: Smartphone, label: "Mobile-First" },
  { icon: Zap, label: "List in Minutes" },
  { icon: Layers, label: "Unlimited Properties" },
  { icon: MapPin, label: "50+ SA Cities" },
];

const features = [
  {
    icon: () => <span className="text-xl font-bold text-ocean-blue leading-none">R</span>,
    title: "Commission-Free",
    description: "Keep 100% of your rental income. No agent fees, ever.",
    accent: "hsl(214 100% 59%)",
  },
  {
    icon: Smartphone,
    title: "Smart Platform",
    description: "Digital leases, e-signatures, and smart dashboards built for modern landlords.",
    accent: "hsl(142 72% 44%)",
  },
  {
    icon: Zap,
    title: "Speed & Simplicity",
    description: "List, screen, and sign in minutes. No delays, no middlemen.",
    accent: "hsl(25 95% 53%)",
  },
  {
    icon: LayoutDashboard,
    title: "All-in-One Dashboard",
    description: "Listings, leases, rent, maintenance and accounting from one place.",
    accent: "hsl(275 84% 67%)",
  },
  {
    icon: Calculator,
    title: "Built-In Invoicing",
    description: "Professional invoices generated automatically. Save time, stay compliant.",
    accent: "hsl(174 72% 56%)",
  },
  {
    icon: Shield,
    title: "Verified & Secure",
    description: "Credit-checked tenants, verified listings, legally binding contracts.",
    accent: "hsl(0 78% 62%)",
  },
  {
    icon: MessageSquare,
    title: "In-App Messaging",
    description: "Chat, share documents, and track updates — no WhatsApp chaos.",
    accent: "hsl(235 85% 70%)",
  },
  {
    icon: Layers,
    title: "Unlimited Properties",
    description: "Manage one property or a hundred. Scalable from day one.",
    accent: "hsl(25 95% 53%)",
  },
];

const firstCol = rentLekkerTestimonials.slice(0, 3);
const secondCol = rentLekkerTestimonials.slice(3, 6);
const thirdCol = rentLekkerTestimonials.slice(6, 9);

const Index = () => {
  const { filters, updateFilters, executeSearch, clearFilters } =
    usePropertySearchFilters();
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  const onFiltersChange = (patch: Partial<typeof filters>) => updateFilters(patch);
  const handleSearch = () => executeSearch();

  return (
    <div className="min-h-screen" style={{ background: "hsl(214 60% 97%)" }}>
      {/* ── NAVBAR (floats over hero) ── */}
      <MiniNavbar />

      {/* ── HERO (search embedded inside) ── */}
      <PropertyHero>
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

      {/* ── MARQUEE FEATURES BELT ── */}
      <section
        className="py-5 border-y"
        style={{
          background: "hsl(214 70% 96%)",
          borderColor: "hsl(214 60% 88%)",
        }}
      >
        <Marquee duration={30} pauseOnHover fadeAmount={8}>
          {marqueeFeatures.map(({ icon: Icon, label }) => (
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
      </section>


      {/* ── FOR LANDLORDS ── */}
      <section className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 overflow-hidden" style={{ background: "hsl(214 60% 97%)" }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <span
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: "hsl(214 100% 45%)" }}
              >
                For Landlords
              </span>
              <h2 className="mt-3 text-4xl md:text-5xl font-bold text-gray-900 leading-[1.1] tracking-tight">
                List your property.
                <br />
                <span style={{ color: "hsl(214 100% 50%)" }}>Keep your money.</span>
              </h2>
              <p className="mt-5 text-lg text-gray-500 leading-relaxed max-w-md">
                RentLekker finds you tenants and handles referencing, contracts, and more — while you stay in full control and pay zero commission.
              </p>
              <ul className="mt-7 space-y-3">
                {[
                  "100% Commission-Free",
                  "No Hidden Fees",
                  "Full Property Management Tools",
                  "Verified Tenant Screening",
                  "Securely Stored Records",
                ].map((item) => (
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
                  <Link to="/list-property">Add Listing</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="border-gray-200 text-gray-700 hover:bg-white rounded-full px-7 py-3 text-sm font-semibold"
                >
                  <Link to="/about/landlord">Learn More</Link>
                </Button>
              </div>
            </div>

            <div className="relative h-[420px]">
              <div
                className="absolute top-0 right-0 w-[62%] h-[70%] rounded-2xl overflow-hidden"
                style={{ boxShadow: "0 16px 48px rgba(37,99,235,0.16)" }}
              >
                <img
                  src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=800&auto=format&fit=crop"
                  alt="Modern rental property"
                  className="w-full h-full object-cover"
                />
              </div>
              <div
                className="absolute bottom-0 left-0 w-[55%] h-[58%] rounded-2xl overflow-hidden border-4 border-white"
                style={{ boxShadow: "0 16px 48px rgba(0,0,0,0.10)" }}
              >
                <img
                  src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=600&auto=format&fit=crop"
                  alt="Landlord meeting"
                  className="w-full h-full object-cover"
                />
              </div>
              <div
                className="absolute top-6 left-0 bg-white rounded-2xl border px-4 py-3 flex items-center gap-3"
                style={{
                  boxShadow: "0 4px 20px rgba(37,99,235,0.10)",
                  borderColor: "hsl(214 60% 90%)",
                }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: "hsl(142 72% 44% / 0.12)" }}
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

      {/* ── FOR TENANTS ── */}
      <section
        className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 overflow-hidden"
        style={{ background: "hsl(214 80% 94%)" }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="relative h-[420px] order-2 md:order-1">
              <div
                className="absolute top-0 left-0 w-[62%] h-[70%] rounded-2xl overflow-hidden"
                style={{ boxShadow: "0 16px 48px rgba(37,99,235,0.14)" }}
              >
                <img
                  src="https://images.unsplash.com/photo-1484154218962-a197022b5858?q=80&w=800&auto=format&fit=crop"
                  alt="Happy family at home"
                  className="w-full h-full object-cover"
                />
              </div>
              <div
                className="absolute bottom-0 right-0 w-[52%] h-[55%] rounded-2xl overflow-hidden border-4 border-white"
                style={{ boxShadow: "0 16px 48px rgba(0,0,0,0.10)" }}
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
                  boxShadow: "0 4px 20px rgba(37,99,235,0.10)",
                  borderColor: "hsl(214 60% 90%)",
                }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: "hsl(214 100% 59% / 0.10)" }}
                >
                  <Shield className="w-4 h-4" style={{ color: "hsl(214 100% 50%)" }} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">All Properties</p>
                  <p className="text-sm font-bold text-gray-900">Verified &amp; Safe</p>
                </div>
              </div>
            </div>

            <div className="order-1 md:order-2">
              <span
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: "hsl(214 100% 45%)" }}
              >
                For Tenants
              </span>
              <h2 className="mt-3 text-4xl md:text-5xl font-bold text-gray-900 leading-[1.1] tracking-tight">
                Find your next home.
                <br />
                <span className="text-success-green">No agent fees.</span>
              </h2>
              <p className="mt-5 text-lg text-gray-500 leading-relaxed max-w-md">
                On RentLekker there are never any agent fees. We verify all listings so you never encounter dead adverts. Your safety and security are our priority.
              </p>
              <ul className="mt-7 space-y-3">
                {[
                  "No Agent Fees — Ever",
                  "Verified Properties Only",
                  "Direct Landlord Communication",
                  "Secure Digital Leases",
                ].map((item) => (
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
                  <Link to="/properties">Find Rental</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="border-gray-200 text-gray-700 hover:bg-white rounded-full px-7 py-3 text-sm font-semibold"
                >
                  <Link to="/about/tenant">Learn More</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section className="py-20 md:py-28 px-4 sm:px-6 lg:px-8" style={{ background: "hsl(214 60% 97%)" }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <span
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: "hsl(214 100% 45%)" }}
            >
              Everything you need
            </span>
            <h2 className="mt-3 text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
              Built for modern renting
            </h2>
            <p className="mt-3 text-gray-500 max-w-xl mx-auto">
              One platform. Every tool you need to list, rent, manage, and communicate — commission-free.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map(({ icon: Icon, title, description, accent }) => (
              <div
                key={title}
                className="group p-6 rounded-2xl border transition-all duration-300"
                style={{
                  background: "rgba(255,255,255,0.7)",
                  borderColor: "hsl(214 60% 90%)",
                }}
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
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
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
              Landlords and tenants across South Africa trust RentLekker.
            </p>
          </motion.div>

          <div
            className="flex justify-center gap-6 mt-4"
            style={{
              maskImage:
                "linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)",
              WebkitMaskImage:
                "linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)",
              maxHeight: "720px",
              overflow: "hidden",
            }}
          >
            <TestimonialsColumn testimonials={firstCol} duration={18} />
            <TestimonialsColumn
              testimonials={secondCol}
              className="hidden md:block"
              duration={22}
            />
            <TestimonialsColumn
              testimonials={thirdCol}
              className="hidden lg:block"
              duration={16}
            />
          </div>
        </div>
      </section>

      {/* ── FEATURED PROPERTIES ── */}
      <section className="py-16 md:py-20 px-4 sm:px-6 lg:px-8" style={{ background: "hsl(214 60% 97%)" }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <span
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: "hsl(214 100% 45%)" }}
              >
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

      {/* ── BLOG ── */}
      <section className="py-16 md:py-20 px-4 sm:px-6 lg:px-8" style={{ background: "hsl(214 80% 94%)" }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <span
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: "hsl(214 100% 45%)" }}
            >
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

      {/* ── FINAL CTA ── */}
      <section
        className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, hsl(214 100% 48%) 0%, hsl(214 100% 36%) 100%)",
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 2px 2px, white 1px, transparent 1px)",
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
            Join RentLekker
          </span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.05] tracking-tight">
            Rent smarter.
            <br />
            Rent safer.
          </h2>
          <p className="mt-5 text-lg text-white/75 max-w-xl mx-auto">
            Join South Africa's most trusted commission-free rental platform today.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              asChild
              className="bg-white text-ocean-blue hover:bg-white/90 rounded-full px-8 py-3.5 text-sm font-bold shadow-lg"
            >
              <Link to="/properties">Browse Properties</Link>
            </Button>
            <Button
              asChild
              className="bg-white/15 hover:bg-white/25 text-white border border-white/30 rounded-full px-8 py-3.5 text-sm font-semibold backdrop-blur-sm"
            >
              <Link to="/list-property">List Your Property</Link>
            </Button>
          </div>
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
