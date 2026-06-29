// @ts-nocheck
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@mzanzihomes/ui/components/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@mzanzihomes/ui/components/table';
import { Badge } from '@mzanzihomes/ui/components/badge';
import { MoreHorizontal, Trash2, AlertCircle, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@mzanzihomes/supabase/client';

export interface User {
  id: string;
  email: string;
  full_name?: string;
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
      
      // Call our serverless function
      const { data, error } = await supabase.functions.invoke('admin/users', {
        method: 'GET'
      });

      if (error) throw error;
      
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleWarnUser = async (userId: string) => {
    toast({
      variant: "destructive",
      title: "Feature not available",
      description: "User warning feature is not yet configured."
    });
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      // Call the edge function to delete the user
      const { data, error } = await supabase.functions.invoke('admin/users', {
        method: 'DELETE',
        body: { userId }
      });

      if (error) throw error;

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
