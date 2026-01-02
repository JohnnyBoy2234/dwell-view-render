import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Property24SearchBar } from "@/components/search/Property24SearchBar";
import { MoreFiltersModal } from "@/components/search/MoreFiltersModal";
import { usePropertySearchFilters } from "@/hooks/usePropertySearchFilters";
import { TestimonialsCarousel } from "@/components/TestimonialsCarousel";
import { BlogPostCard } from "@/components/blog/BlogPostCard";
import { Footer } from "@/components/Footer";
import { Shield, CheckCircle, ArrowRight, MessageSquare, Smartphone, Zap, LayoutDashboard, Calculator, Layers } from "lucide-react";

const dummyBlogPost = {
  id: "safe-transparent-new-way",
  title: "Safe, Simple, and Transparent - The New Way to Rent in South Africa",
  excerpt: "Renting shouldn\'t feel risky or confusing. Discover how RentLekker combines verified safety, data protection, and complete transparency to create a new standard for renting in South Africa.",
  publishedAt: "2024-12-19",
  readTime: 4,
  category: "Safety & Trust",
  featured: true,
};

// Simple R icon for South African Rand
const RIcon = ({
  className
}: {
  className?: string;
}) => <div className={`${className} flex items-center justify-center font-bold text-lg`}>
    R
  </div>;
const Index = () => {
  const {
    filters,
    updateFilters,
    executeSearch,
    clearFilters
  } = usePropertySearchFilters();
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const onFiltersChange = (patch: Partial<typeof filters>) => {
    updateFilters(patch);
  };
  const handleSearch = () => {
    executeSearch();
  };

  // Features data
  const features = [{
    icon: RIcon,
    title: "Commission-Free Renting",
    description: "Renting the way it should be! Stop paying agents thousands. With RentLekker, you keep 100% of your rental income always.",
    gradient: "from-success-green to-success-green-glow"
  }, {
    icon: Smartphone,
    title: "State-of-the-Art Platform",
    description: "Cutting-edge tech built for landlords and tenants: smart dashboards, digital leases, e-signatures",
    gradient: "from-ocean-blue to-ocean-blue-glow"
  }, {
    icon: Zap,
    title: "Speed & Simplicity",
    description: "List, screen, and sign in minutes. No delays, no middlemen just fast, simple renting.",
    gradient: "from-purple-500 to-purple-600"
  }, {
    icon: LayoutDashboard,
    title: "All-in-One Dashboard",
    description: "Manage listings, leases, rent, maintenance and even accounting from one clean dashboard.",
    gradient: "from-orange-500 to-orange-600"
  }, {
    icon: Calculator,
    title: "Built-In Accounting & Invoices",
    description: "RentLekker generates professional invoices, saving you time and giving you peace of mind.",
    gradient: "from-teal-500 to-teal-600"
  }, {
    icon: Shield,
    title: "Safety & Trust",
    description: "Verified users. Credit-checked tenants. Legally binding contracts. Your rental, secured.",
    gradient: "from-red-500 to-red-600"
  }, {
    icon: MessageSquare,
    title: "Seamless On-Board Communication",
    description: "Landlords and tenants can chat, share documents, and track updates directly inside RentLekker no lost WhatsApps, no messy email chains. Everything in one secure place.",
    gradient: "from-indigo-500 to-indigo-600"
  }, {
    icon: Layers,
    title: "Unlimited Property Management",
    description: "RentLekker lets you manage one property or a hundred with ease scalable, simple, and hassle-free.",
    gradient: "from-amber-400 to-amber-600"
  }];

  // Featured properties will be loaded from the API


  return <div className="min-h-screen">
      {/* Hero Section with Glass Heading */}
      <section className="relative">
        <div className="relative w-full h-full flex items-center justify-center">
          <div className="absolute inset-0 w-full h-full bg-gradient-to-b from-ocean-blue via-ocean-blue/90 to-ocean-blue/70" />
          
          
          <div className="relative z-10 flex flex-col items-center justify-center w-full py-10 md:py-20">
            {/* Top Fade with Heading */}
            <div className="max-w-xl text-center px-4">
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-3 md:mb-4 font-sans">
                <span className="block">Renting done right.</span>
              </h1>
              <p className="text-white text-base md:text-lg font-sans leading-relaxed lg:mb-8">
                Simple, secure, and commission-free property rental
              </p>
              
            </div>

            {/* Search Bar - moved lower on mobile with mt-4 */}
            <div className="relative z-10 w-full px-4 mt-4 md:mt-0">
              <div className="max-w-4xl mx-auto">
                <div className="px-0 py-0 bg-white/90 backdrop-blur-sm rounded-xl shadow-2xl p-6 transition-all duration-300 hover:shadow-2xl hover:bg-ocean-blue/90">
                  <Property24SearchBar onSearch={handleSearch} onFiltersChange={onFiltersChange} onMoreFiltersOpen={() => setShowMoreFilters(true)} filters={{
                  searchTerm: filters.searchTerm,
                  propertyType: filters.propertyType,
                  minPrice: filters.minPrice,
                  maxPrice: filters.maxPrice,
                  bedrooms: filters.bedrooms,
                  bathrooms: filters.bathrooms,
                  propertyTypes: filters.propertyTypes || [],
                  amenities: filters.amenities || [],
                  availableFrom: filters.availableFrom
                }} className="w-full my-[15px]" />
                </div>
              </div>
            </div>
          </div>
        </div>


        <div className="w-full px-4 pt-0 pb-10 relative bg-gradient-to-b from-ocean-blue/70 to-ocean-blue/50">
          <div className="max-w-5xl mx-auto z-10 relative">
            <div className="flex flex-row gap-4 sm:gap-6 md:gap-8 overflow-hidden">
              <picture className="flex-1 min-w-0">
                <source srcSet="/hero3.avif" type="image/avif" />
                <img
                  src="/hero3.jpg"
                  alt="Modern rental living space"
                  className="w-full h-[200px] sm:h-[240px] md:h-[280px] object-cover rounded-2xl shadow-2xl"
                  loading="eager"
                />
              </picture>
             
            </div>
          </div>
        </div>
      </section>

      {/* For Landlords Section */}
      <section className="bg-white py-16 md:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Text Content */}
            <div className="order-1 md:order-1">
              <span className="text-ocean-blue font-semibold text-sm uppercase tracking-wide">For Landlords</span>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-2 mb-4">
                List Your Rental Property
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                We find you tenants and help with referencing, contracts and more. RentLekker gives you the best possible chance of finding your ideal tenant, and you stay in control.
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-success-green flex-shrink-0" />
                  <span className="text-foreground">100% Commission-Free</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-success-green flex-shrink-0" />
                  <span className="text-foreground">No Hidden Fees</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-success-green flex-shrink-0" />
                  <span className="text-foreground">Full Property Management Tools</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-success-green flex-shrink-0" />
                  <span className="text-foreground">Verified Tenant Screening</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-success-green flex-shrink-0" />
                  <span className="text-foreground">All Landlord and Tenant Records Securely Stored By RentLekker</span>
                </li>
              </ul>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button asChild size="lg" className="bg-ocean-blue hover:bg-ocean-blue/90 text-white rounded-lg px-6">
                  <Link to="/list-property">Add Listing</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-ocean-blue text-ocean-blue hover:bg-ocean-blue/5 rounded-lg px-6">
                  <Link to="/about/landlord">Learn More</Link>
                </Button>
              </div>
            </div>
            {/* Image */}
            <div className="order-2 md:order-2">

              <img 
                src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                alt="Business people discussing at office table" 
                className="w-full h-[280px] md:h-[320px] object-cover rounded-2xl shadow-xl"
              />
            </div>

          </div>
        </div>
      </section>
      

      {/* For Tenants Section */}
      <section className="bg-muted/30 py-16 md:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Image */}
            <div className="order-2 md:order-1">
              <img 
                src = "https://images.unsplash.com/photo-1606788075819-9574a6edfab3?q=80&w=1168&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                alt="Happy family in their home" 
                className="w-full h-[280px] md:h-[320px] object-cover rounded-2xl shadow-xl"
              />
            </div>
            {/* Text Content */}
            <div className="order-1 md:order-2">
              <span className="text-ocean-blue font-semibold text-sm uppercase tracking-wide">For Tenants</span>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-2 mb-4">
                Find Your Next Home
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                On RentLekker there are never any agent fees. We verify all listings so no dead adverts. Your safety and security are our priority.
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-success-green flex-shrink-0" />
                  <span className="text-foreground">No Agent Fees</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-success-green flex-shrink-0" />
                  <span className="text-foreground">Verified Properties</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-success-green flex-shrink-0" />
                  <span className="text-foreground">Direct Communication with Landlords</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-success-green flex-shrink-0" />
                  <span className="text-foreground">Secure Digital Leases</span>
                </li>
              </ul>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button asChild size="lg" className="bg-ocean-blue hover:bg-ocean-blue/90 text-white rounded-lg px-6">
                  <Link to="/properties">Find Rental</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-ocean-blue text-ocean-blue hover:bg-ocean-blue/5 rounded-lg px-6">
                  <Link to="/about/tenant">Learn More</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Properties */}
      <section className="pt-4 md:pt-6 pb-16 md:pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Featured Properties
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover verified properties from trusted landlords across South Africa
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          <div className="text-center py-8 text-muted-foreground">
            <p>Featured properties coming soon</p>
          </div>
        </div>

        <div className="text-center">
          <Button asChild size="lg" className="bg-ocean-blue hover:bg-ocean-blue/90 text-white rounded-xl px-8 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300">
            <Link to="/properties" className="flex items-center gap-2">
              View All Properties
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Testimonials */}
      <TestimonialsCarousel />

      {/* Blog of the Week Section */}
      <section className="py-16 md:py-20 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Blog of the Week
          </h2>
          <div className="max-w-md mx-auto">
            <BlogPostCard {...dummyBlogPost} />
          </div>
        </div>
      </section>

      {/* Final CTA Block */}
      <section className="py-16 md:py-24 bg-ocean-blue text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            <span className="text-white/90">Rent Smarter. Rent Safer.</span><br />
            <span className="text-white">With RentLekker.</span>
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join South Africa's most trusted rental platform today
          </p>
        </div>
      </section>


      {/* Footer */}
      <Footer />

      {/* More Filters Modal */}
      <MoreFiltersModal open={showMoreFilters} onClose={() => setShowMoreFilters(false)} filters={{
      amenities: filters.amenities,
      bathrooms: filters.bathrooms,
      availableFrom: filters.availableFrom
    }} onFiltersChange={onFiltersChange} onClearFilters={clearFilters} onApplyFilters={handleSearch} />
    </div>;
};
export default Index;