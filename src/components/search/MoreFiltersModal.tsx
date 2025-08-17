import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";

interface AdvancedFilters {
  propertyTypes: string[];
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

  const propertyTypeOptions = [
    { value: "House", label: "House" },
    { value: "Apartment", label: "Apartment / Flat" },
    { value: "Townhouse", label: "Townhouse" }
  ];

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

  const handlePropertyTypeChange = (type: string, checked: boolean) => {
    const newTypes = checked 
      ? [...filters.propertyTypes, type]
      : filters.propertyTypes.filter(t => t !== type);
    onFiltersChange({ propertyTypes: newTypes });
  };

  const handleAmenityChange = (amenity: string, checked: boolean) => {
    const newAmenities = checked
      ? [...filters.amenities, amenity]
      : filters.amenities.filter(a => a !== amenity);
    onFiltersChange({ amenities: newAmenities });
  };

  const getActiveFiltersCount = () => {
    return filters.propertyTypes.length + 
           filters.amenities.length + 
           (filters.bathrooms !== "Any" && filters.bathrooms ? 1 : 0) +
           (filters.availableFrom ? 1 : 0);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] bg-background border-border">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-border">
          <DialogTitle className="text-xl font-semibold text-foreground">
            Advanced Filter Options
          </DialogTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className="hover:bg-muted/50"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 py-4 space-y-8">
          {/* Property Type Section */}
          <div>
            <h3 className="text-lg font-medium text-foreground mb-4">Property Type</h3>
            <div className="space-y-3">
              {propertyTypeOptions.map((type) => (
                <div key={type.value} className="flex items-center space-x-3">
                  <Checkbox
                    id={`type-${type.value}`}
                    checked={filters.propertyTypes.includes(type.value)}
                    onCheckedChange={(checked) => 
                      handlePropertyTypeChange(type.value, !!checked)
                    }
                  />
                  <label 
                    htmlFor={`type-${type.value}`}
                    className="text-sm text-foreground cursor-pointer"
                  >
                    {type.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Amenities Section */}
          <div>
            <h3 className="text-lg font-medium text-foreground mb-4">Amenities</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {amenityOptions.map((amenity) => (
                <div key={amenity.value} className="flex items-center space-x-3">
                  <Checkbox
                    id={`amenity-${amenity.value}`}
                    checked={filters.amenities.includes(amenity.value)}
                    onCheckedChange={(checked) => 
                      handleAmenityChange(amenity.value, !!checked)
                    }
                  />
                  <label 
                    htmlFor={`amenity-${amenity.value}`}
                    className="text-sm text-foreground cursor-pointer"
                  >
                    {amenity.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Bathrooms Section */}
          <div>
            <h3 className="text-lg font-medium text-foreground mb-4">Bathrooms</h3>
            <Select 
              value={filters.bathrooms || "Any"} 
              onValueChange={(value) => onFiltersChange({ bathrooms: value })}
            >
              <SelectTrigger className="w-full md:w-48 bg-background border-input">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {bathroomOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="hover:bg-muted/50">
                    {option.label} {option.label !== 'Any' ? 'Bathroom' + (option.label !== '1+' ? 's' : '') : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Availability Section */}
          <div>
            <h3 className="text-lg font-medium text-foreground mb-4">Availability</h3>
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Available From</label>
              <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full md:w-64 justify-start text-left font-normal bg-background hover:bg-muted/50 border-input"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.availableFrom ? (
                      format(filters.availableFrom, "PPP")
                    ) : (
                      <span>Any date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-popover border-border" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.availableFrom}
                    onSelect={(date) => {
                      onFiltersChange({ availableFrom: date || null });
                      setDateOpen(false);
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
        <div className="flex justify-between items-center pt-4 border-t border-border bg-background">
          <div className="text-sm text-muted-foreground">
            {getActiveFiltersCount()} filter{getActiveFiltersCount() !== 1 ? 's' : ''} applied
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={onClearFilters}
              className="hover:bg-muted/50"
            >
              Clear All
            </Button>
            <Button 
              onClick={() => {
                onApplyFilters();
                onClose();
              }}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};