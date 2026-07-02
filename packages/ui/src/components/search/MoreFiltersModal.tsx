import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@mzanzihomes/ui/components/dialog";
import { X } from "lucide-react";
import { cn } from "@mzanzihomes/common/lib/utils";
import type { PropertySearchFilters } from "@mzanzihomes/ui/hooks/usePropertySearchFilters";

interface MoreFiltersModalProps {
  open: boolean;
  onClose: () => void;
  filters: PropertySearchFilters;
  onFiltersChange: (f: Partial<PropertySearchFilters>) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
}

const TYPE_OPTIONS  = ["Any", "House", "Apartment", "Townhouse", "Studio", "Duplex"];
const BED_OPTIONS   = ["Any", "1", "2", "3", "4+"];
const BATH_OPTIONS  = ["Any", "1", "2", "3", "4+"];
const AMENITY_OPTIONS = ["Pet Friendly", "Furnished", "Garden", "Parking Available", "Fibre Ready"];

const PRICE_MIN_OPTIONS = [
  { value: "",      label: "No min" },
  { value: "2000",  label: "R 2,000" },
  { value: "3000",  label: "R 3,000" },
  { value: "5000",  label: "R 5,000" },
  { value: "8000",  label: "R 8,000" },
  { value: "10000", label: "R 10,000" },
  { value: "15000", label: "R 15,000" },
  { value: "20000", label: "R 20,000" },
  { value: "30000", label: "R 30,000" },
  { value: "50000", label: "R 50,000" },
];

const PRICE_MAX_OPTIONS = [
  { value: "",      label: "No max" },
  { value: "3000",  label: "R 3,000" },
  { value: "5000",  label: "R 5,000" },
  { value: "8000",  label: "R 8,000" },
  { value: "10000", label: "R 10,000" },
  { value: "15000", label: "R 15,000" },
  { value: "20000", label: "R 20,000" },
  { value: "30000", label: "R 30,000" },
  { value: "50000", label: "R 50,000" },
  { value: "80000", label: "R 80,000" },
];

function PillGroup({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium border transition-all",
            (value === opt || (!value && opt === "Any"))
              ? "bg-ocean-blue text-white border-ocean-blue"
              : "bg-white text-gray-700 border-gray-200 hover:border-ocean-blue/40 hover:text-ocean-blue"
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

const Divider = () => <div className="h-px bg-gray-100" />;

export const MoreFiltersModal = ({
  open,
  onClose,
  filters,
  onFiltersChange,
  onApplyFilters,
  onClearFilters,
}: MoreFiltersModalProps) => {
  const activeCount = [
    filters.propertyType && filters.propertyType !== "Any",
    filters.bedrooms && filters.bedrooms !== "Any",
    filters.bathrooms && filters.bathrooms !== "Any",
    !!filters.minPrice,
    !!filters.maxPrice,
    (filters.amenities?.length ?? 0) > 0,
  ].filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        hideClose
        className="max-w-lg w-[calc(100vw-2rem)] max-h-[90vh] overflow-hidden flex flex-col rounded-3xl border-0 p-0"
        style={{ boxShadow: "0 24px 64px rgba(37,99,235,0.18)" }}
      >
        {/* Header */}
        <DialogHeader className="flex flex-row items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 shrink-0 space-y-0">
          <DialogTitle className="text-lg font-bold text-gray-900">Filters</DialogTitle>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

          {/* Property Type */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-ocean-blue/70 mb-3">Property Type</p>
            <PillGroup
              options={TYPE_OPTIONS}
              value={filters.propertyType ?? "Any"}
              onChange={(v) => onFiltersChange({ propertyType: v })}
            />
          </div>

          <Divider />

          {/* Bedrooms */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-ocean-blue/70 mb-3">Bedrooms</p>
            <PillGroup
              options={BED_OPTIONS}
              value={filters.bedrooms ?? "Any"}
              onChange={(v) => onFiltersChange({ bedrooms: v })}
            />
          </div>

          <Divider />

          {/* Bathrooms */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-ocean-blue/70 mb-3">Bathrooms</p>
            <PillGroup
              options={BATH_OPTIONS}
              value={filters.bathrooms ?? "Any"}
              onChange={(v) => onFiltersChange({ bathrooms: v })}
            />
          </div>

          <Divider />

          {/* Price Range */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-ocean-blue/70 mb-3">Budget / month</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[11px] text-gray-400 mb-1.5">Minimum</p>
                <select
                  value={filters.minPrice ?? ""}
                  onChange={(e) => onFiltersChange({ minPrice: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 bg-white outline-none"
                >
                  {PRICE_MIN_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <p className="text-[11px] text-gray-400 mb-1.5">Maximum</p>
                <select
                  value={filters.maxPrice ?? ""}
                  onChange={(e) => onFiltersChange({ maxPrice: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 bg-white outline-none"
                >
                  {PRICE_MAX_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <Divider />

          {/* Amenities */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-ocean-blue/70 mb-3">Amenities</p>
            <div className="flex flex-wrap gap-2">
              {AMENITY_OPTIONS.map((a) => {
                const active = filters.amenities?.includes(a) ?? false;
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => {
                      const current = filters.amenities ?? [];
                      onFiltersChange({
                        amenities: active
                          ? current.filter((x) => x !== a)
                          : [...current, a],
                      });
                    }}
                    className={cn(
                      "px-4 py-2 rounded-full text-sm font-medium border transition-all",
                      active
                        ? "bg-ocean-blue text-white border-ocean-blue"
                        : "bg-white text-gray-700 border-gray-200 hover:border-ocean-blue/40 hover:text-ocean-blue"
                    )}
                  >
                    {a}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 shrink-0">
          <button
            type="button"
            onClick={onClearFilters}
            className="text-sm font-semibold text-gray-500 hover:text-gray-800 underline underline-offset-2 transition-colors"
          >
            Clear all{activeCount > 0 ? ` (${activeCount})` : ""}
          </button>
          <button
            type="button"
            onClick={() => { onApplyFilters(); onClose(); }}
            className="px-7 py-3 rounded-xl text-sm font-bold text-white transition-all hover:shadow-lg"
            style={{
              background: "linear-gradient(135deg, hsl(214 100% 55%) 0%, hsl(214 100% 42%) 100%)",
              boxShadow: "0 4px 16px rgba(37,99,235,0.30)",
            }}
          >
            Show Results
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
