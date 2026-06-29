// @ts-nocheck
import { useState, useEffect } from 'react';
import { LoadingLogo } from '@mzanzihomes/ui/components/LoadingLogo';
import { supabase } from '@mzanzihomes/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ResponsivePropertyGrid } from '@/components/ResponsivePropertyGrid';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mzanzihomes/ui/components/select';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@mzanzihomes/ui/components/pagination';
import { X } from 'lucide-react';

interface Property {
  id: string;
  title: string;
  location: string;
  price: number;
  property_type: string;
  bedrooms: number;
  bathrooms: number;
  parking_spaces: number;
  size_sqm: number | null;
  furnished: boolean;
  pets_allowed: boolean;
  images: string[];
  amenities: string[];
  status: string;
  featured: boolean;
  created_at: string;
  listing_type?: string;
}

const ITEMS_PER_PAGE = 30;

const PROPERTY_TYPES = ['Apartment', 'House', 'Studio', 'Townhouse', 'Flat', 'Cottage'];
const BED_OPTIONS = ['1', '2', '3', '4'];
const MAX_PRICE_OPTIONS = [
  { label: 'R5,000', value: '5000' },
  { label: 'R8,000', value: '8000' },
  { label: 'R12,000', value: '12000' },
  { label: 'R18,000', value: '18000' },
  { label: 'R25,000', value: '25000' },
];

export default function Properties() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const { toast } = useToast();

  // Read filters from URL
  const searchTerm   = searchParams.get('search') || searchParams.get('location') || '';
  const propertyType = searchParams.get('propertyType') || searchParams.get('type') || 'Any';
  const minPrice     = searchParams.get('minPrice') || '';
  const maxPrice     = searchParams.get('maxPrice') || '';
  const bedrooms     = searchParams.get('bedrooms') || 'Any';
  const bathrooms    = searchParams.get('bathrooms') || 'Any';

  // Update a single filter in the URL
  const updateFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value === 'Any' || value === '' || value === 'any') {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setCurrentPage(1);
    setSearchParams(next);
  };

  const handleClearFilters = () => {
    setCurrentPage(1);
    navigate('/properties');
  };

  const hasActiveFilters =
    searchTerm || propertyType !== 'Any' || minPrice || maxPrice || bedrooms !== 'Any' || bathrooms !== 'Any';

  // Client-side filter after fetch
  const filteredProperties = properties.filter(p => {
    if (p.listing_type === 'sale') return false;
    if (searchTerm) {
      const needle = searchTerm.toLowerCase().trim();
      if (!p.location.toLowerCase().includes(needle)) return false;
    }
    if (propertyType !== 'Any' && p.property_type !== propertyType) return false;
    if (minPrice && p.price < parseInt(minPrice)) return false;
    if (maxPrice && p.price > parseInt(maxPrice)) return false;
    if (bedrooms !== 'Any' && p.bedrooms !== parseInt(bedrooms)) return false;
    if (bathrooms !== 'Any' && p.bathrooms !== parseInt(bathrooms)) return false;
    return true;
  });

  useEffect(() => {
    fetchProperties();
  }, [currentPage]);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      setError(null);
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      const { data, error, count } = await supabase
        .from('properties')
        .select('*', { count: 'exact' })
        .eq('status', 'available')
        .eq('is_listed', true)
        .order('featured', { ascending: false })
        .order('created_at', { ascending: false })
        .range(from, to);
      if (error) throw error;
      setProperties(data || []);
      setTotalCount(count || 0);
    } catch (err: any) {
      setError(err.message);
      toast({ variant: 'destructive', title: 'Error loading properties', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingLogo size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-sm">
          <p className="text-sm font-semibold text-destructive mb-2">Failed to load properties</p>
          <p className="text-xs text-muted-foreground mb-4">{error}</p>
          <button
            onClick={fetchProperties}
            className="px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderPaginationItems = () => {
    const items = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              onClick={() => handlePageChange(i)}
              isActive={currentPage === i}
              className="cursor-pointer hover:bg-primary/10"
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }
    } else {
      items.push(
        <PaginationItem key={1}>
          <PaginationLink onClick={() => handlePageChange(1)} isActive={currentPage === 1} className="cursor-pointer hover:bg-primary/10">1</PaginationLink>
        </PaginationItem>
      );
      if (currentPage > 3) items.push(<PaginationEllipsis key="e1" />);
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink onClick={() => handlePageChange(i)} isActive={currentPage === i} className="cursor-pointer hover:bg-primary/10">{i}</PaginationLink>
          </PaginationItem>
        );
      }
      if (currentPage < totalPages - 2) items.push(<PaginationEllipsis key="e2" />);
      items.push(
        <PaginationItem key={totalPages}>
          <PaginationLink onClick={() => handlePageChange(totalPages)} isActive={currentPage === totalPages} className="cursor-pointer hover:bg-primary/10">{totalPages}</PaginationLink>
        </PaginationItem>
      );
    }
    return items;
  };

  return (
    <div className="min-h-screen" style={{ background: 'hsl(214 60% 97%)' }}>
      <div className="container mx-auto px-4 sm:px-6 pb-12">

        {/* ── Page heading ──────────────────────────────────── */}
        <div className="flex items-baseline justify-between mb-5 animate-in fade-in duration-300">
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">Properties</h1>
            {searchTerm && (
              <p className="text-xs text-muted-foreground mt-0.5">
                in <span className="font-medium text-foreground">{searchTerm}</span>
              </p>
            )}
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            {filteredProperties.length} result{filteredProperties.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* ── Filter bar ────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2 pb-4 mb-5 border-b border-black/[0.07]">

          {/* Property type */}
          <Select value={propertyType} onValueChange={v => updateFilter('propertyType', v)}>
            <SelectTrigger className="h-8 text-xs rounded-lg w-auto min-w-[108px] bg-white border-black/[0.08] focus:ring-primary/40">
              <SelectValue placeholder="Any type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Any">Any type</SelectItem>
              {PROPERTY_TYPES.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Bedrooms */}
          <Select value={bedrooms} onValueChange={v => updateFilter('bedrooms', v)}>
            <SelectTrigger className="h-8 text-xs rounded-lg w-auto min-w-[90px] bg-white border-black/[0.08] focus:ring-primary/40">
              <SelectValue placeholder="Beds" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Any">Any beds</SelectItem>
              {BED_OPTIONS.map(b => (
                <SelectItem key={b} value={b}>{b} bed{b !== '1' ? 's' : ''}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Max price */}
          <Select value={maxPrice || 'any'} onValueChange={v => updateFilter('maxPrice', v)}>
            <SelectTrigger className="h-8 text-xs rounded-lg w-auto min-w-[108px] bg-white border-black/[0.08] focus:ring-primary/40">
              <SelectValue placeholder="Max price" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any price</SelectItem>
              {MAX_PRICE_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>Up to {o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Clear — only when filters are active */}
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground border border-black/[0.08] bg-white hover:border-black/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>

        {/* ── Property grid ─────────────────────────────────── */}
        <ResponsivePropertyGrid
          properties={filteredProperties}
          loading={loading}
          onClearFilters={handleClearFilters}
          onShowAllProperties={() => navigate('/properties')}
          isSale={false}
        />

        {/* ── Pagination ────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="mt-10 flex justify-center">
            <Pagination>
              <PaginationContent className="gap-1">
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                    className={currentPage === 1 ? 'pointer-events-none opacity-40' : 'cursor-pointer hover:bg-primary/10'}
                  />
                </PaginationItem>
                {renderPaginationItems()}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                    className={currentPage === totalPages ? 'pointer-events-none opacity-40' : 'cursor-pointer hover:bg-primary/10'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}

      </div>
    </div>
  );
}
