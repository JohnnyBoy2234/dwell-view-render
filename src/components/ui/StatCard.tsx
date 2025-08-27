import * as React from "react";
import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  subText?: string;
};

export function StatCard({ label, value, icon, className, subText }: StatCardProps) {
  return (
    <div
      className={cn(
        // container
        "rounded-2xl p-4 shadow-soft ring-1 ring-ocean-blue/10",
        // subtle brand gradient background
        "bg-gradient-to-br from-ocean-blue/[0.04] via-white to-success-green/[0.04]",
        // motion and focus
        "transition hover:-translate-y-[1px] hover:shadow-lg focus-within:ring-2 focus-within:ring-ocean-blue/30",
        className
      )}
      role="group"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-brand.gray700">{label}</div>
          <div className="mt-1 text-xl font-semibold text-brand.gray900">{value}</div>
          {subText && (
            <div className="mt-1 text-xs text-brand.gray500">{subText}</div>
          )}
        </div>
        {icon && (
          <div className="h-10 w-10 shrink-0 rounded-xl grid place-content-center \
            bg-gradient-to-br from-ocean-blue/15 to-success-green/15 text-ocean-blue">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
