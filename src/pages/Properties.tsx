import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePropertySearch } from '@/hooks/usePropertySearch';
import { ResponsivePropertyGrid } from '@/components/ResponsivePropertyGrid';
import { useNavigate } from 'react-router-dom';

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
}

export default function Properties() {
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  const { filters, filteredProperties, updateFilters, clearFilters } = usePropertySearch(properties);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('status', 'available')
        .order('featured', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProperties(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading properties",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-earth-light/30 to-ocean-blue/5">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-ocean-blue/10 via-white to-success-green/10 border border-ocean-blue/20 shadow-soft">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-ocean-blue to-success-green bg-clip-text text-transparent mb-2">Find Your Perfect Home</h1>
          <p className="text-lg text-muted-foreground">
            Discover {properties.length} available properties across South Africa
          </p>
        </div>

        {/* Search/filter UI removed (empty card deleted) */}

        {/* Results */}
        <div className="flex justify-between items-center mb-6">
          <p className="text-muted-foreground">
            {filteredProperties.length} properties found
          </p>
        </div>

        {/* Property Grid - Enhanced Responsive */}
        <ResponsivePropertyGrid 
          properties={filteredProperties}
          loading={loading}
          onClearFilters={clearFilters}
          onShowAllProperties={() => navigate('/properties')}
        />
      </div>
    </div>
  );
}