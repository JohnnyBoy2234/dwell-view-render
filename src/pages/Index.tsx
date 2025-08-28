import { Button } from "@/components/ui/button";
import "@/styles/animations.css";

import { Property24SearchBar } from "@/components/search/Property24SearchBar";
import {MoreFiltersModal} from "@/components/search/MoreFiltersModal";

import PropertyCard from "@/components/PropertyCard";
import { BenefitsSlider } from "@/components/BenefitsSlider";

import {
  usePropertySearchFilters,
} from "@/hooks/usePropertySearchFilters";

import { ArrowRight, CheckCircle, Home } from "lucide-react";

import { Link, useNavigate } from "react-router-dom";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, useScroll, useTransform, useAnimation, AnimatePresence } from "framer-motion";
import HowItWorks from "@/components/HowItWorks";

// Framer Motion variants for reusable animations
import { Variants } from 'framer-motion';

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      type: "spring" as const,
      stiffness: 100,
      damping: 10
    }
  },
  hover: {
    y: -8,
    scale: 1.02,
    boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
    transition: { 
      type: "spring" as const,
      stiffness: 300,
      damping: 15
    }
  }
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3
    }
  }
};

const featureCardHover: Variants = {
  hover: {
    y: -8,
    scale: 1.02,
    boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
    transition: { 
      type: "spring",
      stiffness: 300,
      damping: 15
    }
  }
};

const buttonHover: Variants = {
  hover: { 
    scale: 1.05,
    transition: { 
      type: "spring" as const,
      stiffness: 400,
      damping: 10
    }
  },
  tap: { 
    scale: 0.98,
    transition: { 
      type: "spring" as const,
      stiffness: 1000,
      damping: 30
    }
  }
};

function AnimatedCounter({ from = 0, to, duration = 1200 }: { from?: number; to: number; duration?: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [val, setVal] = useState(from);
  useEffect(() => {
    let raf = 0;
    let start = 0;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        start = performance.now();
        const step = (t: number) => {
          const p = Math.min(1, (t - start) / duration);
          const eased = 1 - Math.pow(1 - p, 3);
          setVal(Math.round(from + (to - from) * eased));
          if (p < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
        obs.disconnect();
      }
    }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => { cancelAnimationFrame(raf); obs.disconnect(); };
  }, [from, to, duration]);
  return <div ref={ref}>{val.toLocaleString()}</div>;
}

// 3D tilt helper (no deps)
function useTilt() {
  const onMove = (e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width; // 0..1
    const py = (e.clientY - rect.top) / rect.height; // 0..1
    const rx = (0.5 - py) * 10; // rotateX
    const ry = (px - 0.5) * 10; // rotateY
    el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0)`;
  };
  const onLeave = (e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget as HTMLElement;
    el.style.transform = `perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0)`;
  };
  return { onMove, onLeave };
}

// Magnetic hover helper (no deps)
function useMagnet(intensity = 12) {
  const onMove = (e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const dx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const dy = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    el.style.transform = `translate(${dx * intensity}px, ${dy * intensity}px)`;
  };
  const onLeave = (e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget as HTMLElement;
    el.style.transform = `translate(0, 0)`;
  };
  return { onMove, onLeave };
}

const Index = () => {
  // Scroll-linked animations
  const { scrollYProgress } = useScroll();
  const y1 = useTransform(scrollYProgress, [0, 0.5], [0, -100]);
  const y2 = useTransform(scrollYProgress, [0, 0.5], [0, -50]);
  const opacity = useTransform(scrollYProgress, [0, 0.1], [1, 0]);
  
  // Animation controls for staggered entrance
  const controls = useAnimation();
  
  useEffect(() => {
    controls.start("visible");
  }, [controls]);
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const navigate = useNavigate();

  // Use the unified search filters hook
  const { filters, updateFilters, executeSearch } = usePropertySearchFilters();

  // Advanced filters state
  const [advancedFilters, setAdvancedFilters] = useState({
    propertyTypes: [] as string[],
    amenities: [] as string[],
    bathrooms: "Any" as string,
    availableFrom: null as Date | null,
  });

  // No results state for hero section
  const [showNoResults, setShowNoResults] = useState(false);

  // merge partial updates coming from Property24SearchBar
  const onFiltersChange = (patch: Partial<typeof filters>) => {
    updateFilters(patch);
    setShowNoResults(false); // Clear no results when filters change
  };

  // Execute search using the hook
  const applyFilters = () => {
    executeSearch();
  };

  const handleSearch = () => {
    // Clear any previous no results state
    setShowNoResults(false);
    // ensure latest filters (including location) are used
    applyFilters();
  };

  // Handle search when pressing Enter in the search input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };
  

  // Featured properties for the homepage
  const featuredProperties = [
    {
      id: "1",
      title: "Modern 2-Bedroom Apartment in Sandton",
      location: "Sandton, Johannesburg",
      price: 15000,
      beds: 2,
      baths: 2,
      parking: 1,
      image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      type: "Apartment" as const,
      featured: true,
    },
    {
      id: "2",
      title: "Spacious Family House with Garden",
      location: "Rosebank, Cape Town",
      price: 22000,
      beds: 4,
      baths: 3,
      parking: 2,
      image: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      type: "House" as const,
    },
    {
      id: "3",
      title: "Luxury Townhouse Near Waterfront",
      location: "V&A Waterfront, Cape Town",
      price: 35000,
      beds: 3,
      baths: 2,
      parking: 2,
      image: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      type: "Townhouse" as const,
      featured: true,
    },
  ];

  // Removed unused parallax hook

  const tilt = useTilt();
  const magnet = useMagnet();

  return (
    <div className="min-h-screen bg-background">
      
      {/* Hero Section with Scroll-Linked Parallax */}
      <motion.section 
        className="relative text-white overflow-hidden"
        initial="hidden"
        animate={controls}
        variants={staggerContainer}
      >
        {/* Premium Gradient Overlay */}
        <motion.div 
          className="absolute inset-0 bg-gradient-to-br from-ocean-blue/90 via-ocean-blue-dark/85 to-success-green/80"
          style={{ y: y1 }}
        />
        
        {/* Aurora blobs with parallax */}
        <motion.div className="home-aurora" style={{ y: y2 }}>
          <motion.div 
            className="blob --1" 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease: [0.2, 0.8, 0.2, 1] }}
          />
          <motion.div 
            className="blob --2"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
          />
          <motion.div 
            className="blob --3"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
          />
        </motion.div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 lg:py-40">
          <motion.div 
            className="text-center"
            variants={staggerContainer}
          >
            <motion.h1 
              className="text-4xl md:text-6xl font-bold mb-6 tracking-tight"
              variants={fadeInUp}
            >
              <span className="block">Find Your Perfect</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-100">Rental Home</span>
            </motion.h1>
            <motion.p 
              className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto mb-8"
              variants={fadeInUp}
            >
              Discover thousands of rental properties across South Africa
            </motion.p>
            <motion.div 
              className="max-w-xl mx-auto"
              variants={fadeInUp}
            >
              <div onKeyDown={handleKeyDown}>
                <Property24SearchBar
                  filters={filters}
                  onFiltersChange={onFiltersChange}
                  onSearch={handleSearch}
                  onMoreFiltersOpen={() => setMoreFiltersOpen(true)}
                />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* Trusted by + value props marquee */}
      <section className="py-6 bg-background/60 border-t border-b border-border/50">
        <div className="text-center text-sm text-muted-foreground mb-3">Trusted by renters and landlords across SA</div>
        <div className="home-marquee">
          <div className="home-marquee-track gap-8 px-4 sm:px-8">
            {Array.from({ length: 2 }).map((_, loop) => (
              <div className="flex gap-8 pr-8" key={loop}>
                {[
                  'Zero Commission',
                  'Secure Payments',
                  'Instant Messaging',
                  'Maintenance Manager',
                  'Digital Lease Signing',
                  'Verified Listings',
                  'Smart Search',
                ].map((tag) => (
                  <span key={`${loop}-${tag}`} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted text-foreground/80 border border-border">
                    <span className="w-1.5 h-1.5 rounded-full bg-success-green" /> {tag}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose SwiftRent - Animated Grid */}
      <motion.section 
        className="py-16 md:py-24 bg-background overflow-hidden"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={staggerContainer}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-12"
            variants={fadeInUp}
          >
            <h2 className="text-3xl font-bold mb-4">Why Choose SwiftRent?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We're redefining the rental experience with modern technology and exceptional service.
            </p>
          </motion.div>
          
          <motion.div 
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={staggerContainer}
          >
            {[
              {
                title: 'Zero commission',
                desc: 'No hidden fees, no surprise costs. What you see is what you pay.',
                icon: '💰',
              },
              {
                title: 'Verified listings',
                desc: 'Every property is vetted to ensure quality and accuracy.',
                icon: '✅',
              },
              {
                title: '24/7 support',
                desc: 'Our team is always here to help with any questions or issues.',
                icon: '🛟',
              },
              {
                title: 'Digital contracts',
                desc: 'Sign your lease online in minutes, no printing or scanning needed.',
                icon: '📝',
              },
              {
                title: 'Secure payments',
                desc: 'Modern rails and automated receipts for peace of mind.',
                icon: '💳',
              },
              {
                title: 'Insights & reports',
                desc: 'Track applications, tenants, and performance at a glance.',
                icon: '📊',
              },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                className="relative feature-card rounded-xl border border-border bg-gradient-to-b from-background to-muted/40 p-6 overflow-hidden"
                variants={fadeInUp}
                whileHover="hover"
                initial="hidden"
                viewport={{ once: true }}
                custom={i}
                style={{ 
                  transformStyle: "preserve-3d",
                  willChange: "transform"
                }}
                onMouseMove={e => {
                  const el = e.currentTarget;
                  const rect = el.getBoundingClientRect();
                  const px = (e.clientX - rect.left) / rect.width;
                  const py = (e.clientY - rect.top) / rect.height;
                  const rx = (0.5 - py) * 15;
                  const ry = (px - 0.5) * 15;
                  el.style.setProperty('--rx', `${rx}deg`);
                  el.style.setProperty('--ry', `${ry}deg`);
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget;
                  el.style.setProperty('--rx', '0deg');
                  el.style.setProperty('--ry', '0deg');
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-ocean-blue/5 to-success-green/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10">
                  <motion.div 
                    className="text-3xl mb-3 select-none inline-block"
                    whileHover={{ 
                      scale: 1.2,
                      rotate: [0, 10, -10, 0],
                      transition: { duration: 0.5 }
                    }}
                    aria-hidden
                  >
                    {f.icon}
                  </motion.div>
                  <h3 className="text-xl font-semibold mb-2">{f.title}</h3>
                  <p className="text-muted-foreground">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* How It Works Section */}
      <HowItWorks />

      {/* Featured Properties */}
      <section className="py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Featured Properties</h2>
            <p className="text-lg text-muted-foreground">
              Discover handpicked properties across South Africa's major cities
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {featuredProperties.map((property) => (
              <PropertyCard key={property.id} {...property} />
            ))}
          </div>
          
          <div className="text-center">
            <Link to="/properties">
              <Button size="lg" variant="outline">
                View All Properties
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>


      {/* Stats Section with animated counters */}
      <section className="py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-primary mb-2"><AnimatedCounter to={5000} />+</div>
              <div className="text-muted-foreground">Active Properties</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2"><AnimatedCounter to={15000} />+</div>
              <div className="text-muted-foreground">Happy Tenants</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">98%</div>
              <div className="text-muted-foreground">Success Rate</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">24/7</div>
              <div className="text-muted-foreground">Support</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section with Magnetic Buttons */}
      <motion.section 
        className="py-20 bg-gradient-to-br from-ocean-blue via-ocean-blue-light to-success-green text-white relative overflow-hidden"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ 
          opacity: 1, 
          y: 0,
          transition: { 
            type: "spring",
            stiffness: 60,
            damping: 15
          }
        }}
        viewport={{ once: true, margin: "-100px" }}
      >
        <motion.div 
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
          animate={{
            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.h2 
            className="text-3xl font-bold mb-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ 
              opacity: 1, 
              y: 0,
              transition: { 
                delay: 0.2,
                type: "spring",
                stiffness: 100,
                damping: 15
              }
            }}
            viewport={{ once: true }}
          >
            Ready to Find Your Next Home?
          </motion.h2>
          <motion.p 
            className="text-xl mb-8 text-white/90"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ 
              opacity: 1, 
              y: 0,
              transition: { 
                delay: 0.3,
                type: "spring",
                stiffness: 100,
                damping: 15
              }
            }}
            viewport={{ once: true }}
          >
            Join thousands of satisfied customers who found their perfect rental through SwiftRent
          </motion.p>
          <motion.div 
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ 
              opacity: 1, 
              y: 0,
              transition: { 
                delay: 0.4,
                type: "spring",
                stiffness: 100,
                damping: 15
              }
            }}
            viewport={{ once: true }}
          >
            <Link to="/properties">
              <motion.div
                whileHover="hover"
                whileTap="tap"
                variants={buttonHover}
                className="relative overflow-hidden"
              >
                <Button 
                  size="lg" 
                  variant="secondary" 
                  className="relative overflow-hidden"
                >
                  <span
                    className="magnet"
                    onMouseMove={e => {
                      const el = e.currentTarget;
                      const rect = el.getBoundingClientRect();
                      const dx = (e.clientX - (rect.left + rect.width / 2)) / 10;
                      const dy = (e.clientY - (rect.top + rect.height / 2)) / 10;
                      el.style.transform = `translate(${dx}px, ${dy}px)`;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'translate(0, 0)';
                    }}
                  >
                    Browse Properties
                  </span>
                </Button>
              </motion.div>
            </Link>
            <Link to="/list-property">
              <motion.div
                whileHover="hover"
                whileTap="tap"
                variants={buttonHover}
                className="relative overflow-hidden"
              >
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="relative overflow-hidden text-white border-white/80 hover:bg-white hover:text-ocean-blue backdrop-blur-sm bg-white/10"
                >
                  <span
                    className="magnet"
                    onMouseMove={e => {
                      const el = e.currentTarget;
                      const rect = el.getBoundingClientRect();
                      const dx = (e.clientX - (rect.left + rect.width / 2)) / 10;
                      const dy = (e.clientY - (rect.top + rect.height / 2)) / 10;
                      el.style.transform = `translate(${dx}px, ${dy}px)`;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'translate(0, 0)';
                    }}
                  >
                    List Your Property
                  </span>
                </Button>
              </motion.div>
            </Link>
          </motion.div>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="bg-muted py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-ocean-blue to-success-green rounded-lg flex items-center justify-center">
                  <Home className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold">SwiftRent</span>
              </div>
              <p className="text-muted-foreground">
                Connecting landlords and tenants directly across South Africa.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">For Tenants</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link to="/properties" className="hover:text-primary">Browse Properties</Link></li>
                <li><Link to="/how-it-works" className="hover:text-primary">How It Works</Link></li>
                <li><a href="#" className="hover:text-primary">Rental Tips</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">For Landlords</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-primary">List Property</a></li>
                <li><a href="#" className="hover:text-primary">Pricing Guide</a></li>
                <li><a href="#" className="hover:text-primary">Landlord Resources</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link to="/about" className="hover:text-primary">About Us</Link></li>
                <li><a href="#" className="hover:text-primary">Contact</a></li>
                <li><a href="#" className="hover:text-primary">Help Center</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-border mt-8 pt-8 text-center text-muted-foreground">
            <p>&copy; 2024 SwiftRent. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
