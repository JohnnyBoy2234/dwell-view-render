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
        "rounded-2xl ring-1 ring-black/5 bg-white shadow-soft p-4",
        "transition hover:-translate-y-[1px] hover:shadow-lg focus-within:ring-2 focus-within:ring-brand-blue/40",
        className
      )}
      role="group"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-brand-gray-700">{label}</div>
          <div className="mt-1 text-xl font-semibold text-brand-gray-900">{value}</div>
          {subText && (
            <div className="mt-1 text-xs text-brand-gray-500">{subText}</div>
          )}
        </div>
        {icon && (
          <div className="h-10 w-10 shrink-0 rounded-xl bg-brand-blue/10 text-brand-blue grid place-content-center">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
