import { supabase } from '@/integrations/supabase/client';
import { ApplicationRequest, ApplicationRequestInsert, ApplicationRequestUpdate, ApplicationRequestFilters, ApplicationRequestResponse } from '@/types/application';

export type ApplicationStatus = 'invited' | 'submitted' | 'pending_credit_check' | 'pending' | 'accepted' | 'declined';

export const createApplicationRequest = async (request: Omit<ApplicationRequestInsert, 'status' | 'created_at' | 'updated_at'>, status: ApplicationStatus = 'pending') => {
  try {
    const { data, error } = await supabase
      .from('applications')  // Changed from 'application_requests' to 'applications'
      .insert([{ 
        ...request, 
        status: 'pending', // Ensure we always use a valid status
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select('*')
      .single();

    if (error) {
      console.error('Error creating application:', error);
      throw error;
    }

    return data as ApplicationRequest;
  } catch (error) {
    console.error('Error in createApplicationRequest:', error);
    throw error;
  }
};

export const getApplicationRequest = async (id: string): Promise<ApplicationRequest> => {
  const { data, error } = await supabase
    .from('application_requests')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching application request:', error);
    throw error;
  }

  return data as ApplicationRequest;
};

export const updateApplicationRequestStatus = async (id: string, status: ApplicationStatus): Promise<ApplicationRequest> => {
  const { data, error } = await supabase
    .from('application_requests')
    .update({ status })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating application request status:', error);
    throw error;
  }

  return data as ApplicationRequest;
};

export const getApplicationRequests = async (filters: ApplicationRequestFilters = {}): Promise<ApplicationRequestResponse> => {
  let query = supabase
    .from('application_requests')
    .select('*, property:properties(id, title, address, image_url), tenant:profiles!application_requests_tenant_id_fkey(id, full_name, email, avatar_url)', 
      { count: 'exact' });

  // Apply filters
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.property_id) {
    query = query.eq('property_id', filters.property_id);
  }
  if (filters.tenant_id) {
    query = query.eq('tenant_id', filters.tenant_id);
  }
  if (filters.landlord_id) {
    query = query.eq('landlord_id', filters.landlord_id);
  }
  if (filters.search) {
    query = query.or(`property.title.ilike.%${filters.search}%,tenant.full_name.ilike.%${filters.search}%`);
  }

  // Pagination
  const page = filters.page || 1;
  const limit = filters.limit || 10;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  query = query.range(from, to).order('created_at', { ascending: false });

  const { data, count, error } = await query;

  if (error) {
    console.error('Error fetching application requests:', error);
    throw error;
  }

  // Get stats
  const { data: statsData } = await supabase
    .from('application_requests')
    .select('status', { count: 'exact', head: false });

  const stats = {
    total: count || 0,
    pending: statsData?.filter(r => r.status === 'pending').length || 0,
    approved: statsData?.filter(r => r.status === 'approved').length || 0,
    rejected: statsData?.filter(r => r.status === 'rejected').length || 0,
  };

  return {
    data: data as any[],
    count: count || 0,
    stats,
  };
};

export const getApplicationRequestStats = async (landlordId: string) => {
  const { data, error } = await supabase
    .from('application_requests')
    .select('status')
    .eq('landlord_id', landlordId);

  if (error) {
    console.error('Error fetching application request stats:', error);
    throw error;
  }

  return {
    total: data.length,
    pending: data.filter(r => r.status === 'pending').length,
    approved: data.filter(r => r.status === 'approved').length,
    rejected: data.filter(r => r.status === 'rejected').length,
  };
};

// Subscribe to application request changes
export const subscribeToApplicationRequests = (
  userId: string,
  callback: (payload: any) => void
) => {
  const subscription = supabase
    .channel('application_requests_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'application_requests',
        filter: `landlord_id=eq.${userId}`,
      },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
};
