// @ts-nocheck
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Globe, Loader2 } from 'lucide-react';

interface ListPropertyButtonProps {
  propertyId: string;
  onStatusChange?: () => void;
}

export function ListPropertyButton({ propertyId, onStatusChange }: ListPropertyButtonProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleListProperty = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('properties')
        .update({ status: 'available' })
        .eq('id', propertyId);

      if (error) throw error;

      toast({ title: 'Property Listed!', description: 'Your property is now publicly visible to tenants.' });
      onStatusChange?.();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Failed to list property', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleListProperty}
      disabled={loading}
      size="sm"
      variant="outline"
      className="border-ocean-blue/30 text-ocean-blue hover:bg-ocean-blue/10"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Globe className="h-4 w-4 mr-2" />
      )}
      List Publicly
    </Button>
  );
}