import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Search, Eye, CalendarCheck, FileText } from "lucide-react";
import React from "react";

const TenantCard: React.FC = () => {
  return (
    <Card
      data-testid="tenant-card"
      className="max-w-xl mx-auto bg-white border border-[#e5e7eb] rounded-2xl shadow-sm"
    >
      <CardHeader className="space-y-2">
        <CardTitle asChild>
          <h3 className="text-xl font-bold text-[hsl(var(--sr-ink))]">For Tenants</h3>
        </CardTitle>
        <p className="text-sm text-[hsl(var(--sr-muted))]">
          Follow four simple steps to rent with confidence on SwiftRent.
        </p>
      </CardHeader>
      <CardContent className="space-y-0">
        <ol>
          <li
            data-testid="tenant-step-1"
            className="flex gap-4"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--sr-blue)/0.1)] font-semibold text-[hsl(var(--sr-blue))]">
              1
            </span>
            <div className="flex-1">
              <h4 className="flex items-center gap-2 font-semibold text-[hsl(var(--sr-ink))]">
                <Search
                  className="h-6 w-6 text-[hsl(var(--sr-blue))]"
                  aria-hidden="true"
                />
                Search &amp; Discover
              </h4>
              <ul className="mt-2 ml-5 list-disc space-y-1 text-[hsl(var(--sr-muted))]">
                <li>Browse available listings on SwiftRent.</li>
                <li>View full property details, photos, and rental terms.</li>
                <li>No hidden agent fees — everything is transparent.</li>
              </ul>
            </div>
          </li>

          <li
            data-testid="tenant-step-2"
            className="mt-6 flex gap-4 border-t border-[#e5e7eb] pt-6"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--sr-blue)/0.1)] font-semibold text-[hsl(var(--sr-blue))]">
              2
            </span>
            <div className="flex-1">
              <h4 className="flex flex-wrap items-center gap-2 font-semibold text-[hsl(var(--sr-ink))]">
                <Eye
                  className="h-6 w-6 text-[hsl(var(--sr-blue))]"
                  aria-hidden="true"
                />
                <span>Request to View</span>
                <span className="text-sm font-normal">(with ID Verification)</span>
                <span
                  data-testid="tenant-id-verified-chip"
                  aria-label="ID Verified"
                  className="ml-2 rounded-full bg-[hsl(var(--sr-green)/0.1)] px-2 py-0.5 text-xs font-medium text-[hsl(var(--sr-green))]"
                >
                  ID Verified
                </span>
              </h4>
              <ul className="mt-2 ml-5 list-disc space-y-1 text-[hsl(var(--sr-muted))]">
                <li>
                  Choose the property you’d like to view and send a request
                  directly to the landlord.
                </li>
                <li>
                  To verify your identity, you must take a photo of your ID next
                  to your face and submit it securely.
                </li>
                <li>Verification will not take longer than 24 hours.</li>
                <li>
                  Only verified requests are passed on to landlords — ensuring
                  safety for both sides.
                </li>
              </ul>
              <p className="mt-2 text-xs text-[hsl(var(--sr-muted))]">
                Your ID image is encrypted in transit and deleted after
                verification.
              </p>
            </div>
          </li>

          <li
            data-testid="tenant-step-3"
            className="mt-6 flex gap-4 border-t border-[#e5e7eb] pt-6"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--sr-blue)/0.1)] font-semibold text-[hsl(var(--sr-blue))]">
              3
            </span>
            <div className="flex-1">
              <h4 className="flex items-center gap-2 font-semibold text-[hsl(var(--sr-ink))]">
                <CalendarCheck
                  className="h-6 w-6 text-[hsl(var(--sr-blue))]"
                  aria-hidden="true"
                />
                Confirm Landlord Viewing Time
              </h4>
              <ul className="mt-2 ml-5 list-disc space-y-1 text-[hsl(var(--sr-muted))]">
                <li>The landlord sets the available viewing times.</li>
                <li>You confirm one of the available slots.</li>
                <li>
                  SwiftRent sends confirmations and reminders automatically.
                </li>
              </ul>
            </div>
          </li>

          <li
            data-testid="tenant-step-4"
            className="mt-6 flex gap-4 border-t border-[#e5e7eb] pt-6"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--sr-blue)/0.1)] font-semibold text-[hsl(var(--sr-blue))]">
              4
            </span>
            <div className="flex-1">
              <h4 className="flex items-center gap-2 font-semibold text-[hsl(var(--sr-ink))]">
                <FileText
                  className="h-6 w-6 text-[hsl(var(--sr-blue))]"
                  aria-hidden="true"
                />
                Submit All Standard Documents
              </h4>
              <ul className="mt-2 ml-5 list-disc space-y-1 text-[hsl(var(--sr-muted))]">
                <li>
                  After viewing, you will be asked to submit all the standard
                  rental documents (proof of income, references, bank
                  statements, etc.).
                </li>
                <li>
                  SwiftRent will guide you step-by-step through the process to
                  ensure nothing is missed.
                </li>
                <li>
                  Once submitted, your application goes directly to the landlord
                  for review.
                </li>
              </ul>
            </div>
          </li>
        </ol>
      </CardContent>
    </Card>
  );
};

export default TenantCard;
