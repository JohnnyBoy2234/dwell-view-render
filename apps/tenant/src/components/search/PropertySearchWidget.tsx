import { useState, useRef, useEffect } from "react";
import { Search, MapPin, Home, Banknote, BedDouble, SlidersHorizontal, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PropertySearchFilters } from "@/hooks/usePropertySearchFilters";

const SA_LOCATIONS = [
  // Cape Town
  "Cape Town", "Sea Point, Cape Town", "Green Point, Cape Town", "De Waterkant, Cape Town",
  "Gardens, Cape Town", "Tamboerskloof, Cape Town", "Oranjezicht, Cape Town", "Vredehoek, Cape Town",
  "Observatory, Cape Town", "Woodstock, Cape Town", "Salt River, Cape Town", "Mowbray, Cape Town",
  "Rondebosch, Cape Town", "Claremont, Cape Town", "Kenilworth, Cape Town", "Wynberg, Cape Town",
  "Constantia, Cape Town", "Hout Bay, Cape Town", "Camps Bay, Cape Town", "Clifton, Cape Town",
  "Bantry Bay, Cape Town", "Bloubergstrand, Cape Town", "Table View, Cape Town", "Milnerton, Cape Town",
  "Century City, Cape Town", "Bellville, Cape Town", "Durbanville, Cape Town", "Stellenbosch",
  "Somerset West", "Gordon's Bay", "Strand", "Paarl", "Franschhoek",
  // Johannesburg
  "Johannesburg", "Sandton", "Rosebank, Johannesburg", "Melrose, Johannesburg", "Illovo, Johannesburg",
  "Parktown, Johannesburg", "Parkview, Johannesburg", "Linden, Johannesburg", "Greenside, Johannesburg",
  "Craighall Park, Johannesburg", "Hyde Park, Johannesburg", "Bryanston", "Fourways", "Randburg",
  "Midrand", "Edenvale", "Bedfordview", "Germiston", "Boksburg", "Benoni",
  // Pretoria
  "Pretoria", "Brooklyn, Pretoria", "Hatfield, Pretoria", "Arcadia, Pretoria", "Waterkloof, Pretoria",
  "Lynnwood, Pretoria", "Centurion", "Midstream Estate", "Garsfontein, Pretoria",
  // Durban
  "Durban", "Umhlanga", "Ballito", "La Lucia, Durban", "Morningside, Durban", "Glenwood, Durban",
  "Berea, Durban", "Musgrave, Durban", "Westville, Durban", "Pinetown",
  // Other cities
  "Port Elizabeth", "East London", "Bloemfontein", "Polokwane", "Nelspruit", "Kimberley",
  "George", "Knysna", "Hermanus", "Mossel Bay",
];

interface PropertySearchWidgetProps {
  filters: PropertySearchFilters;
  onFiltersChange: (filters: Partial<PropertySearchFilters>) => void;
  onSearch: () => void;
  onMoreFiltersOpen?: () => void;
  className?: string;
}

const PRICE_OPTIONS = [
  { value: "", label: "No min" },
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

const TYPE_OPTIONS = ["Any", "House", "Apartment", "Townhouse", "Studio", "Duplex"];
const BED_OPTIONS  = ["Any", "1", "2", "3", "4+"];

function Dropdown({
  open, onClose, children,
}: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      ref={ref}
      className="absolute top-[calc(100%+8px)] left-0 z-[200] bg-white rounded-2xl shadow-[0_16px_48px_rgba(37,99,235,0.14)] border border-gray-100 min-w-[200px] overflow-hidden"
    >
      {children}
    </div>
  );
}

function DropdownItem({
  active, onClick, children,
}: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-ocean-blue/6",
        active ? "text-ocean-blue font-semibold bg-ocean-blue/5" : "text-gray-700"
      )}
    >
      {children}
    </button>
  );
}

/** Vertical divider between sections */
const Divider = () => (
  <div className="h-8 w-px bg-gray-200 shrink-0 self-center" />
);

export function PropertySearchWidget({
  filters,
  onFiltersChange,
  onSearch,
  onMoreFiltersOpen,
  className,
}: PropertySearchWidgetProps) {
  const [openDropdown, setOpenDropdown] = useState<"type" | "minPrice" | "maxPrice" | "beds" | null>(null);
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const locationRef = useRef<HTMLDivElement>(null);

  const close = () => setOpenDropdown(null);
  const toggle = (key: typeof openDropdown) =>
    setOpenDropdown((prev) => (prev === key ? null : key));

  const handleSearch = () => { close(); setShowSuggestions(false); onSearch(); };

  const handleLocationChange = (value: string) => {
    onFiltersChange({ searchTerm: value });
    if (value.trim().length >= 2) {
      const lower = value.toLowerCase();
      const matches = SA_LOCATIONS.filter((loc) =>
        loc.toLowerCase().includes(lower)
      ).slice(0, 6);
      setLocationSuggestions(matches);
      setShowSuggestions(matches.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const pickSuggestion = (loc: string) => {
    onFiltersChange({ searchTerm: loc });
    setShowSuggestions(false);
  };

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (locationRef.current && !locationRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const hasFilters =
    !!filters.searchTerm ||
    (!!filters.propertyType && filters.propertyType !== "Any") ||
    !!filters.minPrice ||
    !!filters.maxPrice ||
    (!!filters.bedrooms && filters.bedrooms !== "Any");

  const clearAll = () => {
    onFiltersChange({
      searchTerm: "",
      propertyType: "Any",
      minPrice: "",
      maxPrice: "",
      bedrooms: "Any",
      bathrooms: "Any",
    });
  };

  // Price label
  const priceLabel = () => {
    const min = filters.minPrice;
    const max = filters.maxPrice;
    if (!min && !max) return null;
    if (min && max) return `R${Number(min)/1000}k – R${Number(max)/1000}k`;
    if (min) return `From R${Number(min)/1000}k`;
    return `Up to R${Number(max)/1000}k`;
  };

  return (
    <div className={cn("w-full", className)}>
      {/* ── Desktop widget (two-row) ── */}
      <div
        className="hidden md:flex flex-col w-full rounded-2xl overflow-visible relative"
        style={{
          background: "rgba(255,255,255,0.97)",
          boxShadow: "0 4px 32px rgba(37,99,235,0.13), 0 1px 0 rgba(255,255,255,0.9) inset",
          border: "1px solid rgba(37,99,235,0.10)",
        }}
      >
        {/* ── Row 1: Location ── */}
        <div ref={locationRef} className="relative w-full">
          <label className="flex items-center gap-4 px-8 pt-5 pb-5 cursor-text hover:bg-ocean-blue/3 rounded-t-2xl transition-colors">
            <MapPin className="w-5 h-5 text-ocean-blue shrink-0" />
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-ocean-blue/70 mb-0.5">Location</span>
              <input
                type="text"
                value={filters.searchTerm ?? ""}
                onChange={(e) => handleLocationChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                onFocus={() => {
                  if (locationSuggestions.length > 0) setShowSuggestions(true);
                }}
                placeholder="Search by city, suburb or area..."
                className="text-[15px] text-gray-800 bg-transparent outline-none placeholder:text-gray-400 w-full"
                autoComplete="off"
              />
            </div>
            {filters.searchTerm && (
              <button
                type="button"
                onClick={() => { onFiltersChange({ searchTerm: "" }); setShowSuggestions(false); }}
                className="shrink-0 w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors"
              >
                <X className="w-3 h-3 text-gray-600" />
              </button>
            )}
          </label>
          {showSuggestions && (
            <div className="absolute top-[calc(100%+6px)] left-0 z-[200] bg-white rounded-2xl shadow-[0_16px_48px_rgba(37,99,235,0.14)] border border-gray-100 min-w-[280px] overflow-hidden">
              {locationSuggestions.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); pickSuggestion(loc); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-ocean-blue/6 flex items-center gap-2.5 transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5 text-ocean-blue/50 shrink-0" />
                  {loc}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Horizontal divider between rows ── */}
        <div className="h-px bg-gray-100 mx-4" />

        {/* ── Row 2: Filters + Search ── */}
        <div className="flex items-stretch">

        {/* ── Property Type ── */}
        <div className="relative">
          <button
            type="button"
            onClick={() => toggle("type")}
            className={cn(
              "flex items-center gap-3 px-6 py-5 transition-colors min-w-[170px]",
              openDropdown === "type" ? "bg-ocean-blue/5" : "hover:bg-ocean-blue/3"
            )}
          >
            <Home className="w-4 h-4 text-ocean-blue shrink-0" />
            <div className="flex flex-col items-start text-left flex-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-ocean-blue/70">Property Type</span>
              <span className="text-sm text-gray-800">
                {!filters.propertyType || filters.propertyType === "Any" ? "Any type" : filters.propertyType}
              </span>
            </div>
            <ChevronDown className={cn("w-3.5 h-3.5 text-gray-400 transition-transform", openDropdown === "type" && "rotate-180")} />
          </button>
          <Dropdown open={openDropdown === "type"} onClose={close}>
            {TYPE_OPTIONS.map((opt) => (
              <DropdownItem
                key={opt}
                active={filters.propertyType === opt || (!filters.propertyType && opt === "Any")}
                onClick={() => { onFiltersChange({ propertyType: opt }); close(); }}
              >
                {opt === "Any" ? "Any type" : opt}
              </DropdownItem>
            ))}
          </Dropdown>
        </div>

        <Divider />

        {/* ── Price Range ── */}
        <div className="relative">
          <button
            type="button"
            onClick={() => toggle("minPrice")}
            className={cn(
              "flex items-center gap-3 px-6 py-5 transition-colors min-w-[180px]",
              openDropdown === "minPrice" ? "bg-ocean-blue/5" : "hover:bg-ocean-blue/3"
            )}
          >
            <Banknote className="w-4 h-4 text-ocean-blue shrink-0" />
            <div className="flex flex-col items-start text-left flex-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-ocean-blue/70">Budget / month</span>
              <span className="text-sm text-gray-800">{priceLabel() ?? "Any price"}</span>
            </div>
            <ChevronDown className={cn("w-3.5 h-3.5 text-gray-400 transition-transform", openDropdown === "minPrice" && "rotate-180")} />
          </button>
          <Dropdown open={openDropdown === "minPrice"} onClose={close}>
            <div className="p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Minimum</p>
              <div className="grid grid-cols-2 gap-1 mb-4">
                {PRICE_OPTIONS.map((opt) => (
                  <DropdownItem
                    key={`min-${opt.value}`}
                    active={filters.minPrice === opt.value}
                    onClick={() => onFiltersChange({ minPrice: opt.value })}
                  >
                    {opt.label}
                  </DropdownItem>
                ))}
              </div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Maximum</p>
              <div className="grid grid-cols-2 gap-1">
                {PRICE_OPTIONS.map((opt) => (
                  <DropdownItem
                    key={`max-${opt.value}`}
                    active={filters.maxPrice === opt.value}
                    onClick={() => onFiltersChange({ maxPrice: opt.value })}
                  >
                    {opt.label === "No min" ? "No max" : opt.label}
                  </DropdownItem>
                ))}
              </div>
            </div>
          </Dropdown>
        </div>

        <Divider />

        {/* ── Bedrooms ── */}
        <div className="relative">
          <button
            type="button"
            onClick={() => toggle("beds")}
            className={cn(
              "flex items-center gap-3 px-6 py-5 transition-colors min-w-[150px]",
              openDropdown === "beds" ? "bg-ocean-blue/5" : "hover:bg-ocean-blue/3"
            )}
          >
            <BedDouble className="w-4 h-4 text-ocean-blue shrink-0" />
            <div className="flex flex-col items-start text-left flex-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-ocean-blue/70">Bedrooms</span>
              <span className="text-sm text-gray-800">
                {!filters.bedrooms || filters.bedrooms === "Any" ? "Any" : `${filters.bedrooms} bed${filters.bedrooms !== "1" ? "s" : ""}`}
              </span>
            </div>
            <ChevronDown className={cn("w-3.5 h-3.5 text-gray-400 transition-transform", openDropdown === "beds" && "rotate-180")} />
          </button>
          <Dropdown open={openDropdown === "beds"} onClose={close}>
            <div className="p-2">
              {BED_OPTIONS.map((opt) => (
                <DropdownItem
                  key={opt}
                  active={filters.bedrooms === opt || (!filters.bedrooms && opt === "Any")}
                  onClick={() => { onFiltersChange({ bedrooms: opt }); close(); }}
                >
                  {opt === "Any" ? "Any bedrooms" : `${opt} bedroom${opt === "1" ? "" : "s"}`}
                </DropdownItem>
              ))}
            </div>
          </Dropdown>
        </div>

        {/* ── Search + More Filters ── */}
        <div className="flex items-center gap-2 px-4 py-4 shrink-0">
          {onMoreFiltersOpen && (
            <button
              type="button"
              onClick={onMoreFiltersOpen}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-500 border border-gray-200 hover:border-ocean-blue/40 hover:text-ocean-blue transition-all"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filters
            </button>
          )}
          {hasFilters && (
            <button
              type="button"
              onClick={clearAll}
              className="flex items-center gap-1 px-2.5 py-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={handleSearch}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
            style={{
              background: "linear-gradient(135deg, hsl(214 100% 55%) 0%, hsl(214 100% 42%) 100%)",
              boxShadow: "0 4px 16px rgba(37,99,235,0.30)",
            }}
          >
            <Search className="w-4 h-4" />
            Search
          </button>
        </div>
        </div>{/* end row-2 */}
      </div>

      {/* ── Mobile bar ── */}
      <div className="flex md:hidden flex-col gap-3">
        {/* Location with suggestions */}
        <div
          ref={locationRef}
          className="relative rounded-2xl"
          style={{
            background: "rgba(255,255,255,0.97)",
            border: "1px solid rgba(37,99,235,0.12)",
            boxShadow: "0 4px 24px rgba(37,99,235,0.10)",
          }}
        >
          <div className="flex items-center gap-3 px-5 py-4">
            <MapPin className="w-5 h-5 text-ocean-blue shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-ocean-blue/70 mb-0.5">Location</p>
              <input
                type="text"
                value={filters.searchTerm ?? ""}
                onChange={(e) => handleLocationChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                onFocus={() => { if (locationSuggestions.length > 0) setShowSuggestions(true); }}
                placeholder="City, suburb or area..."
                className="w-full text-base text-gray-800 bg-transparent outline-none placeholder:text-gray-400"
                autoComplete="off"
              />
            </div>
            {filters.searchTerm && (
              <button
                type="button"
                onClick={() => { onFiltersChange({ searchTerm: "" }); setShowSuggestions(false); }}
                className="shrink-0 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <X className="w-3.5 h-3.5 text-gray-500" />
              </button>
            )}
          </div>
          {/* Suggestions dropdown */}
          {showSuggestions && (
            <div className="absolute top-[calc(100%+6px)] left-0 right-0 z-[200] bg-white rounded-2xl shadow-[0_16px_48px_rgba(37,99,235,0.14)] border border-gray-100 overflow-hidden">
              {locationSuggestions.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); pickSuggestion(loc); }}
                  className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-ocean-blue/6 flex items-center gap-3 transition-colors"
                >
                  <MapPin className="w-4 h-4 text-ocean-blue/50 shrink-0" />
                  {loc}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* More Filters + Search — stacked vertically */}
        <div className="flex flex-col gap-3">
          {onMoreFiltersOpen && (
            <button
              type="button"
              onClick={onMoreFiltersOpen}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-semibold text-gray-700 border border-gray-200 bg-white hover:border-ocean-blue/40 hover:text-ocean-blue transition-all"
              style={{ boxShadow: "0 2px 8px rgba(37,99,235,0.06)" }}
            >
              <SlidersHorizontal className="w-4 h-4" />
              More Filters
            </button>
          )}
          <button
            type="button"
            onClick={handleSearch}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-bold text-white"
            style={{
              background: "linear-gradient(135deg, hsl(214 100% 55%) 0%, hsl(214 100% 42%) 100%)",
              boxShadow: "0 4px 20px rgba(37,99,235,0.30)",
            }}
          >
            <Search className="w-4 h-4" />
            Search Properties
          </button>
        </div>
      </div>
    </div>
  );
}
