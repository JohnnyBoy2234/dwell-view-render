import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch"; // Import the Switch component
import { Label } from "@/components/ui/label"; // Import the Label component
import { 
  Search, Home, Users, Shield, Star, ArrowRight,
  MessageSquare, Calendar, FileText, DollarSign, Mail, Building2
} from "lucide-react";
import { Link } from "react-router-dom";

// --- Data Objects for Cleaner Code ---
const tenantData = {
  header: {
    icon: <Home className="h-5 w-5 sm:h-6 sm:w-6 text-white" />,
    title: "For Tenants",
    subtitle: "Find Your Home",
    description: "Discover your perfect rental home with complete transparency and direct landlord contact."
  },
  steps: [
    { icon: <Search className="h-4 w-4 text-white" />, title: "Search & Discover", description: "Browse thousands of verified properties with detailed photos, descriptions, and transparent pricing.", badges: ["Advanced Filters", "Interactive Maps", "Verified Listings"] },
    { icon: <MessageSquare className="h-4 w-4 text-white" />, title: "Connect Directly", description: "Message landlords directly, book viewings, and ask questions without any intermediaries.", badges: ["Direct Messaging", "Quick Responses", "No Agents"] },
    { icon: <Calendar className="h-4 w-4 text-white" />, title: "Schedule Viewings", description: "Book convenient viewing times and get instant confirmations from landlords.", badges: ["Online Booking", "Flexible Times", "Instant Confirmation"] },
    { icon: <FileText className="h-4 w-4 text-white" />, title: "Apply & Sign", description: "Submit applications online and sign lease agreements digitally for a seamless process.", badges: ["Digital Applications", "E-Signatures", "Fast Processing"] }
  ],
  cta: {
    text: "Start Your Search",
    link: "/properties"
  }
};

const landlordData = {
  header: {
    icon: <Users className="h-5 w-5 sm:h-6 sm:w-6 text-white" />,
    title: "For Landlords",
    subtitle: "List Your Property",
    description: "List your property and connect with quality tenants without paying agent commissions."
  },
  steps: [
    { icon: <Building2 className="h-4 w-4 text-white" />, title: "List Your Property", description: "Create detailed listings with professional photos and comprehensive property information.", badges: ["Easy Setup", "Photo Upload", "Rich Descriptions"] },
    { icon: <Mail className="h-4 w-4 text-white" />, title: "Receive Applications", description: "Get applications directly from interested tenants with all their information organized.", badges: ["Direct Contact", "Organized Inbox", "Quick Reviews"] },
    { icon: <Shield className="h-4 w-4 text-white" />, title: "Screen & Verify", description: "Access tenant screening tools and background checks to make informed decisions.", badges: ["Credit Checks", "References", "Employment Verification"] },
    { icon: <DollarSign className="h-4 w-4 text-white" />, title: "Manage & Collect", description: "Use our property management tools and online rent collection system.", badges: ["Online Payments", "Maintenance Tracking", "Financial Reports"] }
  ],
  cta: {
    text: "List Your Property",
    link: "/list-property"
  }
};

const HowItWorks = () => {
  const [userType, setUserType] = useState('tenant'); // 'tenant' or 'landlord'
  const isTenant = userType === 'tenant';
  const activeData = isTenant ? tenantData : landlordData;

  // Define icon colors based on user type
  const iconColors = {
    tenant: ['from-ocean-blue to-ocean-blue-light', 'from-earth-warm to-earth-warm-dark', 'from-success-green to-success-green-glow', 'from-purple-500 to-purple-600'],
    landlord: ['from-success-green to-success-green-glow', 'from-earth-warm to-earth-warm-dark', 'from-ocean-blue to-ocean-blue-light', 'from-purple-500 to-purple-600']
  };
  const activeIconColors = isTenant ? iconColors.tenant : iconColors.landlord;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-earth-light/20 to-ocean-blue/5">
      {/* Hero Section */}
      <section className="py-12 sm:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-ocean-blue to-success-green bg-clip-text text-transparent">
              How SwiftRent Works
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-muted-foreground mb-8 sm:mb-12">
              Connecting landlords and tenants directly with no agents, zero commission, and full control
            </p>
          </div>
        </div>
      </section>

      {/* --- NEW: Toggle Switch Section --- */}
      <section className="pb-12">
        <div className="flex items-center justify-center space-x-4">
          <Label htmlFor="user-type-toggle" className={`font-medium transition-colors ${isTenant ? 'text-primary' : 'text-muted-foreground'}`}>
            For Tenants
          </Label>
          <Switch
            id="user-type-toggle"
            checked={!isTenant}
            onCheckedChange={(checked) => setUserType(checked ? 'landlord' : 'tenant')}
            aria-label="Toggle between tenant and landlord view"
          />
          <Label htmlFor="user-type-toggle" className={`font-medium transition-colors ${!isTenant ? 'text-primary' : 'text-muted-foreground'}`}>
            For Landlords
          </Label>
        </div>
      </section>

      {/* Main Content - Now a single centered column */}
      <section className="pb-8 sm:pb-12 lg:pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative">
            {/* --- DYNAMIC CONTENT CARD --- */}
            <Card key={userType} className={`shadow-strong overflow-hidden transition-all duration-500 animate-fade-in ${isTenant ? 'border-ocean-blue/20 bg-gradient-to-br from-white via-white to-ocean-blue/5' : 'border-success-green/20 bg-gradient-to-br from-white via-white to-success-green/5'}`}>
              <CardHeader className={`pb-6 ${isTenant ? 'bg-gradient-to-r from-ocean-blue/10 to-ocean-blue/5' : 'bg-gradient-to-r from-success-green/10 to-success-green/5'}`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shadow-soft ${isTenant ? 'bg-gradient-to-br from-ocean-blue to-ocean-blue-light' : 'bg-gradient-to-br from-success-green to-success-green-glow'}`}>
                    {activeData.header.icon}
                  </div>
                  <div>
                    <CardTitle className={`text-xl sm:text-2xl ${isTenant ? 'text-ocean-blue-dark' : 'text-success-green-dark'}`}>{activeData.header.title}</CardTitle>
                    <Badge variant="outline" className="mt-1 text-xs">{activeData.header.subtitle}</Badge>
                  </div>
                </div>
                <p className="text-sm sm:text-base text-muted-foreground">
                  {activeData.header.description}
                </p>
              </CardHeader>
              
              <CardContent className="p-6 sm:p-8 space-y-6">
                {activeData.steps.map((step, index) => (
                  <div className="flex gap-4" key={index}>
                    <div className={`w-8 h-8 bg-gradient-to-br ${activeIconColors[index]} rounded-full flex items-center justify-center flex-shrink-0 shadow-soft`}>
                      {step.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-base sm:text-lg mb-2">{step.title}</h3>
                      <p className="text-sm sm:text-base text-muted-foreground mb-3">{step.description}</p>
                      <div className="flex flex-wrap gap-2">
                        {step.badges.map((badge, i) => <Badge variant="secondary" className="text-xs" key={i}>{badge}</Badge>)}
                      </div>
                    </div>
                  </div>
                ))}
                
                <div className="pt-4 border-t">
                  <Link to={activeData.cta.link}>
                    <Button className={`w-full text-white shadow-soft ${isTenant ? 'bg-ocean-blue hover:bg-ocean-blue-dark' : 'bg-success-green hover:bg-success-green-dark'}`}>
                      {activeData.cta.text}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits Section (remains the same) */}
      <section>{/* ... Your existing benefits section ... */}</section>

      {/* --- DYNAMIC CTA Section --- */}
      <section className="py-16 sm:py-20 bg-gradient-to-br from-ocean-blue via-ocean-blue-light to-success-green text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">
            {isTenant ? "Ready to Find Your Home?" : "Ready to List Your Property?"}
          </h2>
          <p className="text-lg sm:text-xl mb-8 text-white/90 max-w-3xl mx-auto">
            Join thousands of satisfied customers who found their perfect rental match through SwiftRent
          </p>
          <div className="flex justify-center">
            <Link to={activeData.cta.link}>
              <Button size="lg" variant="secondary" className="w-full">
                {isTenant ? <Home className="h-5 w-5 mr-2" /> : <Users className="h-5 w-5 mr-2" />}
                {activeData.cta.text}
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HowItWorks;