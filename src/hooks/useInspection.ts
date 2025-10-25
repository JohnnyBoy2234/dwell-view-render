import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

export interface InspectionRecord {
  id: string;
  property_id: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  scheduled_date?: string;
  completed_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface InspectionItem {
  id: string;
  inspection_id: string;
  room_name: string;
  item_name: string;
  condition: 'excellent' | 'good' | 'fair' | 'poor' | 'needs_attention';
  description?: string;
  photos: string[];
  created_at: string;
  updated_at: string;
}

export function useInspection() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [inspectionRecords, setInspectionRecords] = useState<InspectionRecord[]>([]);
  const { toast } = useToast();

  const createInspectionRecord = useCallback(async (inspectionData: Omit<InspectionRecord, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: supabaseError } = await supabase
        .from('inspection_records')
        .insert([{
          ...inspectionData,
          status: inspectionData.status || 'in_progress',
        }])
        .select()
        .single();

      if (supabaseError) throw supabaseError;

      toast({
        title: 'Success',
        description: 'Inspection record created successfully',
      });

      return { data, error: null };
    } catch (err: any) {
      console.error('Error creating inspection record:', err);
      setError(err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to create inspection record',
        variant: 'destructive',
      });
      return { data: null, error: err };
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const createInspectionItem = useCallback(async (itemData: Omit<InspectionItem, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: supabaseError } = await supabase
        .from('inspection_items')
        .insert([{
          ...itemData,
          photos: itemData.photos || [],
        }])
        .select()
        .single();

      if (supabaseError) throw supabaseError;

      return { data, error: null };
    } catch (err: any) {
      console.error('Error creating inspection item:', err);
      setError(err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to create inspection item',
        variant: 'destructive',
      });
      return { data: null, error: err };
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const getInspection = useCallback(async (inspectionId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data: inspection, error: inspectionError } = await supabase
        .from('inspection_records')
        .select('*')
        .eq('id', inspectionId)
        .single();

      if (inspectionError) throw inspectionError;

      const { data: items, error: itemsError } = await supabase
        .from('inspection_items')
        .select('*')
        .eq('inspection_id', inspectionId);

      if (itemsError) throw itemsError;

      return { 
        data: { ...inspection, items },
        error: null 
      };
    } catch (err: any) {
      console.error('Error fetching inspection:', err);
      setError(err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to fetch inspection',
        variant: 'destructive',
      });
      return { data: null, error: err };
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const getPropertyInspections = useCallback(async (propertyId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: supabaseError } = await supabase
        .from('inspection_records')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });

      if (supabaseError) throw supabaseError;

      return { data, error: null };
    } catch (err: any) {
      console.error('Error fetching property inspections:', err);
      setError(err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to fetch inspections',
        variant: 'destructive',
      });
      return { data: null, error: err };
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const updateInspectionStatus = useCallback(async (inspectionId: string, status: InspectionRecord['status']) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: supabaseError } = await supabase
        .from('inspection_records')
        .update({ 
          status,
          ...(status === 'completed' ? { completed_date: new Date().toISOString() } : {})
        })
        .eq('id', inspectionId)
        .select()
        .single();

      if (supabaseError) throw supabaseError;

      toast({
        title: 'Success',
        description: `Inspection marked as ${status.replace('_', ' ')}`,
      });

      return { data, error: null };
    } catch (err: any) {
      console.error('Error updating inspection status:', err);
      setError(err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to update inspection status',
        variant: 'destructive',
      });
      return { data: null, error: err };
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const uploadPhoto = useCallback(async (file: File, path: string) => {
    try {
      setLoading(true);
      setError(null);

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}-${Date.now()}.${fileExt}`;
      const filePath = `${path}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('inspections')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('inspections')
        .getPublicUrl(filePath);

      return { url: publicUrl, error: null };
    } catch (err: any) {
      console.error('Error uploading photo:', err);
      setError(err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to upload photo',
        variant: 'destructive',
      });
      return { url: null, error: err };
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchAllInspections = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: supabaseError } = await supabase
        .from('inspection_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (supabaseError) throw supabaseError;

      setInspectionRecords(data || []);
      return { data, error: null };
    } catch (err: any) {
      console.error('Error fetching all inspections:', err);
      setError(err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to fetch inspections',
        variant: 'destructive',
      });
      return { data: null, error: err };
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return {
    loading,
    error,
    inspectionRecords,
    createInspectionRecord,
    createInspectionItem,
    getInspection,
    getPropertyInspections,
    updateInspectionStatus,
    uploadPhoto,
    fetchAllInspections,
  };
}
