import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Home, 
  Search, 
  Shield, 
  FileText, 
  MessageSquare, 
  Calendar,
  CheckCircle2,
  ArrowRight,
  Zap,
  Lock,
  CreditCard,
  Wrench,
  Eye,
  Key,
  Building2,
  UserCheck,
  Clock
} from "lucide-react";
import { Link } from "react-router-dom";

const AboutTenant = () => {
  const features = [
    {
      icon: Search,
      title: "Easy Property Search",
      description: "Search thousands of verified properties across South Africa. Filter by location, price, bedrooms, and more to find your perfect home.",
      color: "text-ocean-blue"
    },
    {
      icon: Shield,
      title: "Verified Landlords",
      description: "All landlords are verified with ID checks. You can trust that listings are legitimate and landlords are who they say they are.",
      color: "text-success-green"
    },
    {
      icon: MessageSquare,
      title: "Direct Communication",
      description: "Chat directly with landlords through our secure messaging system. Ask questions, schedule viewings, and get answers fast.",
      color: "text-ocean-blue"
    },
    {
      icon: Calendar,
      title: "Easy Viewing Booking",
      description: "Book property viewings directly through the platform. See available time slots and choose what works for you.",
      color: "text-ocean-blue"
    },
    {
      icon: FileText,
      title: "Simple Applications",
      description: "Apply for properties with just a few clicks. Upload documents, fill in details, and submit applications in minutes.",
      color: "text-ocean-blue"
    },
    {
      icon: Key,
      title: "Digital Lease Signing",
      description: "Sign your lease agreement digitally with legally binding e-signatures. No printing, scanning, or mailing required.",
      color: "text-ocean-blue"
    },
    {
      icon: CreditCard,
      title: "Secure Rent Payments",
      description: "Pay rent securely through the platform. Set up automated payments, track your payment history, and never miss a payment.",
      color: "text-ocean-blue"
    },
    {
      icon: Wrench,
      title: "Maintenance Requests",
      description: "Submit maintenance requests directly from your dashboard. Track status, communicate with landlords, and get issues resolved faster.",
      color: "text-ocean-blue"
    },
    {
      icon: Eye,
      title: "Property Inspections",
      description: "Document property condition with photos and notes. Protect yourself with detailed move-in and move-out records.",
      color: "text-ocean-blue"
    },
    {
      icon: Lock,
      title: "Secure & Private",
      description: "Your personal information is protected. We use bank-level encryption and never share your data without permission.",
      color: "text-success-green"
    },
    {
      icon: Clock,
      title: "24/7 Access",
      description: "Access your dashboard anytime, anywhere. Manage your rental, view documents, and communicate with landlords on your schedule.",
      color: "text-ocean-blue"
    },
    {
      icon: UserCheck,
      title: "Build Your Profile",
      description: "Create a verified tenant profile with your rental history, references, and credit information. Stand out to landlords.",
      color: "text-ocean-blue"
    }
  ];

  const howItWorks = [
    {
      step: 1,
      title: "Create Your Account",
      description: "Sign up in minutes and verify your identity. Build your tenant profile to stand out to landlords.",
      icon: UserCheck
    },
    {
      step: 2,
      title: "Search Properties",
      description: "Browse thousands of verified properties. Use filters to find exactly what you're looking for.",
      icon: Search
    },
    {
      step: 3,
      title: "Chat with Landlords",
      description: "Message landlords directly to ask questions, learn more about properties, and build rapport.",
      icon: MessageSquare
    },
    {
      step: 4,
      title: "Book Viewings",
      description: "Schedule property viewings at times that work for you. See available slots and book instantly.",
      icon: Calendar
    },
    {
      step: 5,
      title: "Apply Online",
      description: "Submit applications with all your documents in one place. Track application status in real-time.",
      icon: FileText
    },
    {
      step: 6,
      title: "Sign & Move In",
      description: "Sign your digital lease agreement and move in. Manage everything from your tenant dashboard.",
      icon: Key
    }
  ];

  const benefits = [
    "No agent fees - landlords save, you benefit",
    "Direct communication with property owners",
    "Verified, legitimate property listings",
    "Easy online application process",
    "Digital lease agreements",
    "Secure rent payment system",
    "Maintenance request management",
    "Property inspection tools",
    "Mobile-friendly dashboard",
    "24/7 access to your rental information"
  ];

  const safetyFeatures = [
    {
      icon: Shield,
      title: "Verified Landlords",
      description: "All landlords must verify their identity before listing properties. You know who you're dealing with."
    },
    {
      icon: Lock,
      title: "Secure Payments",
      description: "All payments are processed securely. Your financial information is protected with bank-level encryption."
    },
    {
      icon: FileText,
      title: "Legal Protection",
      description: "Digital leases are legally binding and tailored for South African law. Your rights are protected."
    },
    {
      icon: Eye,
      title: "Transparent Process",
      description: "See all property details, rental terms, and landlord information upfront. No hidden surprises."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-ocean-blue rounded-full mb-6">
            <Home className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            For Tenants
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Everything you need to know about finding and renting your perfect home on RentLekker. 
            Connect directly with landlords, apply easily, and manage your rental all in one place.
          </p>
        </div>

        {/* Why RentLekker Section */}
        <section className="mb-16">
          <div className="bg-ocean-blue/10 rounded-2xl p-8 md:p-12">
            <h2 className="text-3xl font-bold mb-6 text-center">Why Choose RentLekker?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-ocean-blue rounded-lg flex items-center justify-center flex-shrink-0">
                  <Search className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Thousands of Properties</h3>
                  <p className="text-muted-foreground">
                    Browse verified properties across South Africa. From Cape Town to Johannesburg, find your perfect home in the location you want.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-ocean-blue rounded-lg flex items-center justify-center flex-shrink-0">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Fast & Simple</h3>
                  <p className="text-muted-foreground">
                    Apply for properties in minutes, not days. Chat directly with landlords, book viewings instantly, and sign leases digitally.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-ocean-blue rounded-lg flex items-center justify-center flex-shrink-0">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Safe & Secure</h3>
                  <p className="text-muted-foreground">
                    All landlords are verified. All payments are secure. All leases are legally binding. Your safety and security are our priority.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-ocean-blue rounded-lg flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Direct Communication</h3>
                  <p className="text-muted-foreground">
                    Talk directly to property owners. No agents in between. Get answers fast, build relationships, and find your perfect match.
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

        {/* Safety Features */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">Your Safety Matters</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {safetyFeatures.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <Card key={index} className="border-2 border-success-green/20">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 bg-success-green/10 rounded-lg flex items-center justify-center mb-4">
                      <IconComponent className="h-6 w-6 text-success-green" />
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

        {/* Free to Use */}
        <section className="mb-16">
          <Card className="border-2 border-success-green">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-success-green" />
                Free for Tenants
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-lg">
                RentLekker is completely free for tenants. You can:
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-success-green mt-0.5 flex-shrink-0" />
                  <div>Search and browse all properties for free</div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-success-green mt-0.5 flex-shrink-0" />
                  <div>Apply to unlimited properties at no cost</div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-success-green mt-0.5 flex-shrink-0" />
                  <div>Chat directly with landlords</div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-success-green mt-0.5 flex-shrink-0" />
                  <div>Book property viewings</div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-success-green mt-0.5 flex-shrink-0" />
                  <div>Sign digital lease agreements</div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-success-green mt-0.5 flex-shrink-0" />
                  <div>Manage your rental from your dashboard</div>
                </li>
              </ul>
              <p className="text-muted-foreground">
                <strong>No hidden fees. No agent costs. No surprises.</strong> RentLekker is free for tenants, always.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* CTA Section */}
        <section className="text-center bg-ocean-blue/10 rounded-2xl p-12">
          <h2 className="text-3xl font-bold mb-4">Ready to Find Your Home?</h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of tenants who have found their perfect home on RentLekker. Start searching today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link to="/properties">
                Browse Properties
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/auth">
                Create Free Account
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

export default AboutTenant;

