import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Property24SearchInput } from "@/components/ui/property24-search-input";
import { ChevronDown, SlidersHorizontal, Search, X } from "lucide-react";
import { PropertySearchFilters } from "@/hooks/usePropertySearchFilters";
import { cn } from "@/lib/utils";

interface Property24SearchBarProps {
  filters: PropertySearchFilters;
  onFiltersChange: (filters: Partial<PropertySearchFilters>) => void;
  onSearch: () => void;
  className?: string;
}

export const Property24SearchBar = ({
  filters,
  onFiltersChange,
  onSearch,
  className
}: Property24SearchBarProps) => {
  const [propertyTypeOpen, setPropertyTypeOpen] = useState(false);
  const [priceOpen, setPriceOpen] = useState(false);
  const [bedroomsOpen, setBedroomsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [filtersSheetOpen, setFiltersSheetOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const propertyTypeOptions = [
    { value: "Any", label: "Any Property Type" },
    { value: "House", label: "House" },
    { value: "Apartment", label: "Apartment" },
    { value: "Townhouse", label: "Townhouse" },
    { value: "Studio", label: "Studio" },
    { value: "Duplex", label: "Duplex" }
  ];

  const bedroomOptions = [
    { value: "Any", label: "Any" },
    { value: "1", label: "1" },
    { value: "2", label: "2" },
    { value: "3", label: "3" },
    { value: "4", label: "4+" }
  ];

  const priceOptions = [
    { value: "", label: "Any" },
    { value: "2000", label: "R 2,000" },
    { value: "3000", label: "R 3,000" },
    { value: "4000", label: "R 4,000" },
    { value: "5000", label: "R 5,000" },
    { value: "6000", label: "R 6,000" },
    { value: "8000", label: "R 8,000" },
    { value: "10000", label: "R 10,000" },
    { value: "12000", label: "R 12,000" },
    { value: "15000", label: "R 15,000" },
    { value: "20000", label: "R 20,000" },
    { value: "25000", label: "R 25,000" },
    { value: "30000", label: "R 30,000" },
    { value: "40000", label: "R 40,000" },
    { value: "50000", label: "R 50,000" }
  ];

  // Format price for display
  const formatPrice = (value?: string | null): string => {
    if (!value) return "";
    const numberValue = parseInt(value, 10);
    if (Number.isNaN(numberValue) || numberValue === 0) return "";
    return new Intl.NumberFormat('en-ZA').format(numberValue);
  };

  // Get property type label
  const getPropertyTypeLabel = () => {
    if (filters.propertyType && filters.propertyType !== "Any") {
      return (
        <div className="flex flex-col items-start">
          <span className="text-xs text-slate-400">Property Type</span>
          <span className="text-sm font-normal">{filters.propertyType}</span>
        </div>
      );
    }
    return "Property Type";
  };

  // Get price label
  const getPriceLabel = () => {
    const min = formatPrice(filters.minPrice);
    const max = formatPrice(filters.maxPrice);
    const hasMinSelection = filters.minPrice && filters.minPrice !== "";
    const hasMaxSelection = filters.maxPrice && filters.maxPrice !== "";

    let priceRangeText = "Any";

    if (!hasMinSelection && hasMaxSelection) {
      priceRangeText = `Up to R${max}`;
    } else if (hasMinSelection && !hasMaxSelection) {
      priceRangeText = `From R${min}`;
    } else if (hasMinSelection && hasMaxSelection) {
      if (min === max) {
        priceRangeText = `R${min}`;
      } else {
        priceRangeText = `R${min} - R${max}`;
      }
    }

    if (!hasMinSelection && !hasMaxSelection) {
      return "Price";
    }

    return (
      <div className="flex flex-col items-start text-left">
        <span className="text-xs text-slate-400">Price</span>
        <span className="font-normal">{priceRangeText}</span>
      </div>
    );
  };

  // Get bedrooms label
  const getBedroomsLabel = () => {
    const hasSelection = filters.bedrooms !== "Any" && filters.bedrooms;
    if (hasSelection) {
      return (
        <div className="flex flex-col items-start">
          <span className="text-xs text-slate-400">Bedrooms</span>
          <span className="text-sm font-normal">{filters.bedrooms === "4" ? "4+" : filters.bedrooms}</span>
        </div>
      );
    }
    return "Bedrooms";
  };

  // Handle keyboard events
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  };

  // Handle place selection from Google Places
  const handlePlaceSelect = (place: any) => {
    if (place.formatted_address) {
      // Immediately update with the selected place address
      onFiltersChange({ searchTerm: place.formatted_address });
    }
  };

  // Active filter chips
  const renderActiveFilters = () => {
    const hasActiveFilters = filters.searchTerm || 
                             filters.propertyType !== "Any" || 
                             filters.minPrice || 
                             filters.maxPrice || 
                             filters.bedrooms !== "Any";

    if (!hasActiveFilters) return null;

    return (
      <div className="flex flex-wrap gap-2 mt-4">
        {filters.searchTerm && (
          <div className="filter-chip">
            <span>{filters.searchTerm}</span>
            <button 
              className="remove-button"
              onClick={() => onFiltersChange({ searchTerm: "" })}
              aria-label="Remove location filter"
            >
              ×
            </button>
          </div>
        )}
        {filters.propertyType !== "Any" && filters.propertyType && (
          <div className="filter-chip">
            <span>{filters.propertyType}</span>
            <button 
              className="remove-button"
              onClick={() => onFiltersChange({ propertyType: "Any" })}
              aria-label="Remove property type filter"
            >
              ×
            </button>
          </div>
        )}
        {(filters.minPrice || filters.maxPrice) && (
          <div className="filter-chip">
            <span>
              {filters.minPrice && filters.maxPrice 
                ? `R${formatPrice(filters.minPrice)} - R${formatPrice(filters.maxPrice)}`
                : filters.minPrice 
                  ? `From R${formatPrice(filters.minPrice)}`
                  : `Up to R${formatPrice(filters.maxPrice)}`
              }
            </span>
            <button 
              className="remove-button"
              onClick={() => onFiltersChange({ minPrice: "", maxPrice: "" })}
              aria-label="Remove price filter"
            >
              ×
            </button>
          </div>
        )}
        {filters.bedrooms !== "Any" && filters.bedrooms && (
          <div className="filter-chip">
            <span>{filters.bedrooms === "4" ? "4+" : filters.bedrooms} bed{filters.bedrooms !== "1" ? "s" : ""}</span>
            <button 
              className="remove-button"
              onClick={() => onFiltersChange({ bedrooms: "Any" })}
              aria-label="Remove bedroom filter"
            >
              ×
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn("relative bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/30 w-full max-w-5xl mx-auto overflow-hidden", className)}>
      {/* Location Search - Top Section */}
      <div className="p-6 pb-4">
        <div onKeyDown={handleKeyPress}>
          <Property24SearchInput 
            value={filters.searchTerm} 
            onChange={(value) => onFiltersChange({ searchTerm: value })} 
            onPlaceSelect={handlePlaceSelect}
            placeholder="Search by city, suburb or street..." 
            className="property24-search-input w-full" 
            onClear={() => onFiltersChange({ searchTerm: "" })}
          />
        </div>
        
        {/* Active Filter Chips */}
        {renderActiveFilters()}
      </div>

      {/* Filters - Bottom Section (responsive) */}
      {isMobile ? (
        <>
          <div className="px-6 pb-6 flex gap-3 items-center">
            <Button 
              variant="outline" 
              className="flex-1 property24-filter-button text-ocean-blue hover:bg-ocean-blue hover:text-white" 
              onClick={() => setFiltersSheetOpen(true)}
            >
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              All Filters
            </Button>
            <Button 
              className="h-12 px-6 bg-ocean-blue hover:bg-ocean-blue-dark text-white font-medium rounded-xl shadow-lg" 
              onClick={onSearch}
            >
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>

          {/* Mobile Sheet */}
          <Sheet open={filtersSheetOpen} onOpenChange={setFiltersSheetOpen}>
            <SheetContent className="w-full h-full p-6 bg-white">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              
              <div className="space-y-6 mt-6 overflow-auto">
                {/* Property Type */}
                <div>
                  <label className="text-sm font-medium mb-3 block">Property Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {propertyTypeOptions.map(option => (
                      <Button
                        key={option.value}
                        variant={filters.propertyType === option.value ? "default" : "outline"}
                        className={`w-full py-3 ${
                          filters.propertyType === option.value 
                            ? 'bg-ocean-blue text-white border-ocean-blue' 
                            : 'bg-white text-foreground border-ocean-blue/30 hover:bg-ocean-blue/10'
                        }`}
                        onClick={() => onFiltersChange({ propertyType: option.value })}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <label className="text-sm font-medium mb-3 block">Price Range</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Min Price</label>
                      <Select value={filters.minPrice || ""} onValueChange={(value) => onFiltersChange({ minPrice: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Any" />
                        </SelectTrigger>
                        <SelectContent>
                          {priceOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Max Price</label>
                      <Select value={filters.maxPrice || ""} onValueChange={(value) => onFiltersChange({ maxPrice: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Any" />
                        </SelectTrigger>
                        <SelectContent>
                          {priceOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Bedrooms */}
                <div>
                  <label className="text-sm font-medium mb-3 block">Bedrooms</label>
                  <div className="flex gap-2">
                    {bedroomOptions.map(option => (
                      <Button
                        key={option.value}
                        variant={filters.bedrooms === option.value ? "default" : "outline"}
                        className={`flex-1 ${
                          filters.bedrooms === option.value 
                            ? 'bg-ocean-blue text-white' 
                            : 'hover:bg-ocean-blue/10'
                        }`}
                        onClick={() => onFiltersChange({ bedrooms: option.value })}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <Button 
                  className="w-full bg-ocean-blue hover:bg-ocean-blue-dark text-white mt-6"
                  onClick={() => {
                    setFiltersSheetOpen(false);
                    onSearch();
                  }}
                >
                  Apply Filters & Search
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </>
      ) : (
        /* Desktop Filters */
        <div className="px-6 pb-6 flex gap-3 items-center flex-wrap">
          {/* Property Type */}
          <Popover open={propertyTypeOpen} onOpenChange={setPropertyTypeOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="property24-filter-button">
                {getPropertyTypeLabel()}
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-4">
              <div className="space-y-2">
                {propertyTypeOptions.map(option => (
                  <Button
                    key={option.value}
                    variant={filters.propertyType === option.value ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => {
                      onFiltersChange({ propertyType: option.value });
                      setPropertyTypeOpen(false);
                    }}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Price */}
          <Popover open={priceOpen} onOpenChange={setPriceOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="property24-filter-button">
                {getPriceLabel()}
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Min Price</label>
                    <Select value={filters.minPrice || ""} onValueChange={(value) => onFiltersChange({ minPrice: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Any" />
                      </SelectTrigger>
                      <SelectContent>
                        {priceOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Max Price</label>
                    <Select value={filters.maxPrice || ""} onValueChange={(value) => onFiltersChange({ maxPrice: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Any" />
                      </SelectTrigger>
                      <SelectContent>
                        {priceOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button 
                  className="w-full bg-ocean-blue hover:bg-ocean-blue-dark text-white"
                  onClick={() => setPriceOpen(false)}
                >
                  Apply Price Filter
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Bedrooms */}
          <Popover open={bedroomsOpen} onOpenChange={setBedroomsOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="property24-filter-button">
                {getBedroomsLabel()}
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-4">
              <div className="space-y-2">
                {bedroomOptions.map(option => (
                  <Button
                    key={option.value}
                    variant={filters.bedrooms === option.value ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => {
                      onFiltersChange({ bedrooms: option.value });
                      setBedroomsOpen(false);
                    }}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Search Button */}
          <Button 
            className="h-12 px-8 bg-ocean-blue hover:bg-ocean-blue-dark text-white font-medium rounded-xl shadow-lg ml-auto"
            onClick={onSearch}
          >
            <Search className="h-4 w-4 mr-2" />
            Search Properties
          </Button>
        </div>
      )}
    </div>
  );
};