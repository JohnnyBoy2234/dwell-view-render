import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Wrench, Building, Images, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { MaintenanceImageGallery } from '@/components/maintenance/MaintenanceImageGallery';
import { useUnreadCounts } from '@/hooks/maintenance/useUnreadCounts';

interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  status: 'submitted' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  property_title: string;
  images?: string[];
}

interface SupabaseMaintenanceRequest {
  id: string;
  title: string;
  description: string;
  status: 'submitted' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  property_id: string;
  images?: string[];
}

export default function LandlordMaintenance() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: unreadCounts } = useUnreadCounts();

  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, [user]);

  const fetchRequests = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select('id, title, description, status, priority, created_at, property_id, images')
        .eq('landlord_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const reqs = (data as SupabaseMaintenanceRequest[] | null) ?? [];
      const propertyIds = reqs.map(r => r.property_id);
      let propertiesMap: Record<string, string> = {};
      if (propertyIds.length > 0) {
        const { data: propsData } = await supabase
          .from('properties')
          .select('id, title')
          .in('id', propertyIds);
        propertiesMap = Object.fromEntries(
          ((propsData as { id: string; title: string }[] | null) || []).map(p => [p.id, p.title])
        );
      }

      const transformed = reqs.map((req) => ({
        id: req.id,
        title: req.title,
        description: req.description,
        status: req.status,
        priority: req.priority,
        created_at: req.created_at,
        property_title: propertiesMap[req.property_id] || 'Unknown Property',
        images: req.images || [],
      }));
      setRequests(transformed);
    } catch (error) {
      console.error('Error fetching maintenance requests:', error);
      toast({ title: 'Error', description: 'Failed to fetch maintenance requests', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: MaintenanceRequest['status']) => {
    const previous = [...requests];
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    try {
      const { error } = await supabase
        .from('maintenance_requests')
        .update({ status })
        .eq('id', id)
        .eq('landlord_id', user?.id);
      if (error) throw error;
      toast({ title: 'Status Updated', description: `Request marked as ${status.replace('_', ' ')}` });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
      setRequests(previous);
    }
  };

  const getStatusBadge = (status: MaintenanceRequest['status']) => {
    switch (status) {
      case 'submitted':
        return 'bg-blue-500 text-white';
      case 'in_progress':
        return 'bg-earth-warm text-white';
      case 'completed':
        return 'bg-success-green text-white';
      case 'cancelled':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const priorityColors: Record<NonNullable<MaintenanceRequest['priority']>, string> = {
    low: 'bg-success-green text-white',
    medium: 'bg-earth-warm text-white',
    high: 'bg-destructive text-white',
  };

  const submittedCount = requests.filter(r => r.status === 'submitted').length;
  const inProgressCount = requests.filter(r => r.status === 'in_progress').length;
  const completedCount = requests.filter(r => r.status === 'completed').length;
  const highPriorityCount = requests.filter(r => r.priority === 'high').length;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Maintenance Requests</h1>
          <p className="text-muted-foreground">View and manage maintenance requests from your tenants</p>
        </div>
        {unreadCounts && unreadCounts.total > 0 && (
          <Badge className="bg-destructive text-white px-3 py-1">{unreadCounts.total} new responses</Badge>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100/60">
          <CardContent className="p-4">
            <div className="flex flex-col items-center text-center">
              <Clock className="h-8 w-8 text-orange-600 mb-2" />
              <div className="text-3xl font-bold text-orange-700 mb-1">{submittedCount}</div>
              <p className="text-sm font-medium text-orange-600">Submitted</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/60">
          <CardContent className="p-4">
            <div className="flex flex-col items-center text-center">
              <Wrench className="h-8 w-8 text-blue-600 mb-2" />
              <div className="text-3xl font-bold text-blue-700 mb-1">{inProgressCount}</div>
              <p className="text-sm font-medium text-blue-600">In Progress</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100/60">
          <CardContent className="p-4">
            <div className="flex flex-col items-center text-center">
              <CheckCircle className="h-8 w-8 text-green-600 mb-2" />
              <div className="text-3xl font-bold text-green-700 mb-1">{completedCount}</div>
              <p className="text-sm font-medium text-green-600">Completed</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-gradient-to-br from-red-50 to-red-100/60">
          <CardContent className="p-4">
            <div className="flex flex-col items-center text-center">
              <AlertTriangle className="h-8 w-8 text-red-600 mb-2" />
              <div className="text-3xl font-bold text-red-700 mb-1">{highPriorityCount}</div>
              <p className="text-sm font-medium text-red-600">High Priority</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Requests</CardTitle>
          <CardDescription>Track and update maintenance across your properties</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8">
              <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No maintenance requests yet</p>
            </div>
          ) : (
            requests.map((req) => (
              <Card key={req.id} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-ocean-blue cursor-pointer" onClick={() => navigate(`/dashboard/maintenance/${req.id}`)}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{req.title}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Building className="h-3 w-3" />
                        <span className="truncate">{req.property_title}</span>
                        <span className="text-muted-foreground">•</span>
                        <span>{new Date(req.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`${priorityColors[req.priority]} font-semibold px-3 py-1`}>{req.priority.toUpperCase()}</Badge>
                      <Badge className={`${getStatusBadge(req.status)} font-semibold px-3 py-1`}>{req.status.replace('_', ' ').toUpperCase()}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">{req.description}</p>
                    {req.images && req.images.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Images className="h-4 w-4" />
                          <span>{req.images.length} image(s) attached</span>
                        </div>
                        <MaintenanceImageGallery images={req.images} ticketTitle={req.title} />
                      </div>
                    )}
                    <div className="flex items-center gap-3 pt-2 border-t border-muted">
                      <Select value={req.status} onValueChange={(value) => updateStatus(req.id, value as MaintenanceRequest['status'])}>
                        <SelectTrigger className="w-[160px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="submitted">Submitted</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button size="sm" className="ml-auto bg-ocean-blue hover:bg-ocean-blue-dark" onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/maintenance/${req.id}`); }}>Respond</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

