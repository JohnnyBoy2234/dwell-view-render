import React, { useMemo, type FC } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown } from "lucide-react";

interface SearchFilters {
  location: string;
  propertyType: string;
  minPrice: string;
  maxPrice: string;
  bedrooms: string;
}

const propertyPrice = [
  { value: "any", label: "Any" },
  { value: "5000", label: "R 5 000" },
  { value: "10000", label: "R 10 000" },
  { value: "25000", label: "R 25 000" },
  { value: "50000", label: "R 50 000" },
  { value: "100000", label: "R 100 000" },
  { value: "250000", label: "R 250 000" },
  { value: "500000", label: "R 500 000" },
  { value: "750000", label: "R 750 000" },
  { value: "1000000", label: "R 1 000 000" },
];

interface PriceDropdownProps {
  filters: SearchFilters;
  onFiltersChange: (patch: Partial<SearchFilters>) => void;
  priceOpen: boolean;
  setPriceOpen: (open: boolean) => void;
  getPriceLabel: () => React.ReactNode;
}

const PriceDropdown: FC<PriceDropdownProps> = ({ filters, onFiltersChange, priceOpen, setPriceOpen, getPriceLabel }) => {
  const maxPriceOptions = useMemo(() => {
    const minPriceValue = Number.parseInt(filters.minPrice || "0", 10) || 0;
    return propertyPrice.filter(option => {
      if (option.value === "any") return true;
      const optionValue = Number.parseInt(option.value, 10) || 0;
      return optionValue >= minPriceValue;
    });
  }, [filters.minPrice]);

  const normalizeFromSelect = (value: string) => value === "any" ? "" : value;
  const valueForSelect = (v?: string) => (v && v !== "" ? v : "any");

  const handleMinPriceChange = (value: string) => {
    const newMin = normalizeFromSelect(value);
    const currentMax = filters.maxPrice || "";

    const newMinNum = Number.parseInt(newMin || "0", 10) || 0;
    const currentMaxNum = Number.parseInt(currentMax || "0", 10) || 0;

    if (currentMax && newMinNum > currentMaxNum) {
      onFiltersChange({ minPrice: newMin, maxPrice: newMin });
    } else {
      onFiltersChange({ minPrice: newMin });
    }
  };

  const handleMaxPriceChange = (value: string) => {
    const newMax = normalizeFromSelect(value);
    onFiltersChange({ maxPrice: newMax });
  };

  const stopPropagationOnly = (e: React.SyntheticEvent) => {
    // only stop propagation so Radix internals can still perform their default actions
    e.stopPropagation();
  };

  return (
    <Popover open={priceOpen} onOpenChange={(open) => setPriceOpen(open)}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          onClick={(e: React.MouseEvent) => {
            // stop bubbling to parent click handlers (but don't prevent default)
            e.stopPropagation();
            setPriceOpen(!priceOpen);
          }}
          className={`h-10 px-3 flex-1 min-w-[130px] justify-start text-left bg-white hover:bg-primary hover:text-white border-input text-sm ${((filters.minPrice && filters.minPrice !== "") || (filters.maxPrice && filters.maxPrice !== "")) ? 'bg-primary text-white' : 'text-foreground'}`}
        >
          <span className="truncate w-full">{getPriceLabel()}</span>
          <ChevronDown className="h-3 w-3 ml-1 flex-shrink-0" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-80 p-4 bg-white border border-border z-50"
        align="start"
        onPointerDown={(e) => { e.stopPropagation(); }}
        onClick={(e) => { e.stopPropagation(); }}
      >
        <div className="space-y-4" onPointerDown={(e) => e.stopPropagation()}>
          <h4 className="font-medium text-foreground">Price Range</h4>

          <div className="grid grid-cols-2 gap-3">
            {/* Min */}
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Min Price</label>
              <Select value={valueForSelect(filters.minPrice)} onValueChange={handleMinPriceChange}>
                <SelectTrigger
                  className="h-9 text-sm"
                  onPointerDown={stopPropagationOnly}
                  onClick={stopPropagationOnly}
                >
                  <SelectValue placeholder="Any" />
                </SelectTrigger>

                <SelectContent onPointerDown={stopPropagationOnly}>
                  {propertyPrice.map(option => (
                    <SelectItem
                      key={`min-${option.value}`}
                      value={option.value}
                      onPointerDown={stopPropagationOnly}
                      onClick={stopPropagationOnly}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Max */}
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Max Price</label>
              <Select value={valueForSelect(filters.maxPrice)} onValueChange={handleMaxPriceChange}>
                <SelectTrigger
                  className="h-9 text-sm"
                  onPointerDown={stopPropagationOnly}
                  onClick={stopPropagationOnly}
                >
                  <SelectValue placeholder="Any" />
                </SelectTrigger>

                <SelectContent onPointerDown={stopPropagationOnly}>
                  {maxPriceOptions.map(option => (
                    <SelectItem
                      key={`max-${option.value}`}
                      value={option.value}
                      onPointerDown={stopPropagationOnly}
                      onClick={stopPropagationOnly}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="button" size="sm" onClick={(e) => { e.stopPropagation(); setPriceOpen(false); }} className="bg-primary hover:bg-primary/90 text-sm">
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default PriceDropdown;