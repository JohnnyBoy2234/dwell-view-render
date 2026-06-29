import { Card, CardContent, CardHeader, CardTitle } from "@mzanzihomes/ui/components/card";
import { Button } from "@mzanzihomes/ui/components/button";
import { Badge } from "@mzanzihomes/ui/components/badge";
import { 
  Building2, 
  Users, 
  Shield, 
  BadgePercent, 
  Calculator, 
  MessageSquare, 
  FileText, 
  Wrench, 
  CheckCircle2,
  ArrowRight,
  Zap,
  Lock,
  BarChart3,
  Calendar,
  CreditCard,
  Home
} from "lucide-react";
import { Link } from "react-router-dom";

const AboutLandlord = () => {
  const features = [
    {
      icon: BadgePercent,
      title: "Zero Commission",
      description: "Keep 100% of your rental income. No agent fees, no hidden costs, no surprises. Every rand you earn stays in your pocket.",
      color: "text-success-green"
    },
    {
      icon: Building2,
      title: "Easy Property Listing",
      description: "List your property in minutes with our simple, guided process. Upload photos, add details, set your price, and you're live.",
      color: "text-ocean-blue"
    },
    {
      icon: Users,
      title: "Quality Tenants",
      description: "Connect directly with verified, credit-checked tenants. Review applications, chat with prospects, and choose who you want.",
      color: "text-ocean-blue"
    },
    {
      icon: Shield,
      title: "Verified & Secure",
      description: "All tenants are verified with ID checks and credit screening. Legally binding digital leases protect your investment.",
      color: "text-success-green"
    },
    {
      icon: MessageSquare,
      title: "Direct Communication",
      description: "Chat directly with tenants through our secure messaging system. No middlemen, no delays, just clear communication.",
      color: "text-ocean-blue"
    },
    {
      icon: FileText,
      title: "Digital Leases",
      description: "Create professional, legally binding lease agreements tailored for South African law. E-signatures make it fast and secure.",
      color: "text-ocean-blue"
    },
    {
      icon: Wrench,
      title: "Maintenance Management",
      description: "Tenants submit maintenance requests through their dashboard. Track, manage, and resolve issues all in one place.",
      color: "text-ocean-blue"
    },
    {
      icon: Calculator,
      title: "SwiftBooks Accounting",
      description: "Built-in accounting tools track income, expenses, and generate professional invoices. Everything you need for tax time.",
      color: "text-ocean-blue"
    },
    {
      icon: BarChart3,
      title: "Property Analytics",
      description: "Track your portfolio performance, occupancy rates, and rental income. Make data-driven decisions about your properties.",
      color: "text-ocean-blue"
    },
    {
      icon: Calendar,
      title: "Viewing Management",
      description: "Schedule and manage property viewings with our integrated calendar system. Tenants can book slots that work for you.",
      color: "text-ocean-blue"
    },
    {
      icon: CreditCard,
      title: "Automated Rent Collection",
      description: "Set up automated rent collection. Track payments, send reminders, and never chase rent again.",
      color: "text-ocean-blue"
    },
    {
      icon: Lock,
      title: "Inventory Tracking",
      description: "Document property condition with timestamped photos and notes. Protect yourself with detailed move-in/move-out records.",
      color: "text-ocean-blue"
    }
  ];

  const howItWorks = [
    {
      step: 1,
      title: "Create Your Account",
      description: "Sign up in minutes. Verify your identity and you're ready to list your first property.",
      icon: Home
    },
    {
      step: 2,
      title: "List Your Property",
      description: "Add photos, property details, rental price, and availability. Your listing goes live instantly.",
      icon: Building2
    },
    {
      step: 3,
      title: "Receive Applications",
      description: "Verified tenants apply directly. Review applications, check credit scores, and chat with prospects.",
      icon: Users
    },
    {
      step: 4,
      title: "Schedule Viewings",
      description: "Tenants book viewing slots through the platform. You approve times that work for you.",
      icon: Calendar
    },
    {
      step: 5,
      title: "Sign Digital Lease",
      description: "Create a professional lease agreement. Both parties sign digitally with legally binding e-signatures.",
      icon: FileText
    },
    {
      step: 6,
      title: "Manage Your Property",
      description: "Track rent payments, handle maintenance requests, and manage everything from your dashboard.",
      icon: BarChart3
    }
  ];

  const benefits = [
    "Save thousands in agent commissions every year",
    "Full control over who rents your property",
    "Direct communication with tenants",
    "Professional digital lease agreements",
    "Automated rent collection and reminders",
    "Built-in accounting and invoicing",
    "Maintenance request management",
    "Property portfolio analytics",
    "Mobile-friendly dashboard",
    "24/7 access from anywhere"
  ];

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-ocean-blue rounded-full mb-6">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            For Landlords
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Everything you need to know about renting your property on MzanziHomes. 
            Keep 100% of your rental income, connect directly with quality tenants, and manage everything from one powerful dashboard.
          </p>
        </div>

        {/* Why MzanziHomes Section */}
        <section className="mb-16">
          <div className="bg-ocean-blue/10 rounded-2xl p-8 md:p-12">
            <h2 className="text-3xl font-bold mb-6 text-center">Why Choose MzanziHomes?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-ocean-blue rounded-lg flex items-center justify-center flex-shrink-0">
                  <BadgePercent className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Zero Commission</h3>
                  <p className="text-muted-foreground">
                    Traditional agents charge 8-12% commission. On a R15,000/month rental, that's R1,200-R1,800 per month or R14,400-R21,600 per year. With MzanziHomes, you keep every single rand.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-ocean-blue rounded-lg flex items-center justify-center flex-shrink-0">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Faster Rentals</h3>
                  <p className="text-muted-foreground">
                    List your property in minutes, not days. Connect directly with tenants, schedule viewings instantly, and sign leases digitally. No waiting for agents to respond.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-ocean-blue rounded-lg flex items-center justify-center flex-shrink-0">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Verified Tenants</h3>
                  <p className="text-muted-foreground">
                    All tenants are verified with ID checks and credit screening. You see their credit scores, employment status, and rental history before making a decision.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-ocean-blue rounded-lg flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Complete Control</h3>
                  <p className="text-muted-foreground">
                    You decide who rents your property. Review applications, chat with tenants, and make informed decisions. No pressure from agents pushing their preferred tenants.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {howItWorks.map((item) => {
              const IconComponent = item.icon;
              return (
                <Card key={item.step} className="relative">
                  <CardHeader>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-ocean-blue rounded-lg flex items-center justify-center">
                        <IconComponent className="h-6 w-6 text-white" />
                      </div>
                      <Badge variant="outline" className="text-lg font-bold">
                        Step {item.step}
                      </Badge>
                    </div>
                    <CardTitle>{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{item.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Features Grid */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">Everything You Need</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className={`w-12 h-12 ${feature.color.replace('text-', 'bg-')}/10 rounded-lg flex items-center justify-center mb-4`}>
                      <IconComponent className={`h-6 w-6 ${feature.color}`} />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Benefits List */}
        <section className="mb-16">
          <div className="bg-gradient-to-br from-ocean-blue/5 to-white rounded-2xl p-8 md:p-12">
            <h2 className="text-3xl font-bold mb-8 text-center">Key Benefits</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-success-green flex-shrink-0" />
                  <span className="text-lg">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Info */}
        <section className="mb-16">
          <Card className="border-2 border-ocean-blue">
            <CardHeader>
              <CardTitle className="text-2xl">Transparent Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-lg">
                MzanziHomes offers flexible plans to suit landlords of all sizes:
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-success-green mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Free Plan:</strong> Perfect for trying out MzanziHomes. List properties, receive applications, and connect with tenants.
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-success-green mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Pro Plan:</strong> Full access to all features including digital leases, SwiftBooks accounting, maintenance management, and more.
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-success-green mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Premium Plan:</strong> Everything in Pro plus priority support, advanced analytics, and premium features.
                  </div>
                </li>
              </ul>
              <p className="text-muted-foreground">
                <strong>Remember:</strong> No matter which plan you choose, you keep 100% of your rental income. Zero commission, always.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* CTA Section */}
        <section className="text-center bg-ocean-blue/10 rounded-2xl p-12">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of landlords who are already saving money and managing their properties more efficiently with MzanziHomes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link to="/list-property">
                List Your Property
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/pricing">
                View Pricing Plans
              </Link>
            </Button>
          </div>
        </section>

        {/* Back to About */}
        <div className="mt-12 text-center">
          <Link to="/about" className="text-ocean-blue hover:underline">
            ← Back to About
          </Link>
        </div>
      </main>
    </div>
  );
};

export default AboutLandlord;

