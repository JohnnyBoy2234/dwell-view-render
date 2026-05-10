// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  ApplicationRequest, 
  ApplicationRequestFilters, 
  ApplicationRequestResponse,
  ApplicationRequestStatus
} from '@/types/application';
import { 
  createApplicationRequest, 
  getApplicationRequest, 
  updateApplicationRequestStatus, 
  getApplicationRequests, 
  getApplicationRequestStats,
  subscribeToApplicationRequests
} from '@/services/applicationRequestService';
import { toast } from 'sonner';

export const useApplicationRequests = (initialFilters: ApplicationRequestFilters = {}) => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ApplicationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFilters] = useState<ApplicationRequestFilters>({
    ...initialFilters,
    landlord_id: user?.id,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  const fetchRequests = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const response = await getApplicationRequests({
        ...filters,
        page: pagination.page,
        limit: pagination.limit,
        landlord_id: user.id,
      });

      setRequests(response.data);
      setPagination(prev => ({
        ...prev,
        total: response.count,
        totalPages: Math.ceil(response.count / pagination.limit),
      }));
      setStats(response.stats);
    } catch (err) {
      console.error('Error fetching application requests:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch application requests'));
    } finally {
      setLoading(false);
    }
  }, [user?.id, filters, pagination.page, pagination.limit]);

  const fetchStats = useCallback(async () => {
    if (!user?.id) return;

    try {
      const stats = await getApplicationRequestStats(user.id);
      setStats(stats);
    } catch (err) {
      console.error('Error fetching application request stats:', err);
    }
  }, [user?.id]);

  // Initial fetch
  useEffect(() => {
    fetchRequests();
    fetchStats();
  }, [fetchRequests, fetchStats]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = subscribeToApplicationRequests(user.id, (payload) => {
      // Refresh data when changes occur
      fetchRequests();
      fetchStats();
    });

    return () => {
      unsubscribe();
    };
  }, [user?.id, fetchRequests, fetchStats]);

  const createRequest = useCallback(async (propertyId: string) => {
    if (!user?.id) throw new Error('User not authenticated');

    try {
      setLoading(true);
      
      // Check if there's already a pending request
      const existingRequest = requests.find(
        req => req.property_id === propertyId && 
               req.tenant_id === user.id && 
               req.status === 'pending'
      );

      if (existingRequest) {
        toast.info('You already have a pending application request for this property');
        return existingRequest;
      }

      // Get property details to get landlord_id
      const { data: property, error: propertyError } = await supabase
        .from('properties')
        .select('landlord_id')
        .eq('id', propertyId)
        .single();

      if (propertyError || !property) {
        throw new Error('Property not found');
      }

      // Create the request without the status field
      const requestData = {
        property_id: propertyId,
        tenant_id: user.id,
        landlord_id: property.landlord_id
      };

      const newRequest = await createApplicationRequest(requestData);

      // Update local state with the new request
      setRequests(prev => [{
        ...newRequest,
        status: 'pending' // Add status for local state
      }, ...prev]);
      
      // Update stats
      if (user.id) {
        const updatedStats = await getApplicationRequestStats(user.id);
        setStats(prev => ({
          ...prev,
          pending: updatedStats.pending || 0,
          total: updatedStats.total || 0
        }));
      }

      toast.success('Application requested successfully');
      return newRequest;
    } catch (error) {
      console.error('Error creating application request:', error);
      toast.error('Failed to request application. Please try again.');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user?.id, requests]);

  const updateRequestStatus = useCallback(async (requestId: string, status: ApplicationRequestStatus) => {
    if (!user?.id) throw new Error('User not authenticated');

    try {
      setLoading(true);
      const updatedRequest = await updateApplicationRequestStatus(requestId, status, user.id);
      
      // Update local state
      setRequests(prev => 
        prev.map(req => 
          req.id === requestId ? { ...req, status, updated_at: new Date().toISOString() } : req
        )
      );
      
      // Update stats
      const updatedStats = await getApplicationRequestStats(user.id);
      setStats({
        total: updatedStats.total,
        pending: updatedStats.pending,
        approved: updatedStats.approved,
        rejected: updatedStats.rejected
      });

      toast.success(`Application ${status} successfully`);
      return updatedRequest;
    } catch (error) {
      console.error('Error updating application status:', error);
      toast.error(`Failed to ${status} application. Please try again.`);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const refetch = () => {
    fetchRequests();
    fetchStats();
  };

  const setPage = (page: number) => {
    setPagination(prev => ({
      ...prev,
      page,
    }));
  };

  const setLimit = (limit: number) => {
    setPagination(prev => ({
      ...prev,
      limit,
      page: 1, // Reset to first page when changing limit
    }));
  };

  const updateFilters = (newFilters: Partial<ApplicationRequestFilters>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
    }));
    setPagination(prev => ({
      ...prev,
      page: 1, // Reset to first page when filters change
    }));
  };

  return {
    requests,
    loading,
    error,
    filters,
    pagination,
    stats,
    createRequest,
    updateRequestStatus,
    fetchRequests,
    setFilters,
    setPagination,
    refetch: fetchRequests
  };
};
