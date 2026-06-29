import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Home,
  FileText,
  Users,
  Shield,
  CheckCircle2,
  ArrowRight,
  Scale,
  ClipboardList,
  Banknote,
  Building2,
  Key,
  Stamp,
} from "lucide-react";
import { Link } from "react-router-dom";
import { SELLING_PHASES, SELLING_STEPS } from "@mzanzihomes/common/data/sellingSteps";

const phaseIcons = [Home, FileText, Scale, ClipboardList, Stamp];
const phaseColors = [
  "text-ocean-blue",
  "text-success-green",
  "text-earth-warm",
  "text-purple-600",
  "text-rose-500",
];
const phaseBg = [
  "bg-ocean-blue",
  "bg-success-green",
  "bg-earth-warm",
  "bg-purple-600",
  "bg-rose-500",
];

const phaseDescriptions: Record<string, { summary: string; bullets: string[] }> = {
  Preparation: {
    summary: "Get your paperwork in order before going to market.",
    bullets: [
      "Locate your title deed and get a current rates statement",
      "Research comparable sales to set a realistic asking price",
      "Decide on a conveyancing attorney",
    ],
  },
  "Sale Agreement": {
    summary: "A signed Offer to Purchase is the foundation of the sale.",
    bullets: [
      "Review every clause in the OTP before signing",
      "Confirm price, deposit, suspensive conditions, and occupation date",
      "Both parties must sign — the OTP is legally binding once signed",
    ],
  },
  "Attorney & FICA": {
    summary: "Your conveyancing attorney manages the legal transfer process.",
    bullets: [
      "You nominate the attorney; the buyer pays transfer costs",
      "Submit FICA docs promptly (ID + proof of residence) — delays here hold up everything",
      "The attorney cancels any existing bond on the property",
    ],
  },
  "Transfer Process": {
    summary: "Certificates, duties, and documents all come together here.",
    bullets: [
      "Seller provides compliance certificates (electrical, plumbing, gas)",
      "Buyer pays Transfer Duty to SARS (properties under R1.1M are exempt)",
      "Municipality issues Rates Clearance Certificate — allow 2–6 weeks",
    ],
  },
  Registration: {
    summary: "The Deeds Office officially transfers ownership.",
    bullets: [
      "Attorney lodges all documents at the Deeds Office",
      "Registration takes 7–10 working days after lodgement",
      "On registration, the attorney pays net proceeds to the seller",
    ],
  },
};

const benefits = [
  "Zero agent commission — keep 100% of your sale proceeds",
  "List your property directly to verified buyers",
  "Upload and manage sale documents in one place",
  "Communicate directly with interested buyers",
  "Track your selling journey step by step",
  "Understand your legal obligations at each stage",
  "Guided process aligned with SA conveyancing law",
  "Mobile-friendly — manage from anywhere",
];

const AboutSeller = () => {
  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-ocean-blue rounded-full mb-6">
            <Key className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            For Sellers
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Selling property in South Africa involves a structured legal process called conveyancing.
            MzanziHomes guides you through every step — from listing to registration — with zero agent fees
            and full transparency.
          </p>
        </div>

        {/* Why MzanziHomes Section */}
        <section className="mb-16">
          <div className="bg-ocean-blue/10 rounded-2xl p-8 md:p-12">
            <h2 className="text-3xl font-bold mb-6 text-center">Why Sell on MzanziHomes?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-ocean-blue rounded-lg flex items-center justify-center flex-shrink-0">
                  <Banknote className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Zero Commission</h3>
                  <p className="text-muted-foreground">
                    Traditional estate agents charge 5–7.5% (+ VAT) on the sale price. On a R2,000,000
                    property, that's R115,000–R172,500. With MzanziHomes, every rand goes to you.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-ocean-blue rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Direct Buyer Access</h3>
                  <p className="text-muted-foreground">
                    Connect directly with verified, serious buyers. No middlemen filtering your
                    inquiries or pushing buyers toward higher-commission properties.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-ocean-blue rounded-lg flex items-center justify-center flex-shrink-0">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">SA Law Compliant</h3>
                  <p className="text-muted-foreground">
                    Our selling guide is aligned with the Alienation of Land Act, FICA, and SA
                    conveyancing requirements. You'll always know what's legally required at each step.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-ocean-blue rounded-lg flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Guided Process</h3>
                  <p className="text-muted-foreground">
                    Our step-by-step journey tracker keeps you on track from listing to registration,
                    with document upload at every relevant stage.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* The 5 Phases */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-4">The Conveyancing Process</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            South African property transfers follow a well-defined legal process. Here are the 5 phases
            you'll move through when selling your property.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SELLING_PHASES.map((phase, index) => {
              const IconComponent = phaseIcons[index];
              const info = phaseDescriptions[phase];
              return (
                <Card key={phase} className="relative hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center gap-4 mb-2">
                      <div className={`w-12 h-12 ${phaseBg[index]} rounded-lg flex items-center justify-center`}>
                        <IconComponent className="h-6 w-6 text-white" />
                      </div>
                      <Badge variant="outline" className="text-sm font-bold">
                        Phase {index + 1}
                      </Badge>
                    </div>
                    <CardTitle>{phase}</CardTitle>
                    <p className="text-sm text-muted-foreground">{info.summary}</p>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {info.bullets.map((bullet, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className={`h-4 w-4 ${phaseColors[index]} mt-0.5 flex-shrink-0`} />
                          <span className="text-sm text-muted-foreground">{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* All 9 Steps */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-4">All 9 Steps at a Glance</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            From preparing your property to registration at the Deeds Office, here's every step
            you'll take on your selling journey.
          </p>
          <div className="space-y-3">
            {SELLING_STEPS.map((step) => (
              <div
                key={step.number}
                className="flex items-start gap-4 p-4 bg-white border border-gray-100 rounded-xl hover:border-ocean-blue/30 hover:shadow-sm transition-all"
              >
                <div className="w-10 h-10 bg-ocean-blue/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-ocean-blue font-bold text-sm">{step.number}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900">{step.title}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {step.phase}
                    </Badge>
                    {step.requiresUpload && (
                      <Badge variant="outline" className="text-xs text-ocean-blue border-ocean-blue/30">
                        <FileText className="h-3 w-3 mr-1" />
                        Doc required
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Benefits */}
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

        {/* Important Note */}
        <section className="mb-16">
          <Card className="border-2 border-earth-warm/40 bg-earth-warm/5">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Scale className="h-5 w-5 text-earth-warm" />
                Important Legal Note
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-muted-foreground">
              <p>
                MzanziHomes provides a guide to the SA property sale process to help you understand
                each step. We are not a legal service and cannot provide legal advice.
              </p>
              <p>
                For complex situations — estate sales, trust properties, deceased estates, divorces,
                or disputed ownership — always consult a qualified conveyancing attorney.
              </p>
              <p>
                Conveyancing attorneys are regulated by the Law Society of South Africa. Ensure your
                attorney is registered and in good standing before appointing them.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* CTA */}
        <section className="text-center bg-ocean-blue/10 rounded-2xl p-12">
          <h2 className="text-3xl font-bold mb-4">Ready to Sell?</h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            List your property for free on MzanziHomes and connect directly with verified buyers.
            Zero agent fees, full guidance, complete control.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link to="/list-sale">
                List for Sale
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/properties?type=sale">
                Browse Sale Listings
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

export default AboutSeller;
