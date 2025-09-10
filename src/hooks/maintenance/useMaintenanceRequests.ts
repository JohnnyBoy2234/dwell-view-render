import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRealtime } from '@/hooks/useRealtime';
import type { MaintenanceRequest, CreateMaintenanceRequest } from '@/types/maintenance';
import { useToast } from '@/hooks/use-toast';

export function useMaintenanceRequests() {
  const { user, isLandlord } = useAuth();
  const queryClient = useQueryClient();
  
  // Set up real-time updates for maintenance requests
  useRealtime({
    onMaintenanceChange: () => {
      console.log('🔄 Refreshing maintenance requests due to real-time update');
      queryClient.invalidateQueries({ queryKey: ['maintenance-requests', user?.id, isLandlord] });
    }
  });
  
  return useQuery({
    queryKey: ['maintenance-requests', user?.id, isLandlord],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      
      let query = supabase
        .from('maintenance_requests')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (isLandlord) {
        query = query.eq('landlord_id', user.id);
      } else {
        query = query.eq('tenant_id', user.id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      return data as MaintenanceRequest[];
    },
    enabled: !!user,
  });
}

export function useCreateMaintenanceRequest() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (request: CreateMaintenanceRequest) => {
      if (!user) throw new Error('Not authenticated');
      
      // Get landlord_id from the property
      const { data: property, error: propError } = await supabase
        .from('properties')
        .select('landlord_id')
        .eq('id', request.property_id)
        .single();
      
      if (propError) throw propError;
      
      const { data, error } = await supabase
        .from('maintenance_requests')
        .insert({
          ...request,
          tenant_id: user.id,
          landlord_id: property.landlord_id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as MaintenanceRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-unread-counts'] });
      toast({
        title: "Request submitted",
        description: "Your maintenance request has been submitted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to submit maintenance request.",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateMaintenanceRequest() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<MaintenanceRequest> }) => {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as MaintenanceRequest;
    },
    retry: 0,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-unread-counts'] });
      toast({
        title: "Updated",
        description: "Maintenance request has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update maintenance request.",
        variant: "destructive",
      });
    },
  });
}