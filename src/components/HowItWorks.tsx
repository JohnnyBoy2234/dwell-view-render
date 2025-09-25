import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Users,
  Building2,
  Mail,
  Shield,
  DollarSign,
  ArrowRight,
} from "lucide-react";
import TenantCard from "./TenantCard";
import React from "react";
import { SectionHeader } from "@/components/ui/SectionHeader";

const landlordData = {
  header: {
    icon: <Users className="h-5 w-5 sm:h-6 sm:w-6 text-white" />,
    title: "For Landlords",
    subtitle: "List Your Property",
    description:
      "List your property and connect with quality tenants without paying agent commissions.",
  },
  steps: [
    {
      icon: <Building2 className="h-4 w-4 text-white" />,
      title: "List Your Property",
      description:
        "Create a professional listing in minutes with photos, details, and your rental price.",
      badges: ["Easy Setup", "Photo Upload", "Rich Descriptions"],
    },
    {
      icon: <Mail className="h-4 w-4 text-white" />,
      title: "Book Viewings",
      description:
        "Chat directly with tenants and schedule viewings at times that suit you.",
      badges: ["Direct Contact", "Scheduling", "No Agents"],
    },
    {
      icon: <Shield className="h-4 w-4 text-white" />,
      title: "Recieve Applications",
      description:
        "Get organized applications online, review instantly, and screen tenants with confidence.",
      badges: ["Easy Applications", "Screening", "Fast Processing"],
    },
    {
      icon: <DollarSign className="h-4 w-4 text-white" />,
      title: "Manage & Collect",
      description:
        "Collect rent online with secure payments and track everything in one place.",
      badges: ["Online Payments", "Maintenance Tracking", "Financial Reports"],
    },
  ],
  cta: {
    text: "List Your Property",
    link: "/list-property",
  },
};

const landlordColors = [
  "from-success-green to-success-green-glow",
  "from-earth-warm to-earth-warm-dark",
  "from-ocean-blue to-ocean-blue-light",
  "from-purple-500 to-purple-600",
];

const LandlordCard: React.FC = () => {
  const data = landlordData;
  const colors = landlordColors;
  return (
    <Card className="shadow-strong overflow-hidden transition-all duration-500 animate-fade-in border-success-green/20 bg-gradient-to-br from-white via-white to-success-green/5">
      <CardHeader className="pb-6 bg-gradient-to-r from-success-green/10 to-success-green/5">
        <div className="mb-2 flex items-center gap-3">
          <div className="shadow-soft flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-success-green to-success-green-glow sm:h-12 sm:w-12">
            {data.header.icon}
          </div>
          <div>
            <CardTitle className="text-xl text-success-green-dark sm:text-2xl">
              {data.header.title}
            </CardTitle>
            <Badge variant="outline" className="mt-1 text-xs">
              {data.header.subtitle}
            </Badge>
          </div>
        </div>
        <p className="text-sm text-muted-foreground sm:text-base">
          {data.header.description}
        </p>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-6">
        {data.steps.map((step, index) => (
          <div className="flex gap-3" key={index}>
            <div
              className={`shadow-soft flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${colors[index]}`}
            >
              {step.icon}
            </div>
            <div className="flex-1">
              <h3 className="mb-2 text-base font-semibold sm:text-lg">
                {step.title}
              </h3>
              <p className="mb-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                {step.description}
              </p>
              <div className="flex flex-wrap gap-1">
                {step.badges.map((badge, i) => (
                  <Badge variant="secondary" className="text-xs" key={i}>
                    {badge}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        ))}
        <div className="border-t pt-3">
          <Link to={data.cta.link}>
            <Button className="w-full bg-success-green text-white shadow-soft hover:bg-success-green-dark text-sm">
              {data.cta.text}
              <ArrowRight className="ml-2 h-3 w-3" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

const HowItWorks: React.FC = () => {
  const [userType, setUserType] = useState<"tenant" | "landlord">("tenant");
  const isTenant = userType === "tenant";

  return (
    <div className="bg-[hsl(var(--sr-bg))]">
      <section className="py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                  <SectionHeader
          title="How SwiftRent Works"
          subtitle="Connecting landlords and tenants directly with no agents, zero commission, and full control"
          showTagline={false}
        />
        </div>

        <div className="pb-12 md:hidden">
          <div className="flex items-center justify-center space-x-4">
            <Label
              htmlFor="user-type-toggle"
              className={`font-medium transition-colors ${isTenant ? "text-[hsl(var(--sr-blue))]" : "text-[hsl(var(--sr-muted))]"}`}
            >
              For Tenants
            </Label>
            <Switch
              id="user-type-toggle"
              checked={!isTenant}
              onCheckedChange={() =>
                setUserType(isTenant ? "landlord" : "tenant")
              }
              className={`transition-colors ${
                !isTenant
                  ? "bg-[hsl(var(--sr-green))]"
                  : "bg-[hsl(var(--sr-blue))]"
              }`}
            />
            <Label
              htmlFor="user-type-toggle"
              className={`font-medium transition-colors ${!isTenant ? "text-[hsl(var(--sr-green))]" : "text-[hsl(var(--sr-muted))]"}`}
            >
              For Landlords
            </Label>
          </div>
        </div>

        <div className="pb-8 sm:pb-12 lg:pb-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="relative">
              <div className="md:hidden">
                {isTenant ? <TenantCard /> : <LandlordCard />}
              </div>
              <div className="hidden md:grid md:grid-cols-2 md:gap-8 lg:gap-12">
                <TenantCard />
                <LandlordCard />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HowItWorks;
