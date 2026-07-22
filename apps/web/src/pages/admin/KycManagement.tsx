// @ts-nocheck
import { useState, useEffect } from 'react';
import { Button } from '@mzanzihomes/ui/components/button';
import { Input } from '@mzanzihomes/ui/components/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import { Badge } from '@mzanzihomes/ui/components/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@mzanzihomes/ui/components/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@mzanzihomes/ui/components/table';
import { Alert, AlertDescription } from '@mzanzihomes/ui/components/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@mzanzihomes/ui/components/tabs';
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
import { supabase } from '@mzanzihomes/supabase/client';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';
import { KycStatusPill } from '@mzanzihomes/features/kyc';
import { KycReviewDrawer } from '@/components/admin/KycReviewDrawer';
import type { AdminKycListItem, KycStatus } from '@mzanzihomes/common/types/kyc';

function KycManagementContent() {
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


  const fetchKycProfiles = async () => {
    setLoading(true);
    try {
      // Fetch KYC profiles
      const { data: kycData, error: kycError } = await supabase
        .from('kyc_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (kycError) throw kycError;

      // Fetch user profiles separately (only if we have KYC data)
      let profilesData = [];
      if (kycData && kycData.length > 0) {
        const userIds = kycData.map(profile => profile.user_id);
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, display_name')
          .in('user_id', userIds);

        if (profilesError) {
          console.warn('Error fetching user profiles:', profilesError);
          // Don't throw - continue with empty profiles
        } else {
          profilesData = profiles || [];
        }
      }

      // Create a map of user profiles for quick lookup
      const profilesMap = new Map(
        (profilesData || []).map(profile => [profile.user_id, profile])
      );

      // Transform data to include user info
      const profilesWithUserInfo: AdminKycListItem[] = (kycData || []).map((profile: any) => {
        const userProfile = profilesMap.get(profile.user_id);
        
        return {
          ...profile,
          user_email: `user-${profile.user_id.slice(0, 8)}@example.com`, // Placeholder
          user_display_name: userProfile?.display_name || 'Unknown User',
          // Handle both old and new field names
          id_front_path: profile.id_front_path || profile.id_doc_path,
          id_back_path: profile.id_back_path
        };
      });

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
    <div className="container mx-auto space-y-6">
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

export default function KycManagement() {
  return (
    <>
      <KycManagementContent />
    </>
  );
}