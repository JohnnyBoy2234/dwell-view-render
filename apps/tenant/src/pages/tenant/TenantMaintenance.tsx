// @ts-nocheck
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMaintenanceRequests, useCreateMaintenanceRequest } from '@mzanzihomes/features/maintenance';
import { useUnreadCounts } from '@mzanzihomes/supabase/hooks/useUnreadCounts';
import { useTenantResponses } from '@mzanzihomes/features/maintenance';
import { Plus, Wrench } from 'lucide-react';
import { Card, CardContent } from '@mzanzihomes/ui/components/card';
import { RecordCard } from '@mzanzihomes/ui/components/RecordCard';
import { Button } from '@mzanzihomes/ui/components/button';
import { Textarea } from '@mzanzihomes/ui/components/textarea';
import { Input } from '@mzanzihomes/ui/components/input';
import { Label } from '@mzanzihomes/ui/components/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@mzanzihomes/ui/components/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@mzanzihomes/ui/components/dialog';
import { useTenantDashboard } from '@/hooks/useTenantDashboard';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@mzanzihomes/supabase/client';
import type { Priority, Category } from '@mzanzihomes/common/types/maintenance';

const statusBadges = {
  submitted: { label: 'Submitted', className: 'bg-blue-500 text-white' },
  in_progress: { label: 'In Progress', className: 'bg-earth-warm text-white' },
  completed: { label: 'Completed', className: 'bg-success-green text-white' },
  cancelled: { label: 'Cancelled', className: 'bg-muted text-muted-foreground' },
};

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1).replace('_', ' ');

const shortDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export default function TenantMaintenance() {
  const { user } = useAuth();
  const { tenantProperty } = useTenantDashboard();
  const navigate = useNavigate();
  const { data: unreadCounts } = useUnreadCounts();
  const { data: responses } = useTenantResponses();
  const { data: maintenanceRequests, isLoading } = useMaintenanceRequests();
  const createMaintenance = useCreateMaintenanceRequest();
  const { toast } = useToast();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'submitted' | 'in_progress' | 'completed'>('all');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [category, setCategory] = useState<Category>('other');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Error",
        description: "Please log in to submit a maintenance request.",
        variant: "destructive",
      });
      return;
    }

    // Validate required fields
    if (!title.trim() || !description.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in both title and description.",
        variant: "destructive",
      });
      return;
    }

    try {
      let propertyId = tenantProperty?.id;
      
      // If no tenantProperty, try to find any property associated with the user
      if (!propertyId) {
        const { data: tenancyData } = await supabase
          .from('tenancies')
          .select('property_id')
          .eq('tenant_id', user.id)
          .eq('status', 'active')
          .maybeSingle();
          
        if (tenancyData) {
          propertyId = tenancyData.property_id;
        } else {
          // Fallback: Check for signed or pending lease contracts
          const { data: leaseData } = await supabase
            .from('lease_contracts')
            .select('property_id')
            .eq('tenant_id', user.id)
            .in('status', ['signed', 'pending_tenant'])
            .not('property_id', 'is', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (leaseData?.property_id) {
            propertyId = leaseData.property_id;
          } else {
            toast({
              title: "No Property Assigned",
              description: "You don't have an active lease. Please contact your landlord.",
              variant: "destructive",
            });
            return;
          }
        }
      }

      await createMaintenance.mutateAsync({
        property_id: propertyId,
        title: title.trim(),
        description: description.trim(),
        priority,
        category,
        images: [],
      });

      // Reset form
      setTitle('');
      setDescription('');
      setPriority('medium');
      setCategory('other');

      setIsCreateDialogOpen(false);
      
      toast({
        title: "Success",
        description: "Your maintenance request has been submitted successfully.",
      });
      
    } catch (error: any) {
      console.error('Error creating maintenance request:', error);
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit maintenance request. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted animate-pulse rounded"></div>
        <div className="grid gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  const counts = {
    all: maintenanceRequests?.length || 0,
    submitted: maintenanceRequests?.filter(r => r.status === 'submitted').length || 0,
    in_progress: maintenanceRequests?.filter(r => r.status === 'in_progress').length || 0,
    completed: maintenanceRequests?.filter(r => r.status === 'completed').length || 0,
  };
  const filteredRequests = (maintenanceRequests || []).filter(
    (r) => filter === 'all' || r.status === filter
  );
  const filterTabs: Array<{ key: typeof filter; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'submitted', label: 'Open' },
    { key: 'in_progress', label: 'In progress' },
    { key: 'completed', label: 'Done' },
  ];

  return (
    <div className="space-y-5 pb-24 md:pb-8">
      {/* Title lives in the dashboard app bar */}
      <div className="flex justify-end">
        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          className="shrink-0 rounded-xl"
          style={{ background: 'hsl(214,100%,59%)', color: '#fff' }}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          New
        </Button>
      </div>

      {/* Create Request Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Submit Maintenance Request</DialogTitle>
            <DialogDescription>
              Describe the issue you're experiencing and we'll get it resolved as soon as possible.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Issue Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Leaky faucet in kitchen"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Please provide detailed information about the issue..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={(value: Priority) => setPriority(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={(value: Category) => setCategory(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="plumbing">Plumbing</SelectItem>
                  <SelectItem value="electrical">Electrical</SelectItem>
                  <SelectItem value="appliance">Appliance</SelectItem>
                  <SelectItem value="pest_control">Pest Control</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit" 
              className="w-full bg-ocean-blue hover:bg-ocean-blue-dark"
              disabled={createMaintenance.isPending}
            >
              {createMaintenance.isPending ? 'Submitting...' : 'Submit Request'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Responses banner */}
      {responses && responses.length > 0 && (
        <button
          className="w-full flex items-center gap-2 rounded-xl border border-ocean-blue/20 bg-ocean-blue/5 px-4 py-2.5 text-sm text-left hover:bg-ocean-blue/10 transition-colors"
          onClick={() => navigate('/tenant-dashboard/maintenance/responses')}
        >
          <Wrench className="h-4 w-4 text-ocean-blue shrink-0" />
          <span className="flex-1">
            {responses.length} response{responses.length === 1 ? '' : 's'} from your landlord
          </span>
          <span className="text-ocean-blue font-medium">View</span>
        </button>
      )}

      {/* Status filter pills (replaces the old oversized stat cards) */}
      {(maintenanceRequests?.length || 0) > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {filterTabs.map((tab) => {
            const active = filter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium border transition-colors ${
                  active
                    ? 'bg-ocean-blue text-white border-ocean-blue'
                    : 'bg-white text-muted-foreground border-black/[0.08] hover:border-ocean-blue/40'
                }`}
              >
                {tab.label}
                <span
                  className={`text-xs tabular-nums rounded-full px-1.5 py-0.5 leading-none ${
                    active ? 'bg-white/20' : 'bg-muted'
                  }`}
                >
                  {counts[tab.key]}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Requests list */}
      {!maintenanceRequests || maintenanceRequests.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center">
            <Wrench className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium">Log a maintenance request</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Something needs fixing? Add a note describing the issue and your landlord is notified immediately.
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" /> Log maintenance request
            </Button>
          </CardContent>
        </Card>
      ) : filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No {filterTabs.find((t) => t.key === filter)?.label.toLowerCase()} requests.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((request) => (
            <RecordCard
              key={request.id}
              title={request.title}
              dateLine={`Submitted ${shortDate(request.created_at)}`}
              badge={statusBadges[request.status] ?? { label: capitalize(request.status), variant: 'outline' }}
              details={[
                { label: 'Priority', value: capitalize(request.priority) },
                { label: 'Category', value: capitalize(request.category) },
                ...(request.images?.length ? [{ label: 'Photos', value: String(request.images.length) }] : []),
              ]}
              actions={
                <Button variant="outline" size="sm" onClick={() => navigate(`/maintenance/${request.id}`)}>
                  View Details
                </Button>
              }
              onClick={() => navigate(`/maintenance/${request.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}