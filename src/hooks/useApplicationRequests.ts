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

  const createRequest = async (propertyId: string) => {
    if (!user?.id) throw new Error('User not authenticated');

    try {
      // First, get the property to get the landlord_id
      const { data: property, error: propertyError } = await supabase
        .from('properties')
        .select('landlord_id')
        .eq('id', propertyId)
        .single();

      if (propertyError || !property) {
        throw propertyError || new Error('Property not found');
      }

      const newRequest = await createApplicationRequest({
        property_id: propertyId,
        tenant_id: user.id,
        landlord_id: property.landlord_id,
      });

      // Refresh the list
      await fetchRequests();
      await fetchStats();

      return newRequest;
    } catch (err) {
      console.error('Error creating application request:', err);
      throw err;
    }
  };

  const updateRequestStatus = async (requestId: string, status: 'approved' | 'rejected') => {
    try {
      const updatedRequest = await updateApplicationRequestStatus(requestId, status);
      
      // Update local state
      setRequests(prev => 
        prev.map(req => 
          req.id === requestId ? updatedRequest : req
        )
      );
      
      // Refresh stats
      await fetchStats();
      
      return updatedRequest;
    } catch (err) {
      console.error('Error updating application request status:', err);
      throw err;
    }
  };

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
    refetch,
    setPage,
    setLimit,
    updateFilters,
  };
};
