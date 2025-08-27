import * as React from "react";
import { cn } from "@/lib/utils";

type SectionHeaderProps = {
  title: string;
  action?: React.ReactNode;
  className?: string;
};

export function SectionHeader({ title, action, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div className="flex items-center gap-3 min-w-0">
        <h3 className="text-sm font-semibold text-brand-gray-900 truncate">{title}</h3>
      </div>
      <div className="flex items-center gap-2">
        {action}
      </div>
    </div>
  );
}
