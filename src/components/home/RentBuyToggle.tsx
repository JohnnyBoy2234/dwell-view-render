import { cn } from "@/lib/utils";

interface RentBuyToggleProps {
  value: "rent" | "sale";
  onChange: (value: "rent" | "sale") => void;
  className?: string;
}

export function RentBuyToggle({ value, onChange, className }: RentBuyToggleProps) {
  return (
    <div className={cn("relative flex bg-gray-900/80 backdrop-blur-sm rounded-full p-1 w-fit mx-auto mb-4", className)}>
      {/* Sliding active indicator */}
      <div
        className={cn(
          "absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-full shadow-lg transition-transform duration-300 ease-out",
          value === "rent" ? "translate-x-1" : "translate-x-[calc(100%-8px)]"
        )}
      />
      <button
        onClick={() => onChange("rent")}
        className={cn(
          "relative z-10 px-8 py-2.5 rounded-full font-bold text-sm transition-all duration-200",
          value === "rent" ? "text-gray-900" : "text-gray-400 hover:text-gray-200"
        )}
      >
        Rent
      </button>
      <button
        onClick={() => onChange("sale")}
        className={cn(
          "relative z-10 px-8 py-2.5 rounded-full font-bold text-sm transition-all duration-200",
          value === "sale" ? "text-gray-900" : "text-gray-400 hover:text-gray-200"
        )}
      >
        Buy
      </button>
    </div>
  );
}
