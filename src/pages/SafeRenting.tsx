import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Lock, FileCheck, MessageSquareText, CheckCircle, AlertTriangle, UserCheck, CreditCard } from "lucide-react";
import { Link } from "react-router-dom";

export default function SafeRenting() {
  const safetyMeasures = [
    {
      icon: UserCheck,
      title: "Identity Verification",
      description: "Every user must verify their identity with a valid South African ID document before listing or viewing properties.",
      details: [
        "Government-issued ID verification",
        "Email address confirmation", 
        "Phone number verification",
        "Address confirmation"
      ]
    },
    {
      icon: Shield,
      title: "Fraud Protection",
      description: "Advanced fraud detection and prevention systems monitor all platform activity.",
      details: [
        "AI-powered suspicious activity detection",
        "Manual review of all listings",
        "User behavior monitoring",
        "Secure payment processing"
      ]
    },
    {
      icon: FileCheck,
      title: "Digital Lease Protection",
      description: "Legally binding digital contracts with encrypted e-signatures for full legal protection.",
      details: [
        "Lawyer-reviewed lease templates",
        "Encrypted document storage",
        "Digital signature authentication",
        "Automatic lease renewals"
      ]
    },
    {
      icon: MessageSquareText,
      title: "Secure Communication",
      description: "All communication happens through our secure, monitored messaging system.",
      details: [
        "End-to-end encrypted messaging",
        "No personal contact sharing until verified",
        "Conversation monitoring for safety",
        "Report and block functionality"
      ]
    }
  ];

  const trustIndicators = [
    "No upfront payments required",
    "Commission-free platform", 
    "24/7 customer support",
    "Insurance partnerships",
    "Legal compliance certified",
    "Data protection guaranteed"
  ];

  return (
      <div className="min-h-screen">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-ocean-blue via-ocean-blue-light to-success-green text-white py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="flex justify-center mb-8">
              <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Shield className="h-12 w-12 text-white" />
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Safe Renting, Guaranteed
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto">
              Your safety is our top priority. Learn about the comprehensive security measures that protect every rental transaction on RentLekker.
            </p>
            <Button 
              asChild
              size="lg" 
              className="bg-white text-ocean-blue hover:bg-white/90 rounded-xl px-8 py-4 text-lg font-semibold"
            >
              <Link to="/auth">Get Started Safely</Link>
            </Button>
          </div>
        </section>

        {/* Safety Measures */}
        <section className="py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                How We Keep You Safe
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Multi-layered security at every step of your rental journey
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {safetyMeasures.map((measure, index) => (
                <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <CardContent className="p-8">
                    <div className="flex items-start gap-4 mb-6">
                      <div className="w-12 h-12 bg-gradient-to-br from-ocean-blue to-success-green rounded-xl flex items-center justify-center flex-shrink-0">
                        <measure.icon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-foreground mb-2">
                          {measure.title}
                        </h3>
                        <p className="text-muted-foreground">
                          {measure.description}
                        </p>
                      </div>
                    </div>
                    <ul className="space-y-2">
                      {measure.details.map((detail, detailIndex) => (
                        <li key={detailIndex} className="flex items-center gap-3 text-sm text-muted-foreground">
                          <CheckCircle className="h-4 w-4 text-success-green flex-shrink-0" />
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Trust Indicators */}
        <section className="py-16 bg-gradient-to-br from-success-green/5 to-ocean-blue/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Why Landlords & Tenants Trust Us
              </h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trustIndicators.map((indicator, index) => (
                <div key={index} className="flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-sm">
                  <CheckCircle className="h-5 w-5 text-success-green flex-shrink-0" />
                  <span className="text-foreground font-medium">{indicator}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Warning Section */}
        <section className="py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <Card className="border-l-4 border-l-earth-warm bg-earth-warm/5">
              <CardContent className="p-8">
                <div className="flex items-start gap-4">
                  <AlertTriangle className="h-8 w-8 text-earth-warm flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-4">
                      Stay Safe: Never Pay Outside the Platform
                    </h3>
                    <div className="space-y-3 text-muted-foreground">
                      <p>
                        • Never wire money, send cash, or pay with gift cards
                      </p>
                      <p>
                        • Don't give out personal information before verification
                      </p>
                      <p>
                        • Always use RentLekker's secure messaging system
                      </p>
                      <p>
                        • Report suspicious activity immediately
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-gradient-to-r from-ocean-blue to-success-green text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Rent Safely?
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Join thousands of verified landlords and tenants on South Africa's safest rental platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                asChild
                size="lg" 
                className="bg-white text-ocean-blue hover:bg-white/90 rounded-xl px-8 py-4 text-lg font-semibold"
              >
                <Link to="/list-property">List Your Property</Link>
              </Button>
              <Button 
                asChild
                size="lg" 
                variant="outline"
                className="border-white text-white hover:bg-white/10 rounded-xl px-8 py-4 text-lg font-semibold"
              >
                <Link to="/properties">Find a Rental</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
  );
}