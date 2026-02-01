// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Download, Eye, Building2, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AgencyReviewDrawer, type AdminAgencyListItem, type AgencyStatus } from '@/components/admin/AgencyReviewDrawer';

function AgencyStatusPill({ status }: { status: AgencyStatus }) {
  const variant = status === 'approved' ? 'default' : status === 'declined' ? 'destructive' : 'secondary';
  const label = status === 'draft' ? 'Draft' : status === 'submitted' ? 'Submitted' : status === 'approved' ? 'Approved' : 'Declined';
  return <Badge variant={variant as any}>{label}</Badge>;
}

function AgencyManagementContent() {
  const { toast } = useToast();

  const [agencies, setAgencies] = useState<AdminAgencyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<AgencyStatus | 'all'>('all');
  const [stats, setStats] = useState({ total: 0, submitted: 0, approved: 0, declined: 0 });

  const fetchAgencies = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('agencies')
        .select('id,name,status,created_by,created_at,approved_by,approved_at,decline_reason')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rows: AdminAgencyListItem[] = (data || []) as any;
      setAgencies(rows);

      const total = rows.length;
      const submitted = rows.filter((a) => a.status === 'submitted').length;
      const approved = rows.filter((a) => a.status === 'approved').length;
      const declined = rows.filter((a) => a.status === 'declined').length;
      setStats({ total, submitted, approved, declined });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error loading agencies', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgencies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    return agencies.filter((a) => {
      const matchesSearch = a.name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [agencies, searchTerm, statusFilter]);

  const exportToCSV = () => {
    const csvData = filtered.map((a) => ({
      'Agency Name': a.name,
      Status: a.status,
      'Created At': a.created_at ? new Date(a.created_at).toLocaleDateString() : 'N/A',
      'Approved At': a.approved_at ? new Date(a.approved_at).toLocaleDateString() : 'N/A',
      'Decline Reason': a.decline_reason || 'N/A',
    }));

    const csvContent = [Object.keys(csvData[0] || {}).join(','), ...csvData.map((row) => Object.values(row).join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agency-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReview = () => {
    fetchAgencies();
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Agency Management</h1>
          <p className="text-muted-foreground">Review and approve agency signups</p>
        </div>

        <Button onClick={exportToCSV} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Agencies</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
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

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by agency name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>

            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Agency Submissions ({filtered.length})</CardTitle>
          <CardDescription>Click Review to see uploaded docs and approve/decline</CardDescription>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>No agencies found matching your filters.</AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((agency) => (
                  <TableRow key={agency.id}>
                    <TableCell>
                      <div className="font-medium">{agency.name}</div>
                      <div className="text-sm text-muted-foreground">{agency.id}</div>
                    </TableCell>
                    <TableCell>
                      <AgencyStatusPill status={agency.status} />
                    </TableCell>
                    <TableCell>
                      {agency.created_at ? new Date(agency.created_at).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell>
                      <AgencyReviewDrawer agency={agency} onReview={handleReview}>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          Review
                        </Button>
                      </AgencyReviewDrawer>
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

export default function AgencyManagement() {
  return (
    <AdminLayout>
      <AgencyManagementContent />
    </AdminLayout>
  );
}
