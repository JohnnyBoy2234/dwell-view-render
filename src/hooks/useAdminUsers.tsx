import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AdminUser {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  profiles?: {
    display_name: string;
    user_id: string;
  };
}

export function useAdminUsers() {
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAdminUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          *,
          profiles (
            display_name,
            user_id
          )
        `)
        .eq('role', 'admin')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdminUsers((data as any) || []);
    } catch (error: any) {
      console.error('Error fetching admin users:', error);
      toast({
        variant: "destructive",
        title: "Error loading admin users",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const createAdminUser = async (email: string, displayName: string) => {
    try {
      // First, create the user account using admin function
      const { data, error } = await supabase.functions.invoke('create-admin-user', {
        body: { email, displayName }
      });

      if (error) throw error;

      toast({
        title: "Admin user created",
        description: `Admin account created for ${email}. They will receive an email with login instructions.`
      });

      // Refresh the list
      await fetchAdminUsers();
      return { success: true };
    } catch (error: any) {
      console.error('Error creating admin user:', error);
      toast({
        variant: "destructive",
        title: "Error creating admin user",
        description: error.message
      });
      return { success: false, error: error.message };
    }
  };

  const removeAdminUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'admin');

      if (error) throw error;

      toast({
        title: "Admin access removed",
        description: "The user's admin access has been revoked."
      });

      // Refresh the list
      await fetchAdminUsers();
    } catch (error: any) {
      console.error('Error removing admin user:', error);
      toast({
        variant: "destructive",
        title: "Error removing admin access",
        description: error.message
      });
    }
  };

  useEffect(() => {
    fetchAdminUsers();
  }, []);

  return {
    adminUsers,
    loading,
    fetchAdminUsers,
    createAdminUser,
    removeAdminUser
  };
}