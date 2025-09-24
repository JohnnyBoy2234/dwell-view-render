import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Lock, FileCheck, MessageSquareText } from "lucide-react";
import { Link } from "react-router-dom";

export function SafeRentingSection() {
  const safetyFeatures = [
    {
      icon: Shield,
      title: "ID & Email Verification",
      description: "Every user is verified before they can list or view properties"
    },
    {
      icon: Lock,
      title: "Fraud Protection & Moderated Listings", 
      description: "All listings are reviewed and users are monitored for suspicious activity"
    },
    {
      icon: FileCheck,
      title: "Encrypted Digital Leases",
      description: "Secure e-signature contracts with full legal protection"
    },
    {
      icon: MessageSquareText,
      title: "Secure Messaging",
      description: "Chat only with verified users through our secure platform"
    }
  ];

  return (
    <section className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="text-center mb-12">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-ocean-blue to-success-green rounded-2xl flex items-center justify-center shadow-lg">
            <Shield className="h-10 w-10 text-white" />
          </div>
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Your Safety, Our Priority
        </h2>
        <p className="text-lg text-white/80 max-w-2xl mx-auto">
          We've built comprehensive safety measures into every part of the rental process
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
        {safetyFeatures.map((feature, index) => (
          <Card key={index} className="text-center bg-white/10 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-8">
              <div className="w-16 h-16 bg-gradient-to-br from-ocean-blue to-success-green rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <feature.icon className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center">
        <Button 
          asChild 
          size="lg" 
          className="bg-gradient-to-r from-ocean-blue to-success-green hover:from-ocean-blue-dark hover:to-success-green-dark text-white rounded-xl px-8 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <Link to="/safe-renting">Learn More About Safe Renting</Link>
        </Button>
      </div>
    </section>
  );
}