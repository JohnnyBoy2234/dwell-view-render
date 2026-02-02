import { Users, TrendingUp, Shield, Zap, HeadphonesIcon, Building2 } from "lucide-react";

const valueProps = [
  {
    icon: TrendingUp,
    title: "Grow Your Business",
    description: "Access thousands of qualified tenants actively searching for properties in your area.",
  },
  {
    icon: Shield,
    title: "Verified Platform",
    description: "All users are verified. Credit-checked tenants and secure digital lease agreements.",
  },
  {
    icon: Zap,
    title: "Fast & Simple",
    description: "List properties in minutes. Manage agents, viewings, and applications from one dashboard.",
  },
  {
    icon: Users,
    title: "Agent Management",
    description: "Create sub-accounts for your agents. Track performance and assign listings effortlessly.",
  },
  {
    icon: HeadphonesIcon,
    title: "Dedicated Support",
    description: "Priority support for agencies. We're here to help you succeed on RentLekker.",
  },
  {
    icon: Building2,
    title: "Property Tools",
    description: "Digital leases, condition reports, maintenance tracking, and accounting built-in.",
  },
];

export function AgencyValueProps() {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Why Partner with RentLekker?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Join South Africa's fastest-growing rental platform and take your agency to the next level
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {valueProps.map((prop, index) => (
            <div
              key={index}
              className="bg-card rounded-xl p-6 shadow-sm border border-border hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 rounded-lg bg-ocean-blue/10 flex items-center justify-center mb-4">
                <prop.icon className="h-6 w-6 text-ocean-blue" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {prop.title}
              </h3>
              <p className="text-muted-foreground text-sm">
                {prop.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-8 md:gap-16 flex-wrap justify-center">
            <div className="text-center">
              <div className="text-4xl font-bold text-ocean-blue">500+</div>
              <div className="text-sm text-muted-foreground">Active Agencies</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-ocean-blue">10,000+</div>
              <div className="text-sm text-muted-foreground">Properties Listed</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-ocean-blue">50,000+</div>
              <div className="text-sm text-muted-foreground">Monthly Searches</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
