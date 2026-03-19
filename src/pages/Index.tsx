import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Property24SearchBar } from "@/components/search/Property24SearchBar";
import { MoreFiltersModal } from "@/components/search/MoreFiltersModal";
import { usePropertySearchFilters } from "@/hooks/usePropertySearchFilters";
import { TestimonialsCarousel } from "@/components/TestimonialsCarousel";
import { BlogPostCard } from "@/components/blog/BlogPostCard";
import { Footer } from "@/components/Footer";
import { ArcGalleryHero } from "@/components/ui/arc-gallery-hero-component";
import { MiniNavbar } from "@/components/ui/mini-navbar";
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
  Users,
} from "lucide-react";

const dummyBlogPost = {
  id: "safe-transparent-new-way",
  title: "Safe, Simple, and Transparent - The New Way to Rent in South Africa",
  excerpt:
    "Renting shouldn't feel risky or confusing. Discover how RentLekker combines verified safety, data protection, and complete transparency to create a new standard for renting in South Africa.",
  publishedAt: "2024-12-19",
  readTime: 4,
  category: "Safety & Trust",
  featured: true,
};

const propertyImages = [
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1628744448840-55bdb2497bd4?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1616137466211-f939a420be84?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1560185127-6c85feab5b1b?q=80&w=400&auto=format&fit=crop",
];

const stats = [
  { icon: Home, value: "2,400+", label: "Active Listings" },
  { icon: Users, value: "18,000+", label: "Verified Users" },
  { icon: MapPin, value: "50+", label: "Cities Covered" },
];

const features = [
  {
    icon: () => (
      <span className="text-xl font-bold text-ocean-blue">R</span>
    ),
    title: "Commission-Free",
    description:
      "Keep 100% of your rental income. No agent fees, ever.",
    accent: "hsl(214 100% 59%)",
  },
  {
    icon: Smartphone,
    title: "Smart Platform",
    description:
      "Digital leases, e-signatures, and smart dashboards built for modern landlords.",
    accent: "hsl(142 72% 44%)",
  },
  {
    icon: Zap,
    title: "Speed & Simplicity",
    description:
      "List, screen, and sign in minutes. No delays, no middlemen.",
    accent: "hsl(25 95% 53%)",
  },
  {
    icon: LayoutDashboard,
    title: "All-in-One Dashboard",
    description:
      "Listings, leases, rent, maintenance and accounting from one place.",
    accent: "hsl(275 84% 67%)",
  },
  {
    icon: Calculator,
    title: "Built-In Invoicing",
    description:
      "Professional invoices generated automatically. Save time, stay compliant.",
    accent: "hsl(174 72% 56%)",
  },
  {
    icon: Shield,
    title: "Verified & Secure",
    description:
      "Credit-checked tenants, verified listings, legally binding contracts.",
    accent: "hsl(0 78% 62%)",
  },
  {
    icon: MessageSquare,
    title: "In-App Messaging",
    description:
      "Chat, share documents, and track updates — no WhatsApp chaos.",
    accent: "hsl(235 85% 70%)",
  },
  {
    icon: Layers,
    title: "Unlimited Properties",
    description:
      "Manage one property or a hundred. Scalable from day one.",
    accent: "hsl(25 95% 53%)",
  },
];

const Index = () => {
  const { filters, updateFilters, executeSearch, clearFilters } =
    usePropertySearchFilters();
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  const onFiltersChange = (patch: Partial<typeof filters>) => {
    updateFilters(patch);
  };

  const handleSearch = () => {
    executeSearch();
  };

  return (
    <div className="min-h-screen bg-white">
      {/* ── NAVBAR ── */}
      <MiniNavbar />

      {/* ── HERO ── */}
      <ArcGalleryHero images={propertyImages} />

      {/* ── SEARCH STRIP ── */}
      <section className="relative z-20 -mt-6 pb-10 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-[0_8px_48px_rgba(37,99,235,0.12)] border border-gray-100 p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
              Search Rentals
            </p>
            <Property24SearchBar
              onSearch={handleSearch}
              onFiltersChange={onFiltersChange}
              onMoreFiltersOpen={() => setShowMoreFilters(true)}
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
              className="w-full"
            />
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section className="py-12 px-4 border-y border-gray-100 bg-gray-50/60">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-3 gap-6">
            {stats.map(({ icon: Icon, value, label }) => (
              <div key={label} className="flex flex-col items-center text-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-ocean-blue/8 flex items-center justify-center mb-1">
                  <Icon className="w-5 h-5 text-ocean-blue" />
                </div>
                <span className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                  {value}
                </span>
                <span className="text-xs sm:text-sm text-gray-500 font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOR LANDLORDS ── */}
      <section className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-ocean-blue">
                For Landlords
              </span>
              <h2 className="mt-3 text-4xl md:text-5xl font-bold text-gray-900 leading-[1.1] tracking-tight">
                List your property.<br />
                <span className="text-ocean-blue">Keep your money.</span>
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
                  className="bg-ocean-blue hover:bg-ocean-blue/90 text-white rounded-full px-7 py-3 text-sm font-semibold shadow-md hover:shadow-lg transition-all"
                >
                  <Link to="/list-property">Add Listing</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="border-gray-200 text-gray-700 hover:bg-gray-50 rounded-full px-7 py-3 text-sm font-semibold"
                >
                  <Link to="/about/landlord">Learn More</Link>
                </Button>
              </div>
            </div>

            {/* Image collage */}
            <div className="relative h-[420px]">
              <div
                className="absolute top-0 right-0 w-[62%] h-[70%] rounded-2xl overflow-hidden shadow-xl"
                style={{ boxShadow: "0 16px 48px rgba(37,99,235,0.14)" }}
              >
                <img
                  src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=800&auto=format&fit=crop"
                  alt="Modern rental property"
                  className="w-full h-full object-cover"
                />
              </div>
              <div
                className="absolute bottom-0 left-0 w-[55%] h-[58%] rounded-2xl overflow-hidden shadow-xl border-4 border-white"
                style={{ boxShadow: "0 16px 48px rgba(0,0,0,0.10)" }}
              >
                <img
                  src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=600&auto=format&fit=crop"
                  alt="Landlord and tenant meeting"
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Accent badge */}
              <div className="absolute top-6 left-0 bg-white rounded-2xl shadow-lg border border-gray-100 px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-success-green/15 flex items-center justify-center">
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
      <section className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 bg-gray-50/60 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            {/* Image collage */}
            <div className="relative h-[420px] order-2 md:order-1">
              <div
                className="absolute top-0 left-0 w-[62%] h-[70%] rounded-2xl overflow-hidden shadow-xl"
                style={{ boxShadow: "0 16px 48px rgba(37,99,235,0.12)" }}
              >
                <img
                  src="https://images.unsplash.com/photo-1606788075819-9574a6edfab3?q=80&w=800&auto=format&fit=crop"
                  alt="Happy family at home"
                  className="w-full h-full object-cover"
                />
              </div>
              <div
                className="absolute bottom-0 right-0 w-[52%] h-[55%] rounded-2xl overflow-hidden shadow-xl border-4 border-white"
                style={{ boxShadow: "0 16px 48px rgba(0,0,0,0.10)" }}
              >
                <img
                  src="https://images.unsplash.com/photo-1560185127-6c85feab5b1b?q=80&w=600&auto=format&fit=crop"
                  alt="Beautiful home"
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Accent badge */}
              <div className="absolute top-6 right-0 bg-white rounded-2xl shadow-lg border border-gray-100 px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-ocean-blue/10 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-ocean-blue" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">All Properties</p>
                  <p className="text-sm font-bold text-gray-900">Verified &amp; Safe</p>
                </div>
              </div>
            </div>

            <div className="order-1 md:order-2">
              <span className="text-xs font-bold uppercase tracking-widest text-ocean-blue">
                For Tenants
              </span>
              <h2 className="mt-3 text-4xl md:text-5xl font-bold text-gray-900 leading-[1.1] tracking-tight">
                Find your next home.<br />
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
                  className="bg-ocean-blue hover:bg-ocean-blue/90 text-white rounded-full px-7 py-3 text-sm font-semibold shadow-md hover:shadow-lg transition-all"
                >
                  <Link to="/properties">Find Rental</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="border-gray-200 text-gray-700 hover:bg-gray-50 rounded-full px-7 py-3 text-sm font-semibold"
                >
                  <Link to="/about/tenant">Learn More</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-ocean-blue">
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
                className="group p-6 rounded-2xl bg-gray-50/80 border border-gray-100 hover:border-ocean-blue/20 hover:bg-white hover:shadow-[0_8px_32px_rgba(37,99,235,0.08)] transition-all duration-300"
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

      {/* ── FEATURED PROPERTIES ── */}
      <section className="py-16 md:py-20 px-4 sm:px-6 lg:px-8 bg-gray-50/60">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-ocean-blue">
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

          <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-ocean-blue/8 flex items-center justify-center mx-auto mb-4">
              <Home className="w-7 h-7 text-ocean-blue/60" />
            </div>
            <p className="text-gray-400 font-medium text-sm">Featured properties coming soon</p>
            <Button asChild className="mt-5 bg-ocean-blue hover:bg-ocean-blue/90 text-white rounded-full px-6 py-2.5 text-sm font-semibold shadow-sm">
              <Link to="/properties" className="flex items-center gap-2">
                Browse all listings <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <TestimonialsCarousel />

      {/* ── BLOG ── */}
      <section className="py-16 md:py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-xs font-bold uppercase tracking-widest text-ocean-blue">
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
          background:
            "linear-gradient(135deg, hsl(214 100% 52%) 0%, hsl(214 100% 40%) 100%)",
        }}
      >
        {/* Background grid texture */}
        <div
          className="absolute inset-0 pointer-events-none opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 2px 2px, white 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        {/* Blurred orbs */}
        <div
          className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-20"
          style={{ background: "hsl(214 100% 70%)", filter: "blur(60px)" }}
        />
        <div
          className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full opacity-20"
          style={{ background: "hsl(142 72% 44%)", filter: "blur(60px)" }}
        />

        <div className="max-w-3xl mx-auto text-center relative z-10">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-white/60 mb-4">
            Join RentLekker
          </span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.05] tracking-tight">
            Rent smarter.<br />
            Rent safer.
          </h2>
          <p className="mt-5 text-lg text-white/75 max-w-xl mx-auto">
            Join South Africa's most trusted commission-free rental platform today.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              asChild
              className="bg-white text-ocean-blue hover:bg-white/90 rounded-full px-8 py-3.5 text-sm font-bold shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
            >
              <Link to="/properties">Browse Properties</Link>
            </Button>
            <Button
              asChild
              className="bg-white/15 hover:bg-white/25 text-white border border-white/30 rounded-full px-8 py-3.5 text-sm font-semibold backdrop-blur-sm transition-all"
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
        filters={{
          amenities: filters.amenities,
          bathrooms: filters.bathrooms,
          availableFrom: filters.availableFrom,
        }}
        onFiltersChange={onFiltersChange}
        onClearFilters={clearFilters}
        onApplyFilters={handleSearch}
      />
    </div>
  );
};

export default Index;
