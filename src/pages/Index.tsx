import { useState, useEffect, useRef } from "react";
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
import { ImageWithSkeleton } from "@/components/ui/ImageWithSkeleton";
import { Shield, CheckCircle, ArrowRight, MessageSquare, Smartphone, Zap, LayoutDashboard, Calculator, Layers, TrendingUp, Users, Lock, Sparkles } from "lucide-react";

const dummyBlogPost = {
  id: "safe-transparent-new-way",
  title: "Safe, Simple, and Transparent - The New Way to Rent in South Africa",
  excerpt: "Renting shouldn't feel risky or confusing. Discover how RentLekker combines verified safety, data protection, and complete transparency to create a new standard for renting in South Africa.",
  publishedAt: "2024-12-19",
  readTime: 4,
  category: "Safety & Trust",
  featured: true,
};

const RIcon = ({ className }: { className?: string; }) => <div className={`${className} flex items-center justify-center font-bold text-lg`}>R</div>;

const Index = () => {
  const { filters, updateFilters, executeSearch, clearFilters } = usePropertySearchFilters();
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const heroRef = useRef<HTMLDivElement>(null);

  const onFiltersChange = (patch: Partial<typeof filters>) => {
    updateFilters(patch);
  };

  const handleSearch = () => {
    executeSearch();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (heroRef.current) {
        const rect = heroRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        setMousePosition({ x: (x - 0.5) * 20, y: (y - 0.5) * 20 });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return <div className="min-h-screen">
      {/* Enhanced Hero Section */}
      <section className="relative overflow-hidden" ref={heroRef}>
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-ocean-blue via-ocean-blue/95 to-ocean-blue/90" />
          <div className="absolute inset-0">
            <div className="absolute top-20 left-10 w-32 h-32 bg-white/5 rounded-full blur-xl animate-soft-float" />
            <div className="absolute top-40 right-20 w-24 h-24 bg-white/3 rounded-full blur-lg animate-soft-float" style={{ animationDelay: '2s' }} />
            <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-white/4 rounded-full blur-2xl animate-soft-float" style={{ animationDelay: '4s' }} />
          </div>
          <div className="absolute inset-0 bg-[url(&quot;data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Ccircle cx='7' cy='7' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />
        </div>
        
        <div className="relative z-10 flex flex-col items-center justify-center w-full py-16 md:py-24 lg:py-32">
          <div className="absolute top-10 left-4 md:left-10 animate-fade-in" style={{ animationDelay: '0.2s', transform: `translate(${mousePosition.x * 0.3}px, ${mousePosition.y * 0.3}px)` }}>
            <div className="glass-card px-4 py-2 rounded-full">
              <div className="flex items-center gap-2 text-white text-sm font-medium">
                <TrendingUp className="h-4 w-4" />
                <span>100% Commission-Free</span>
              </div>
            </div>
          </div>
          
          <div className="absolute top-10 right-4 md:right-10 animate-fade-in" style={{ animationDelay: '0.4s', transform: `translate(${mousePosition.x * 0.2}px, ${mousePosition.y * 0.2}px)` }}>
            <div className="glass-card px-4 py-2 rounded-full">
              <div className="flex items-center gap-2 text-white text-sm font-medium">
                <Users className="h-4 w-4" />
                <span>Verified Properties</span>
              </div>
            </div>
          </div>
          
          <div className="absolute bottom-20 left-4 md:left-10 animate-fade-in" style={{ animationDelay: '0.6s', transform: `translate(${mousePosition.x * 0.25}px, ${mousePosition.y * 0.25}px)` }}>
            <div className="glass-card px-4 py-2 rounded-full">
              <div className="flex items-center gap-2 text-white text-sm font-medium">
                <Lock className="h-4 w-4" />
                <span>Secure Platform</span>
              </div>
            </div>
          </div>
          
          <div className="max-w-4xl mx-auto text-center px-4 animate-fade-in">
            <div className="glass-card p-8 md:p-12 rounded-3xl mb-8">
              <div className="flex items-center justify-center gap-2 mb-6">
                <Sparkles className="h-5 w-5 text-white/80" />
                <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30 transition-colors">
                  South Africa's Trusted Rental Platform
                </Badge>
                <Sparkles className="h-5 w-5 text-white/80" />
              </div>
              
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white leading-tight mb-6 font-sans">
                <span className="block bg-gradient-to-r from-white via-white/95 to-white/90 bg-clip-text text-transparent">
                  Renting done right.
                </span>
              </h1>
              
              <p className="text-xl md:text-2xl text-white/90 font-sans leading-relaxed mb-8 max-w-3xl mx-auto">
                Simple, secure, and commission-free property rental
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                <div className="flex items-center gap-2 text-white/80 text-sm">
                  <CheckCircle className="h-4 w-4 text-success-green" />
                  <span>No Agent Fees</span>
                </div>
                <div className="flex items-center gap-2 text-white/80 text-sm">
                  <CheckCircle className="h-4 w-4 text-success-green" />
                  <span>Verified Listings</span>
                </div>
                <div className="flex items-center gap-2 text-white/80 text-sm">
                  <CheckCircle className="h-4 w-4 text-success-green" />
                  <span>Digital Leases</span>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-20 w-full px-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="max-w-5xl mx-auto">
              <div className="glass-card p-2 md:p-3 rounded-2xl transition-all duration-500 hover:shadow-2xl">
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
                }} className="w-full" />
              </div>
            </div>
          </div>
        </div>

        <div className="w-full px-4 pt-0 pb-16 relative">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <div className="relative group">
                  <ImageWithSkeleton
                    src="/hero3.jpg"
                    alt="Modern rental living space"
                    className="w-full h-[300px] md:h-[400px] object-cover rounded-3xl shadow-2xl transition-all duration-500 group-hover:scale-[1.02]"
                    skeletonClassName="rounded-3xl"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-3xl" />
                </div>
              </div>
              <div className="space-y-6">
                <div className="glass-card p-6 rounded-2xl animate-fade-in" style={{ animationDelay: '0.5s' }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-success-green/20 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-success-green" />
                    </div>
                    <h3 className="font-semibold text-white">Save Thousands</h3>
                  </div>
                  <p className="text-white/80 text-sm">No commission fees means you keep more of your money</p>
                </div>
                
                <div className="glass-card p-6 rounded-2xl animate-fade-in" style={{ animationDelay: '0.7s' }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-ocean-blue/20 rounded-full flex items-center justify-center">
                      <Shield className="h-5 w-5 text-ocean-blue" />
                    </div>
                    <h3 className="font-semibold text-white">Fully Verified</h3>
                  </div>
                  <p className="text-white/80 text-sm">All properties and tenants are thoroughly screened</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced For Landlords Section */}
      <section className="bg-gradient-to-br from-white via-background to-white py-20 md:py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url(&quot;data:image/svg+xml,%3Csvg width=&quot;40&quot; height=&quot;40&quot; viewBox=&quot;0 0 40 40&quot; xmlns=&quot;http://www.w3.org/2000/svg&quot;%3E%3Cg fill=&quot;%23666666&quot; fill-opacity=&quot;0.02&quot;%3E%3Cpath d=&quot;M0 0h40v40H0z&quot;/%3E%3Cpath d=&quot;M20 20h20v20H20z&quot;/%3E%3C/g%3E%3C/svg%3E&quot;)]" />
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-1 lg:order-1 space-y-8">
              <div className="space-y-4">
                <Badge className="w-fit bg-ocean-blue/10 text-ocean-blue border-ocean-blue/20 hover:bg-ocean-blue/20 transition-colors">
                  For Landlords
                </Badge>
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                  List Your
                  <span className="block bg-gradient-to-r from-ocean-blue to-ocean-blue/80 bg-clip-text text-transparent">
                    Rental Property
                  </span>
                </h2>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  We find you tenants and help with referencing, contracts and more. RentLekker gives you the best possible chance of finding your ideal tenant, and you stay in control.
                </p>
              </div>
              
              <div className="space-y-4">
                {[
                  { icon: CheckCircle, text: "100% Commission-Free" },
                  { icon: CheckCircle, text: "No Hidden Fees" },
                  { icon: CheckCircle, text: "Full Property Management Tools" },
                  { icon: CheckCircle, text: "Verified Tenant Screening" },
                  { icon: CheckCircle, text: "All Landlord and Tenant Records Securely Stored By RentLekker" }
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/30 transition-colors group">
                    <div className="w-8 h-8 bg-success-green/10 rounded-full flex items-center justify-center group-hover:bg-success-green/20 transition-colors">
                      <item.icon className="h-4 w-4 text-success-green" />
                    </div>
                    <span className="text-foreground font-medium">{item.text}</span>
                  </div>
                ))}
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button asChild size="lg" className="bg-ocean-blue hover:bg-ocean-blue/90 text-white rounded-xl px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                  <Link to="/list-property" className="flex items-center gap-2">
                    Add Listing
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-ocean-blue text-ocean-blue hover:bg-ocean-blue/5 rounded-xl px-8 py-4 text-lg font-semibold transition-all duration-300">
                  <Link to="/about/landlord">Learn More</Link>
                </Button>
              </div>
            </div>
            
            <div className="order-2 lg:order-2 relative">
              <div className="relative group">
                <div className="absolute -inset-4 bg-gradient-to-r from-ocean-blue/20 to-success-green/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500" />
                <ImageWithSkeleton 
                  src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                  alt="Business people discussing at office table" 
                  className="relative w-full h-[320px] md:h-[400px] lg:h-[450px] object-cover rounded-3xl shadow-2xl transition-all duration-500 group-hover:scale-[1.02]"
                  skeletonClassName="rounded-3xl"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent rounded-3xl" />
              </div>
              
              <div className="absolute -bottom-6 -right-6 bg-white rounded-2xl shadow-xl p-4 animate-fade-in" style={{ animationDelay: '0.8s' }}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-success-green/10 rounded-full flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-success-green" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Save up to</p>
                    <p className="text-2xl font-bold text-foreground">R20,000+</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced For Tenants Section */}
      <section className="bg-gradient-to-br from-muted/20 via-background to-muted/20 py-20 md:py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url(&quot;data:image/svg+xml,%3Csvg width=&quot;60&quot; height=&quot;60&quot; viewBox=&quot;0 0 60 60&quot; xmlns=&quot;http://www.w3.org/2000/svg&quot;%3E%3Cg fill=&quot;%23666666&quot; fill-opacity=&quot;0.02&quot;%3E%3Ccircle cx=&quot;30&quot; cy=&quot;30&quot; r=&quot;2&quot;/%3E%3C/g%3E%3C/svg%3E&quot;)]" />
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1 relative">
              <div className="relative group">
                <div className="absolute -inset-4 bg-gradient-to-r from-success-green/20 to-ocean-blue/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500" />
                <ImageWithSkeleton 
                  src="https://images.unsplash.com/photo-1606788075819-9574a6edfab3?q=80&w=1168&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                  alt="Happy family in their home" 
                  className="relative w-full h-[320px] md:h-[400px] lg:h-[450px] object-cover rounded-3xl shadow-2xl transition-all duration-500 group-hover:scale-[1.02]"
                  skeletonClassName="rounded-3xl"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent rounded-3xl" />
              </div>
              
              <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl shadow-xl p-4 animate-fade-in" style={{ animationDelay: '1s' }}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-ocean-blue/10 rounded-full flex items-center justify-center">
                    <Shield className="h-6 w-6 text-ocean-blue" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Verified</p>
                    <p className="text-2xl font-bold text-foreground">100%</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="order-1 lg:order-2 space-y-8">
              <div className="space-y-4">
                <Badge className="w-fit bg-success-green/10 text-success-green border-success-green/20 hover:bg-success-green/20 transition-colors">
                  For Tenants
                </Badge>
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                  Find Your
                  <span className="block bg-gradient-to-r from-success-green to-success-green/80 bg-clip-text text-transparent">
                    Next Home
                  </span>
                </h2>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  On RentLekker there are never any agent fees. We verify all listings so no dead adverts. Your safety and security are our priority.
                </p>
              </div>
              
              <div className="space-y-4">
                {[
                  { icon: CheckCircle, text: "No Agent Fees" },
                  { icon: CheckCircle, text: "Verified Properties" },
                  { icon: CheckCircle, text: "Direct Communication with Landlords" },
                  { icon: CheckCircle, text: "Secure Digital Leases" }
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/30 transition-colors group">
                    <div className="w-8 h-8 bg-success-green/10 rounded-full flex items-center justify-center group-hover:bg-success-green/20 transition-colors">
                      <item.icon className="h-4 w-4 text-success-green" />
                    </div>
                    <span className="text-foreground font-medium">{item.text}</span>
                  </div>
                ))}
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button asChild size="lg" className="bg-success-green hover:bg-success-green/90 text-white rounded-xl px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                  <Link to="/properties" className="flex items-center gap-2">
                    Find Rental
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-success-green text-success-green hover:bg-success-green/5 rounded-xl px-8 py-4 text-lg font-semibold transition-all duration-300">
                  <Link to="/about/tenant">Learn More</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Properties */}
      <section className="pt-8 md:pt-12 pb-16 md:pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
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

      {/* Blog of Week Section */}
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
      <section className="py-16 md:py-24 bg-gradient-to-r from-ocean-blue to-ocean-blue/90 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url(&quot;data:image/svg+xml,%3Csvg width=&quot;60&quot; height=&quot;60&quot; viewBox=&quot;0 0 60 60&quot; xmlns=&quot;http://www.w3.org/2000/svg&quot;%3E%3Cg fill=&quot;%23ffffff&quot; fill-opacity=&quot;0.05&quot;%3E%3Ccircle cx=&quot;30&quot; cy=&quot;30&quot; r=&quot;3&quot;/%3E%3C/g%3E%3C/svg%3E&quot;)]" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            <span className="text-white/90">Rent Smarter. Rent Safer.</span><br />
            <span className="text-white">With RentLekker.</span>
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join South Africa's most trusted rental platform today
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-white text-ocean-blue hover:bg-white/90 rounded-xl px-8 py-4 text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
              <Link to="/properties" className="flex items-center gap-2">
                Get Started
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          </div>
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
