import { useState, useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import PriceDropdown from "../ui/pricedropdown";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { ChevronDown, SlidersHorizontal, Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
interface SearchFilters {
  location: string;
  propertyType: string;
  minPrice: string;
  maxPrice: string;
  bedrooms: string;
}
interface PropertySearchBarProps {
  filters: SearchFilters;
  onFiltersChange: (filters: Partial<SearchFilters>) => void;
  onMoreFiltersClick: () => void;
  onSearch: () => void;
}
export const PropertySearchBar = ({
  filters,
  onFiltersChange,
  onMoreFiltersClick,
  onSearch
}: PropertySearchBarProps) => {
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
  const propertyTypeOptions = [{
    value: "Any",
    label: "Any Property Type"
  }, {
    value: "House",
    label: "House"
  }, {
    value: "Apartment",
    label: "Apartment"
  }, {
    value: "Townhouse",
    label: "Townhouse"
  }, {
    value: "Studio",
    label: "Studio"
  }, {
    value: "Duplex",
    label: "Duplex"
  }];
  const bedroomOptions = [{
    value: "Any",
    label: "Any"
  }, {
    value: "1",
    label: "1+"
  }, {
    value: "2",
    label: "2+"
  }, {
    value: "3",
    label: "3+"
  }, {
    value: "4",
    label: "4+"
  }];
  const bathroomOptions = [{
    value: "Any",
    label: "Any"
  }, {
    value: "1",
    label: "1+"
  }, {
    value: "2",
    label: "2+"
  }, {
    value: "3",
    label: "3+"
  }, {
    value: "4",
    label: "4+"
  }];
  // Mobile-friendly price options (string values match pricedropdown)
  const priceOptions = [
    { value: "", label: "Any" },
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
  const getPropertyTypeLabel = () => {
    const selectedTypes = filters.propertyType ? filters.propertyType.split(',').filter(type => type !== "Any" && type.trim() !== "") : [];
    if (selectedTypes.length > 0) {
      const displayText = selectedTypes.length === 1 ? selectedTypes[0] : `${selectedTypes.length} Selected`;
      return <div className="flex flex-col items-start">
          <span className="text-xs text-slate-300">Property Type</span>
          <span className="text-sm font-normal">{displayText}</span>
        </div>;
    }
    return "Property Type";
  };
  /**
 * Formats a numeric string into a South African Rand currency format.
 * e.g., "500000" becomes "R 500,000"
 * Returns an empty string if the value is invalid or zero.
 * @param {string} value The numeric string to format.
 * @returns {string} The formatted currency string.
 */
const formatPrice = (value?: string | null): string => {
  // Return empty if the value is null, undefined, or an empty string.
  if (!value) return "";

  const numberValue = parseInt(value, 10);
  if (Number.isNaN(numberValue) || numberValue === 0) return "";

  // Use Intl.NumberFormat for reliable, locale-aware formatting.
  const formattedNumber = new Intl.NumberFormat('en-ZA').format(numberValue);

  return `R ${formattedNumber}`;
};


/**
 * Generates the display label for the price filter button based on
 * the current min and max price filters.
 * @returns {React.ReactNode} JSX for the label or a plain string.
 */
const getPriceLabel = (): ReactNode => {
  // Get the formatted min and max price strings.
  const min = formatPrice(filters.minPrice);
  const max = formatPrice(filters.maxPrice);
  
  // Determine if a meaningful selection has been made.
  const hasMinSelection = filters.minPrice && filters.minPrice !== "";
  const hasMaxSelection = filters.maxPrice && filters.maxPrice !== "";

  let priceRangeText = "Any";

  if (!hasMinSelection && hasMaxSelection) {
    priceRangeText = `Up to ${max}`;
  } else if (hasMinSelection && !hasMaxSelection) {
    priceRangeText = `From ${min}`;
  } else if (hasMinSelection && hasMaxSelection) {
    // If min and max are the same, just show one value.
    if (min === max) {
      priceRangeText = min;
    } else {
      priceRangeText = `${min} - ${max}`;
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
  const getBedroomsLabel = () => {
    const hasSelection = filters.bedrooms !== "Any" && filters.bedrooms;
    if (hasSelection) {
      return <div className="flex flex-col items-start">
          <span className="text-xs text-slate-300">Bedrooms</span>
          <span className="text-sm font-normal">{filters.bedrooms}+</span>
        </div>;
    }
    return "Bedrooms";
  };
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  };
  return <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 w-full max-w-4xl mx-auto">
      {/* Location Search - Top Section */}
      <div className="p-3 sm:p-4 border-b border-gray-200">
        <div onKeyDown={handleKeyPress}>
          <AddressAutocomplete 
            value={filters.location} 
            onChange={value => onFiltersChange({ location: value })} 
            placeholder="Search city or suburb..." 
            className="h-12 sm:h-10 text-base sm:text-sm border-0 focus-visible:ring-2 focus-visible:ring-primary text-foreground bg-white w-full" 
          />
        </div>
      </div>

      {/* Filters - Bottom Section (responsive) */}
      {isMobile ? (
        <>
          <div className="p-3 sm:p-4 flex gap-2 items-center">
            <Button variant="outline" className="flex-1 h-12 justify-center" onClick={() => setFiltersSheetOpen(true)}>
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filters
            </Button>
            <Button size="sm" className="h-12 px-4 bg-primary hover:bg-primary/90 text-primary-foreground text-sm" onClick={onSearch}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>

          <Sheet open={filtersSheetOpen} onOpenChange={setFiltersSheetOpen}>
            <SheetContent className="w-full h-full p-6 bg-white">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-lg font-medium">Filters</div>
                  <div className="text-sm text-slate-400">Refine your search</div>
                </div>
                <Button variant="ghost" onClick={() => setFiltersSheetOpen(false)}>
                  <X />
                </Button>
              </div>

              <div className="space-y-4 overflow-auto pr-2">
                {/* Property Type - large buttons */}
                <div>
                  <div className="text-xs text-slate-400 mb-2">Property Type</div>
                  <div className="grid grid-cols-2 gap-2">
                    {propertyTypeOptions.map(option => {
                      const selectedTypes = filters.propertyType ? filters.propertyType.split(',').filter(type => type.trim() !== "") : [];
                      const isSelected = selectedTypes.includes(option.value);
                      return <Button
                        key={option.value}
                        variant={isSelected ? "secondary" : "outline"}
                        className={`w-full py-3 text-left ${isSelected ? 'bg-primary text-white' : ''}`}
                        onClick={() => {
                          if (option.value === "Any") {
                            onFiltersChange({ propertyType: "Any" });
                          } else {
                            let newSelectedTypes;
                            if (isSelected) {
                              newSelectedTypes = selectedTypes.filter(type => type !== option.value);
                            } else {
                              newSelectedTypes = [...selectedTypes.filter(type => type !== "Any"), option.value];
                            }
                            onFiltersChange({
                              propertyType: newSelectedTypes.length === 0 ? "Any" : newSelectedTypes.join(',')
                            });
                          }
                        }}
                      >
                        {option.label}
                      </Button>;
                    })}
                  </div>
                </div>
 
                {/* Price - mobile: use native selects to avoid popover issues */}
                <div>
                  <div className="text-xs text-slate-400 mb-2">Price</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Min</label>
                      <select
                        value={filters.minPrice ?? ""}
                        onChange={(e) => {
                          const newMin = e.target.value;
                          const currentMax = filters.maxPrice || "";
                          const newMinNum = Number.parseInt(newMin || "0", 10) || 0;
                          const currentMaxNum = Number.parseInt(currentMax || "0", 10) || 0;
                          if (currentMax && newMinNum > currentMaxNum) {
                            // if min > max, keep them equal
                            onFiltersChange({ minPrice: newMin, maxPrice: newMin });
                          } else {
                            onFiltersChange({ minPrice: newMin });
                          }
                        }}
                        className="w-full h-10 rounded-md border border-input px-3 text-sm"
                      >
                        {priceOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
 
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Max</label>
                      <select
                        value={filters.maxPrice ?? ""}
                        onChange={(e) => {
                          const newMax = e.target.value;
                          // ensure max is not below min
                          const minNum = Number.parseInt(filters.minPrice || "0", 10) || 0;
                          const newMaxNum = Number.parseInt(newMax || "0", 10) || 0;
                          if (newMax && newMaxNum < minNum) {
                            onFiltersChange({ minPrice: newMax, maxPrice: newMax });
                          } else {
                            onFiltersChange({ maxPrice: newMax });
                          }
                        }}
                        className="w-full h-10 rounded-md border border-input px-3 text-sm"
                      >
                        {/* only show options >= current min */}
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
 
                 {/* Bedrooms */}
                 <div>
                   <div className="text-xs text-slate-400 mb-2">Bedrooms</div>
                   <div className="flex gap-2">
                     {bedroomOptions.map(option => (
                       <Button
                         key={option.value}
                         variant={filters.bedrooms === option.value ? "secondary" : "outline"}
                         className={`flex-1 py-3 ${filters.bedrooms === option.value ? 'bg-primary text-white' : ''}`}
                         onClick={() => onFiltersChange({ bedrooms: option.value })}
                       >
                         {option.label === 'Any' ? 'Any' : `${option.label}+`}
                       </Button>
                     ))}
                   </div>
                 </div>

                <div>
                  <Button variant="outline" className="w-full py-3" onClick={(e) => { e.stopPropagation(); setFiltersSheetOpen(false); onMoreFiltersClick(); }}>
                    More Filters
                  </Button>
                </div>
              </div>

              <div className="mt-6 flex gap-2">
                <Button className="flex-1" onClick={() => {
                  onFiltersChange({ propertyType: "Any", minPrice: "", maxPrice: "", bedrooms: "Any" });
                }}>
                  Reset
                </Button>
                <Button className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => { setFiltersSheetOpen(false); onSearch(); }}>
                  Apply
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </>
      ) : (
        <div className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 items-stretch sm:items-center">
            {/* Property Type Dropdown */}
            <Popover open={propertyTypeOpen} onOpenChange={setPropertyTypeOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className={`h-10 px-3 flex-1 min-w-[130px] justify-start text-left bg-white hover:bg-primary hover:text-white border-input text-sm ${filters.propertyType !== "Any" && filters.propertyType ? 'bg-primary text-white' : 'text-foreground'}`}>
                  <span className="truncate w-full">{getPropertyTypeLabel()}</span>
                  <ChevronDown className="h-3 w-3 ml-1 flex-shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2 bg-white border border-border z-50" align="start">
                <div className="space-y-1">
                  {propertyTypeOptions.map(option => {
                    const selectedTypes = filters.propertyType ? filters.propertyType.split(',').filter(type => type.trim() !== "") : [];
                    const isSelected = selectedTypes.includes(option.value);
                    
                    return <Button 
                      key={option.value} 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        if (option.value === "Any") {
                          onFiltersChange({ propertyType: "Any" });
                        } else {
                          let newSelectedTypes;
                          if (isSelected) {
                            newSelectedTypes = selectedTypes.filter(type => type !== option.value);
                          } else {
                            newSelectedTypes = [...selectedTypes.filter(type => type !== "Any"), option.value];
                          }
                          onFiltersChange({ 
                            propertyType: newSelectedTypes.length === 0 ? "Any" : newSelectedTypes.join(',')
                          });
                        }
                      }} 
                      className={`w-full justify-start hover:bg-primary hover:text-white text-sm text-gray-950 ${isSelected ? 'bg-primary/10 text-primary' : ''}`}>
                      {option.label}
                    </Button>;
                  })}
                </div>
              </PopoverContent>
            </Popover>

            <PriceDropdown 
              filters={filters} 
              onFiltersChange={onFiltersChange} 
              priceOpen={priceOpen} 
              setPriceOpen={setPriceOpen} 
              getPriceLabel={getPriceLabel}
            />

            {/* Bedrooms Dropdown */}
            <Popover open={bedroomsOpen} onOpenChange={setBedroomsOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className={`h-10 px-3 flex-1 min-w-[130px] justify-start text-left bg-white hover:bg-primary hover:text-white border-input text-sm ${filters.bedrooms !== "Any" && filters.bedrooms ? 'bg-primary text-white' : 'text-foreground'}`}>
                  <span className="truncate w-full">{getBedroomsLabel()}</span>
                  <ChevronDown className="h-3 w-3 ml-1 flex-shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2 bg-white border border-border z-50" align="start">
                <div className="space-y-1">
                  {bedroomOptions.map(option => <Button key={option.value} variant="ghost" size="sm" className="w-full justify-start hover:bg-primary hover:text-white text-sm" onClick={() => {
                    onFiltersChange({
                      bedrooms: option.value
                    });
                    setBedroomsOpen(false);
                  }}>
                    {option.label} {option.label !== 'Any' ? 'Bedroom' + (option.label !== '1+' ? 's' : '') : ''}
                  </Button>)}
                </div>
              </PopoverContent>
            </Popover>

            {/* More Filters Button */}
            <Button variant="outline" className="h-10 px-3 flex-1 min-w-[130px] bg-white hover:bg-primary hover:text-white text-foreground border-input text-sm" onClick={onMoreFiltersClick}>
              <SlidersHorizontal className="h-3 w-3 mr-1" />
              More Filters
            </Button>

            {/* Search Button */}
            <Button size="sm" className="h-10 px-6 bg-primary hover:bg-primary/90 text-primary-foreground text-sm sm:ml-auto" onClick={onSearch}>
              <Search className="h-4 w-4 mr-1" />
              Search
            </Button>
          </div>
        </div>
      )}
    </div>;
};