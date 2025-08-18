import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";

interface AdvancedFilters {
  amenities: string[];
  bathrooms: string;
  availableFrom: Date | null;
  minPrice: string;
  maxPrice: string;
}

interface MoreFiltersModalProps {
  open: boolean;
  onClose: () => void;
  filters: AdvancedFilters;
  onFiltersChange: (filters: Partial<AdvancedFilters>) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
}

export const MoreFiltersModal = ({ 
  open, 
  onClose, 
  filters, 
  onFiltersChange, 
  onApplyFilters,
  onClearFilters
}: MoreFiltersModalProps) => {
  const [dateOpen, setDateOpen] = useState(false);


  const amenityOptions = [
    { value: "Pet Friendly", label: "Pet Friendly" },
    { value: "Furnished", label: "Furnished" },
    { value: "Garden", label: "Garden" },
    { value: "Parking Available", label: "Parking Available" },
    { value: "Fibre Ready", label: "Fibre Ready" }
  ];

  const bathroomOptions = [
    { value: "Any", label: "Any" },
    { value: "1", label: "1+" },
    { value: "2", label: "2+" },
    { value: "3", label: "3+" },
    { value: "4", label: "4+" }
  ];

  const priceOptions = [
    { value: "", label: "Any" },
    { value: "5000", label: "R5,000" },
    { value: "10000", label: "R10,000" },
    { value: "15000", label: "R15,000" },
    { value: "20000", label: "R20,000" },
    { value: "25000", label: "R25,000" },
    { value: "30000", label: "R30,000" },
    { value: "35000", label: "R35,000" },
    { value: "40000", label: "R40,000" },
    { value: "50000", label: "R50,000" },
    { value: "60000", label: "R60,000" },
    { value: "70000", label: "R70,000" },
    { value: "80000", label: "R80,000" },
    { value: "90000", label: "R90,000" },
    { value: "100000", label: "R100,000+" }
  ];

  const handleAmenityChange = (amenity: string) => {
    const newAmenities = filters.amenities.includes(amenity)
      ? filters.amenities.filter(a => a !== amenity)
      : [...filters.amenities, amenity];
    onFiltersChange({ amenities: newAmenities });
  };

  const getActiveFiltersCount = () => {
    return filters.amenities.length + 
           (filters.bathrooms !== "Any" && filters.bathrooms ? 1 : 0) +
           (filters.availableFrom ? 1 : 0) +
           (filters.minPrice && filters.minPrice !== "" ? 1 : 0) +
           (filters.maxPrice && filters.maxPrice !== "" ? 1 : 0);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden bg-background border-border flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-border shrink-0">
          <DialogTitle className="text-2xl font-semibold text-foreground">
            Advanced Filter Options
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 py-4 space-y-8">{/* Make scrollable on mobile */}
          {/* Price Range Section */}
          <div>
            <h3 className="text-xl font-medium text-foreground mb-6">Price Range</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Min</label>
                <select
                  value={filters.minPrice || ""}
                  onChange={(e) => {
                    const newMin = e.target.value;
                    const minNum = Number.parseInt(newMin || "0", 10) || 0;
                    const currentMaxNum = Number.parseInt(filters.maxPrice || "0", 10) || 0;
                    if (filters.maxPrice && newMin && minNum > currentMaxNum) {
                      onFiltersChange({ minPrice: newMin, maxPrice: newMin });
                    } else {
                      onFiltersChange({ minPrice: newMin });
                    }
                  }}
                  className="w-full h-10 rounded-md border border-input px-3 text-sm bg-background"
                >
                  {priceOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Max</label>
                <select
                  value={filters.maxPrice || ""}
                  onChange={(e) => {
                    const newMax = e.target.value;
                    const minNum = Number.parseInt(filters.minPrice || "0", 10) || 0;
                    const newMaxNum = Number.parseInt(newMax || "0", 10) || 0;
                    if (newMax && newMaxNum < minNum) {
                      onFiltersChange({ minPrice: newMax, maxPrice: newMax });
                    } else {
                      onFiltersChange({ maxPrice: newMax });
                    }
                  }}
                  className="w-full h-10 rounded-md border border-input px-3 text-sm bg-background"
                >
                  {priceOptions
                    .filter(opt => {
                      if (!filters.minPrice || filters.minPrice === "") return true;
                      if (!opt.value) return true;
                      return Number.parseInt(opt.value, 10) >= (Number.parseInt(filters.minPrice || "0", 10) || 0);
                    })
                    .map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Amenities Section */}
          <div>
            <h3 className="text-xl font-medium text-foreground mb-6">Amenities</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {amenityOptions.map((amenity) => (
                <Badge
                  key={amenity.value}
                  variant={filters.amenities.includes(amenity.value) ? "default" : "outline"}
                  className="cursor-pointer justify-center p-2 text-xs"
                  onClick={() => handleAmenityChange(amenity.value)}
                >
                  {amenity.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Bathrooms Section */}
          <div>
            <h3 className="text-xl font-medium text-foreground mb-6">Bathrooms</h3>
            <Select 
              value={filters.bathrooms || "Any"} 
              onValueChange={(value) => onFiltersChange({ bathrooms: value })}
            >
              <SelectTrigger className="w-full md:w-48 bg-background border-input text-base h-12">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border z-50">
                {bathroomOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="hover:bg-muted/50 text-base py-3">
                    {option.label} {option.label !== 'Any' ? 'Bathroom' + (option.label !== '1+' ? 's' : '') : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Availability Section */}
          <div>
            <h3 className="text-xl font-medium text-foreground mb-6">Availability</h3>
            <div>
              <label className="text-base text-muted-foreground mb-3 block font-medium">Available From</label>
              <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full md:w-64 justify-start text-left font-normal bg-background hover:bg-muted/50 border-input h-12 text-base"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.availableFrom ? (
                      format(filters.availableFrom, "PPP")
                    ) : (
                      <span>Any date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-popover border-border z-50" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.availableFrom}
                    onSelect={(date) => {
                      onFiltersChange({ availableFrom: date || null });
                      setDateOpen(false); // Auto-close calendar after selection
                    }}
                    initialFocus
                    className="p-3 pointer-events-auto"
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* Fixed Bottom Actions */}
        <div className="flex justify-between items-center pt-6 border-t border-border bg-background shrink-0">{/* Fixed footer */}
          <div className="text-base text-muted-foreground font-medium">
            {getActiveFiltersCount()} filter{getActiveFiltersCount() !== 1 ? 's' : ''} applied
          </div>
          <div className="flex gap-4">
            <Button 
              variant="outline" 
              onClick={onClearFilters}
              className="hover:bg-muted/50 text-base px-6 py-3"
            >
              Clear All
            </Button>
            <Button 
              onClick={() => {
                onApplyFilters();
                onClose();
              }}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-base px-8 py-3"
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};