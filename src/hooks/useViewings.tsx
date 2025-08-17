import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface Viewing {
  id: string;
  property_id: string;
  landlord_id: string;
  tenant_id: string;
  conversation_id?: string;
  scheduled_date?: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  viewing_confirmed?: boolean;
  application_sent?: boolean;
}

export interface ViewingWithDetails extends Viewing {
  properties?: {
    title: string;
    location: string;
  };
  tenant_profile?: {
    display_name: string;
  };
  landlord_profile?: {
    display_name: string;
  };
}

export const useViewings = (propertyId?: string, conversationId?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [viewings, setViewings] = useState<ViewingWithDetails[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchViewings();
    }
  }, [user, propertyId, conversationId]);

  const fetchViewings = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let query = supabase
        .from('viewings')
        .select('*')
        .order('created_at', { ascending: false });

      if (propertyId) {
        query = query.eq('property_id', propertyId);
      }

      if (conversationId) {
        query = query.eq('conversation_id', conversationId);
      }

      // Filter by user role
      query = query.or(`landlord_id.eq.${user.id},tenant_id.eq.${user.id}`);

      const { data, error } = await query;

      if (error) throw error;
      setViewings(data || []);
    } catch (error) {
      console.error('Error fetching viewings:', error);
      toast({
        title: "Error",
        description: "Failed to load viewings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createViewing = async (data: {
    property_id: string;
    tenant_id: string;
    conversation_id?: string;
    scheduled_date?: string;
    notes?: string;
  }) => {
    if (!user) return null;

    try {
      const { data: viewing, error } = await supabase
        .from('viewings')
        .insert({
          ...data,
          landlord_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      await fetchViewings();
      toast({
        title: "Success",
        description: "Viewing request created successfully",
      });

      return viewing;
    } catch (error) {
      console.error('Error creating viewing:', error);
      toast({
        title: "Error",
        description: "Failed to create viewing request",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateViewingStatus = async (viewingId: string, status: string, notes?: string) => {
    try {
      const updateData: any = { status };
      
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }
      
      if (notes !== undefined) {
        updateData.notes = notes;
      }

      const { error } = await supabase
        .from('viewings')
        .update(updateData)
        .eq('id', viewingId);

      if (error) throw error;

      await fetchViewings();
      toast({
        title: "Success",
        description: `Viewing ${status} successfully`,
      });

      return true;
    } catch (error) {
      console.error('Error updating viewing:', error);
      toast({
        title: "Error",
        description: "Failed to update viewing status",
        variant: "destructive",
      });
      return false;
    }
  };

  const scheduleViewing = async (viewingId: string, scheduledDate: string) => {
    try {
      const { error } = await supabase
        .from('viewings')
        .update({
          scheduled_date: scheduledDate,
          status: 'scheduled'
        })
        .eq('id', viewingId);

      if (error) throw error;

      await fetchViewings();
      toast({
        title: "Success",
        description: "Viewing scheduled successfully",
      });

      return true;
    } catch (error) {
      console.error('Error scheduling viewing:', error);
      toast({
        title: "Error",
        description: "Failed to schedule viewing",
        variant: "destructive",
      });
      return false;
    }
  };

  const getCompletedViewing = async (propertyId: string, tenantId: string) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('viewings')
        .select('*')
        .eq('property_id', propertyId)
        .eq('landlord_id', user.id)
        .eq('tenant_id', tenantId)
        .eq('status', 'completed')
        .not('completed_at', 'is', null)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error checking completed viewing:', error);
      return null;
    }
  };

  // Check if tenant can access application for a property
  const checkApplicationAccess = async (propertyId: string, tenantId: string) => {
    try {
      const { data, error } = await supabase.rpc('can_access_application', {
        property_uuid: propertyId,
        tenant_uuid: tenantId
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error checking application access:', error);
      return false;
    }
  };

  // Confirm viewing completion (landlord action)
  const confirmViewing = async (viewingId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('viewings')
        .update({ viewing_confirmed: true })
        .eq('id', viewingId)
        .eq('landlord_id', user.id);

      if (error) throw error;

      await fetchViewings();
      toast({
        title: "Success",
        description: "Viewing confirmed successfully",
      });

      return true;
    } catch (error) {
      console.error('Error confirming viewing:', error);
      toast({
        title: "Error",
        description: "Failed to confirm viewing",
        variant: "destructive",
      });
      return false;
    }
  };

  // Send application to tenant (landlord action)
  const sendApplication = async (viewingId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('viewings')
        .update({ application_sent: true })
        .eq('id', viewingId)
        .eq('landlord_id', user.id)
        .eq('viewing_confirmed', true);

      if (error) throw error;

      await fetchViewings();
      toast({
        title: "Success",
        description: "Application sent to tenant",
      });

      return true;
    } catch (error) {
      console.error('Error sending application:', error);
      toast({
        title: "Error",
        description: "Failed to send application",
        variant: "destructive",
      });
      return false;
    }
  };

  // Get viewing status for property-tenant pair
  const getViewingStatus = async (propertyId: string, tenantId: string) => {
    try {
      const { data, error } = await supabase
        .from('viewings')
        .select('*')
        .eq('property_id', propertyId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting viewing status:', error);
      return null;
    }
  };

  return {
    viewings,
    loading,
    createViewing,
    updateViewingStatus,
    scheduleViewing,
    getCompletedViewing,
    fetchViewings,
    checkApplicationAccess,
    confirmViewing,
    sendApplication,
    getViewingStatus,
  };
};