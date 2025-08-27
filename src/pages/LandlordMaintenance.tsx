import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Wrench, Building } from 'lucide-react';

interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  status: 'submitted' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  property_title: string;
}

interface SupabaseMaintenanceRequest {
  id: string;
  title: string;
  description: string;
  status: 'submitted' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  property_id: string;
}

export default function LandlordMaintenance() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

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
        .select('id, title, description, status, priority, created_at, property_id')
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Maintenance Requests</h1>
        <p className="text-muted-foreground">View and manage maintenance requests from your tenants</p>
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
              <Card key={req.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold">{req.title}</h4>
                      <p className="text-sm text-muted-foreground mb-1">{req.description}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Building className="h-3 w-3" />
                        <span>{req.property_title}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(req.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => navigate(`/maintenance/${req.id}`)}
                      className="bg-blue-500 hover:bg-green-500 active:bg-green-600 text-white"
                    >
                      Respond
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
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
                    <Badge className={
                      req.priority === 'high'
                        ? 'bg-destructive text-white'
                        : req.priority === 'medium'
                          ? 'bg-earth-warm text-white'
                          : 'bg-success-green text-white'
                    }>
                      {req.priority} priority
                    </Badge>
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

