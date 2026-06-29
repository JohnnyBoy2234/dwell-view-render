import { Link } from "react-router-dom";
import { CheckCircle2, ArrowRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SELLING_STEPS } from "@mzanzihomes/common/data/sellingSteps";

export function SellingStepsPreview() {
  return (
    <div className="py-10 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900">How to Sell Your Property</h3>
            <p className="text-sm text-gray-500 mt-1">
              9 steps from listing to registration — guided by MzanziHomes
            </p>
          </div>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="hidden sm:flex border-gray-200 text-gray-700 hover:bg-white rounded-full px-5 text-sm font-semibold"
          >
            <Link to="/about/seller">
              Full Guide
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {/* Horizontal scroll strip */}
        <div className="overflow-x-auto pb-3 -mx-4 px-4">
          <div className="flex gap-3 w-max">
            {SELLING_STEPS.map((step) => (
              <div
                key={step.number}
                className="flex-shrink-0 w-44 bg-white border border-gray-100 rounded-2xl p-4 hover:border-ocean-blue/30 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 bg-ocean-blue/10 rounded-full flex items-center justify-center">
                    <span className="text-ocean-blue font-bold text-xs">{step.number}</span>
                  </div>
                  {step.requiresUpload && (
                    <FileText className="h-3.5 w-3.5 text-gray-400" />
                  )}
                </div>
                <p className="text-xs font-semibold text-gray-900 leading-snug mb-1">
                  {step.title}
                </p>
                <p
                  className="text-xs font-medium"
                  style={{ color: "hsl(214 100% 45%)" }}
                >
                  {step.phase}
                </p>
              </div>
            ))}

            {/* Final CTA card */}
            <div className="flex-shrink-0 w-44 bg-ocean-blue rounded-2xl p-4 flex flex-col items-start justify-between">
              <CheckCircle2 className="h-6 w-6 text-white mb-3" />
              <div>
                <p className="text-sm font-bold text-white mb-2">Property Sold!</p>
                <Link
                  to="/about/seller"
                  className="text-xs text-white/80 hover:text-white underline-offset-2 hover:underline"
                >
                  Read the full guide →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile CTA */}
        <div className="mt-4 sm:hidden">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="w-full border-gray-200 text-gray-700 rounded-full text-sm font-semibold"
          >
            <Link to="/about/seller">
              View Full Selling Guide
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
