import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Trash2, AlertCircle, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface User {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at?: string;
  is_banned?: boolean;
  warning_count?: number;
}

export function UsersManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Get all users from auth
      const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();
      if (authError) throw authError;
      
      // Get user profiles
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, warning_count, is_banned, created_at, updated_at');
      
      if (profileError) throw profileError;

      // Combine auth and profile data
      const usersWithProfiles = authUsers.map(user => {
        const profile = profiles?.find(p => p.user_id === user.id);
        return {
          id: user.id,
          email: user.email || 'No email',
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at,
          is_banned: profile?.is_banned || false,
          warning_count: profile?.warning_count || 0
        };
      });

      setUsers(usersWithProfiles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        variant: "destructive",
        title: "Error loading users",
        description: "Failed to fetch user data."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleWarnUser = async (userId: string) => {
    try {
      // Call the increment_warning_count function
      const { error } = await supabase.rpc('increment_warning_count', { user_id: userId });
      
      if (error) throw error;
      
      toast({
        title: "User warned",
        description: "A warning has been issued to the user."
      });
      
      // Refresh user list
      await fetchUsers();
    } catch (error) {
      console.error('Error warning user:', error);
      toast({
        variant: "destructive",
        title: "Error warning user",
        description: "Failed to issue warning."
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      // Delete user from auth
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);
      if (authError) throw authError;

      // Delete user data from profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);

      if (profileError) throw profileError;

      // Remove user from the list
      setUsers(users.filter(user => user.id !== userId));

      toast({
        title: "User deleted",
        description: "The user has been successfully removed."
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        variant: "destructive",
        title: "Error deleting user",
        description: "Failed to delete user. Please try again."
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">User Management</h1>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Warnings</TableHead>
              <TableHead>Last Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length > 0 ? (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>
                    {user.is_banned ? (
                      <span className="bg-destructive text-destructive-foreground px-2 py-1 rounded-full text-xs">Banned</span>
                    ) : (
                      <span className="border border-input bg-background px-2 py-1 rounded-full text-xs">Active</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.warning_count > 0 ? (
                      <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">
                        {user.warning_count} warning(s)
                      </span>
                    ) : (
                      <span className="text-muted-foreground">None</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.last_sign_in_at 
                      ? new Date(user.last_sign_in_at).toLocaleDateString() 
                      : 'Never'}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleWarnUser(user.id)}
                      disabled={user.is_banned}
                      className="mr-2"
                    >
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Warn
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteUser(user.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default UsersManagement;
