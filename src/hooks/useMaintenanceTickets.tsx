// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { classifyMaintenance, getSLAHours } from '@/utils/maintenanceClassifier';
import type { MaintenanceRequest, CreateMaintenanceRequest } from '@/types/maintenance';

export function useMaintenanceTickets(propertyId?: string) {
  const [tickets, setTickets] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchTickets = async () => {
    if (!user) return;

    try {
      setLoading(true);
      let query = supabase
        .from('maintenance_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (propertyId) {
        query = query.eq('property_id', propertyId);
      } else {
        // Filter by user role
        query = query.or(`tenant_id.eq.${user.id},landlord_id.eq.${user.id}`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTickets((data || []) as unknown as MaintenanceRequest[]);
      setError(null);
    } catch (err) {
      console.error('Error fetching maintenance tickets:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch tickets');
    } finally {
      setLoading(false);
    }
  };

  const createTicket = async (ticketData: CreateMaintenanceRequest) => {
    if (!user) throw new Error('User not authenticated');

    // Get property to find landlord
    const { data: property, error: propError } = await supabase
      .from('properties')
      .select('landlord_id')
      .eq('id', ticketData.property_id)
      .single();

    if (propError || !property) throw new Error('Property not found');

    // Classify the issue
    const classification = classifyMaintenance(`${ticketData.title} ${ticketData.description}`);

    const { data, error } = await supabase
      .from('maintenance_tickets')
      .insert({
        ...ticketData,
        tenant_id: user.id,
        landlord_id: property.landlord_id,
        status: 'submitted' as const
      })
      .select()
      .single();

    if (error) throw error;

    // Log workflow step
    await supabase.from('workflow_runs').insert({
      workflow_name: 'maintenance',
      entity_type: 'maintenance',
      entity_id: data.id,
      step: 'reported',
      meta: { 
        category: classification.category,
        urgency: classification.urgency,
        confidence: classification.confidence,
        auto_classified: true
      } as any
    });

    await fetchTickets();
    return data;
  };

  const updateTicketStatus = async (
    ticketId: string, 
    status: MaintenanceRequest['status'],
    metadata?: Record<string, any>
  ) => {
    const { error } = await supabase
      .from('maintenance_tickets')
      .update({ 
        status,
        ...metadata
      })
      .eq('id', ticketId);

    if (error) throw error;

    // Log workflow step
    await supabase.from('workflow_runs').insert({
      workflow_name: 'maintenance',
      entity_type: 'maintenance',
      entity_id: ticketId,
      step: status,
      meta: metadata || {}
    });

    await fetchTickets();
  };

  const assignVendor = async (
    ticketId: string,
    vendorName: string,
    vendorContact: string,
    estimatedCost?: number
  ) => {
    await updateTicketStatus(ticketId, 'in_progress', {
      contractor_name: vendorName,
      contractor_contact: vendorContact,
      estimated_cost: estimatedCost
    });
  };

  const completeTicket = async (
    ticketId: string,
    actualCost?: number,
    notes?: string
  ) => {
    await updateTicketStatus(ticketId, 'completed', {
      actual_cost: actualCost,
      completed_date: new Date().toISOString().split('T')[0],
      notes: notes
    });
  };

  const approveWork = async (ticketId: string) => {
    await updateTicketStatus(ticketId, 'completed');
  };

  const disputeWork = async (ticketId: string, reason: string) => {
    await updateTicketStatus(ticketId, 'cancelled', {
      dispute_reason: reason
    });
  };

  useEffect(() => {
    fetchTickets();
  }, [user, propertyId]);

  // Set up real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('maintenance_tickets')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'maintenance_tickets',
          filter: `tenant_id=eq.${user.id}`
        },
        () => {
          fetchTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    tickets,
    loading,
    error,
    createTicket,
    updateTicketStatus,
    assignVendor,
    completeTicket,
    approveWork,
    disputeWork,
    refetch: fetchTickets
  };
}