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


  const handleAmenityChange = (amenity: string) => {
    const newAmenities = filters.amenities.includes(amenity)
      ? filters.amenities.filter(a => a !== amenity)
      : [...filters.amenities, amenity];
    onFiltersChange({ amenities: newAmenities });
  };

  const getActiveFiltersCount = () => {
    return filters.amenities.length + 
           (filters.bathrooms !== "Any" && filters.bathrooms ? 1 : 0) +
           (filters.availableFrom ? 1 : 0);
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

          {/* Remove Bathrooms Section - moved to main filters */}

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