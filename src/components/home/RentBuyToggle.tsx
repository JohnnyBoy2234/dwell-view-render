import { cn } from "@/lib/utils";

interface RentBuyToggleProps {
  value: "rent" | "sale";
  onChange: (value: "rent" | "sale") => void;
  className?: string;
}

export function RentBuyToggle({ value, onChange, className }: RentBuyToggleProps) {
  return (
    <div className={cn("flex gap-2 justify-center mb-4", className)}>
      <button
        onClick={() => onChange("rent")}
        className={cn(
          "px-6 py-2 rounded-full font-semibold text-sm transition-all duration-200",
          value === "rent"
            ? "bg-ocean-blue text-white shadow-lg"
            : "bg-white/80 text-muted-foreground hover:bg-white hover:text-foreground border border-border"
        )}
      >
        Rent
      </button>
      <button
        onClick={() => onChange("sale")}
        className={cn(
          "px-6 py-2 rounded-full font-semibold text-sm transition-all duration-200",
          value === "sale"
            ? "bg-ocean-blue text-white shadow-lg"
            : "bg-white/80 text-muted-foreground hover:bg-white hover:text-foreground border border-border"
        )}
      >
        Buy
      </button>
    </div>
  );
}
