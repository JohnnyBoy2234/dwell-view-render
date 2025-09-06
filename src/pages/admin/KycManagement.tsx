import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Filter, 
  Download,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { KycStatusPill } from '@/components/kyc/KycStatusPill';
import { KycReviewDrawer } from '@/components/admin/KycReviewDrawer';
import type { AdminKycListItem, KycStatus } from '@/types/kyc';

export default function KycManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [kycProfiles, setKycProfiles] = useState<AdminKycListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<KycStatus | 'all'>('all');
  const [stats, setStats] = useState({
    total: 0,
    submitted: 0,
    approved: 0,
    declined: 0
  });

  // Check admin access
  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!user) {
        navigate('/auth');
        return;
      }

      try {
        const { data, error } = await supabase.rpc('is_admin', { user_id: user.id });
        if (error || !data) {
          toast({
            variant: "destructive",
            title: "Access Denied",
            description: "You don't have admin privileges",
          });
          navigate('/');
          return;
        }
      } catch (error) {
        navigate('/');
      }
    };

    checkAdminAccess();
  }, [user, navigate]);

  const fetchKycProfiles = async () => {
    setLoading(true);
    try {
      // Fetch KYC profiles with user info
      const { data, error } = await supabase
        .from('kyc_profiles')
        .select(`
          *,
          profiles!inner(
            display_name,
            user_id
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to include user email
      const profilesWithUserInfo: AdminKycListItem[] = await Promise.all(
        (data || []).map(async (profile: any) => {
          // Get user email from auth.users (we need to use a function for this)
          const { data: userData } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('user_id', profile.user_id)
            .single();

          // For now, we'll use the user_id as email placeholder
          // In production, you'd want a function to get the actual email
          return {
            ...profile,
            user_email: `user-${profile.user_id.slice(0, 8)}@example.com`, // Placeholder
            user_display_name: profile.profiles?.display_name || 'Unknown User'
          };
        })
      );

      setKycProfiles(profilesWithUserInfo);

      // Calculate stats
      const total = profilesWithUserInfo.length;
      const submitted = profilesWithUserInfo.filter(p => p.status === 'submitted').length;
      const approved = profilesWithUserInfo.filter(p => p.status === 'approved').length;
      const declined = profilesWithUserInfo.filter(p => p.status === 'declined').length;

      setStats({ total, submitted, approved, declined });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading KYC data",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKycProfiles();
  }, []);

  const filteredProfiles = kycProfiles.filter(profile => {
    const matchesSearch = profile.user_display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         profile.user_email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || profile.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleReview = () => {
    fetchKycProfiles(); // Refresh the list
  };

  const exportToCSV = () => {
    const csvData = filteredProfiles.map(profile => ({
      'User Email': profile.user_email,
      'Display Name': profile.user_display_name,
      'Status': profile.status,
      'Submitted At': profile.submitted_at ? new Date(profile.submitted_at).toLocaleDateString() : 'N/A',
      'Reviewed At': profile.reviewed_at ? new Date(profile.reviewed_at).toLocaleDateString() : 'N/A',
      'Notes': profile.notes || 'N/A'
    }));

    const csvContent = [
      Object.keys(csvData[0] || {}).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kyc-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">KYC Management</h1>
          <p className="text-muted-foreground">
            Review and manage identity verification submissions
          </p>
        </div>
        
        <Button onClick={exportToCSV} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.submitted}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approved}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Declined</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.declined}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by email or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="not_started">Not Started</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* KYC Table */}
      <Card>
        <CardHeader>
          <CardTitle>KYC Submissions ({filteredProfiles.length})</CardTitle>
          <CardDescription>
            Click on a row to review documents and make decisions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredProfiles.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No KYC submissions found matching your filters.
              </AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Reviewed</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProfiles.map((profile) => (
                  <TableRow key={profile.user_id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{profile.user_display_name}</div>
                        <div className="text-sm text-muted-foreground">{profile.user_email}</div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <KycStatusPill status={profile.status} />
                    </TableCell>
                    
                    <TableCell>
                      {profile.submitted_at ? (
                        <div className="text-sm">
                          {new Date(profile.submitted_at).toLocaleDateString()}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      {profile.reviewed_at ? (
                        <div className="text-sm">
                          {new Date(profile.reviewed_at).toLocaleDateString()}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <KycReviewDrawer 
                        kycProfile={profile} 
                        onReview={handleReview}
                      >
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          Review
                        </Button>
                      </KycReviewDrawer>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}