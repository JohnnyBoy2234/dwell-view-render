import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Eye, CalendarCheck, FileText, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import React from "react";

const tenantData = {
  header: {
    icon: <Search className="h-5 w-5 sm:h-6 sm:w-6 text-white" />,
    title: "For Tenants",
    subtitle: "Find Your Home",
    description:
      "Follow four simple steps to rent with confidence and ease on SwiftRent.",
  },
  steps: [
    {
      icon: <Search className="h-4 w-4 text-white" />,
      title: "Search & Discover",
      description:
        "Browse available listings on SwiftRent with full property details, photos, and transparent rental terms.",
      badges: ["No Hidden Fees", "Full Details", "Photo Gallery"],
    },
    {
      icon: <Eye className="h-4 w-4 text-white" />,
      title: "Request to View",
      description:
        "Send viewing requests directly to landlords with secure ID verification for safety.",
      badges: ["ID Verified", "Direct Contact", "24hr Verification"],
    },
    {
      icon: <CalendarCheck className="h-4 w-4 text-white" />,
      title: "Confirm Viewing",
      description:
        "The landlord sets available times, you confirm a slot, and SwiftRent handles reminders.",
      badges: ["Easy Scheduling", "Auto Reminders", "Flexible Times"],
    },
    {
      icon: <FileText className="h-4 w-4 text-white" />,
      title: "Submit Documents",
      description:
        "Complete your rental application with guided document submission and instant landlord review.",
      badges: ["Guided Process", "Standard Documents", "Quick Review"],
    },
  ],
  cta: {
    text: "Browse Properties",
    link: "/properties",
  },
};

const tenantColors = [
  "from-ocean-blue to-ocean-blue-light",
  "from-earth-warm to-earth-warm-dark", 
  "from-success-green to-success-green-glow",
  "from-purple-500 to-purple-600",
];

const TenantCard: React.FC = () => {
  const data = tenantData;
  const colors = tenantColors;
  
  return (
    <Card className="shadow-strong overflow-hidden transition-all duration-500 animate-fade-in border-ocean-blue/20 bg-gradient-to-br from-white via-white to-ocean-blue/5">
      <CardHeader className="pb-6 bg-gradient-to-r from-ocean-blue/10 to-ocean-blue/5">
        <div className="mb-2 flex items-center gap-3">
          <div className="shadow-soft flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-ocean-blue to-ocean-blue-light sm:h-12 sm:w-12">
            {data.header.icon}
          </div>
          <div>
            <CardTitle className="text-xl text-ocean-blue-dark sm:text-2xl">
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
            <Button className="w-full bg-ocean-blue text-white shadow-soft hover:bg-ocean-blue-dark text-sm">
              {data.cta.text}
              <ArrowRight className="ml-2 h-3 w-3" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

export default TenantCard;