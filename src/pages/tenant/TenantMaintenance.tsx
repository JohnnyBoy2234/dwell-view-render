import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUnreadCounts } from '@/hooks/maintenance/useUnreadCounts';
import { useTenantResponses } from '@/hooks/maintenance/useTenantResponses';
import { Plus, Wrench, Clock, CheckCircle, AlertTriangle, Camera } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useTenantDashboard } from '@/hooks/useTenantDashboard';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const priorityColors = {
  low: 'bg-success-green text-white',
  medium: 'bg-earth-warm text-white',
  high: 'bg-destructive text-white',
};

const statusColors = {
  submitted: 'bg-blue-500 text-white',
  in_progress: 'bg-earth-warm text-white',
  completed: 'bg-success-green text-white',
  cancelled: 'bg-muted text-muted-foreground',
};

export default function TenantMaintenance() {
  const { user } = useAuth();
  const { recentMaintenance, loading, tenantProperty, refetch } = useTenantDashboard();
  const navigate = useNavigate();
  const { data: unreadCounts } = useUnreadCounts();
  const { data: responses } = useTenantResponses();

  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newRequest, setNewRequest] = useState({
    title: '',
    description: '',
    priority: 'medium',
    category: '',
  });

  const handleSubmitRequest = async () => {
    if (!newRequest.title || !newRequest.description || !newRequest.category) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (!user || !tenantProperty) {
        throw new Error('Missing tenancy information');
      }

      const { data: tenancy, error: tenancyError } = await supabase
        .from('tenancies')
        .select('landlord_id')
        .eq('tenant_id', user.id)
        .eq('property_id', tenantProperty.id)
        .eq('status', 'active')
        .single();

      if (tenancyError) throw tenancyError;

      const { error } = await supabase
        .from('maintenance_requests')
        .insert({
          title: newRequest.title,
          description: newRequest.description,
          priority: newRequest.priority,
          category: newRequest.category,
          status: 'submitted',
          tenant_id: user.id,
          landlord_id: tenancy?.landlord_id,
          property_id: tenantProperty.id,
        });

      if (error) throw error;

      toast({
        title: "Request Submitted",
        description: "Your maintenance request has been submitted successfully.",
      });

      setIsCreateDialogOpen(false);
      setNewRequest({ title: '', description: '', priority: 'medium', category: '' });
      refetch();
    } catch (error) {
      console.error('Error submitting maintenance request:', error);
      toast({
        title: 'Submission Failed',
        description: 'Unable to submit maintenance request. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Maintenance Requests</h1>
          <p className="text-muted-foreground">
            Submit new requests and track the status of existing ones
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-ocean-blue hover:bg-ocean-blue-dark">
              <Plus className="h-4 w-4 mr-2" />
              New Request
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Submit Maintenance Request</DialogTitle>
              <DialogDescription>
                Describe the issue you're experiencing and we'll get it resolved as soon as possible.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Issue Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Leaky faucet in kitchen"
                  value={newRequest.title}
                  onChange={(e) => setNewRequest(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="category">Category *</Label>
                <Select 
                  value={newRequest.category} 
                  onValueChange={(value) => setNewRequest(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="plumbing">Plumbing</SelectItem>
                    <SelectItem value="electrical">Electrical</SelectItem>
                    <SelectItem value="hvac">Heating/Cooling</SelectItem>
                    <SelectItem value="appliances">Appliances</SelectItem>
                    <SelectItem value="general">General Repairs</SelectItem>
                    <SelectItem value="cleaning">Cleaning</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select 
                  value={newRequest.priority} 
                  onValueChange={(value) => setNewRequest(prev => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low - Can wait a few days</SelectItem>
                    <SelectItem value="medium">Medium - Should be fixed soon</SelectItem>
                    <SelectItem value="high">High - Urgent repair needed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Please provide detailed information about the issue, including when it started and any relevant details..."
                  value={newRequest.description}
                  onChange={(e) => setNewRequest(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                />
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Camera className="h-4 w-4" />
                <span>Tip: Take photos to help us understand the issue better</span>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={handleSubmitRequest}
                  className="flex-1 bg-ocean-blue hover:bg-ocean-blue-dark"
                >
                  Submit Request
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-earth-warm" />
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-xl font-bold">2</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-ocean-blue" />
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-xl font-bold">1</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success-green" />
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-xl font-bold">8</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-sm text-muted-foreground">High Priority</p>
                <p className="text-xl font-bold">0</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {responses && responses.length > 0 && (
        <Card className="cursor-pointer" onClick={() => navigate("/tenant-dashboard/maintenance/responses")} >
          <CardContent className="p-4">
            <p>You have {responses.length} responses</p>
          </CardContent>
        </Card>
      )}

      {/* Maintenance Requests List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Your Requests</h2>
        {recentMaintenance.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No maintenance requests yet</h3>
              <p className="text-muted-foreground mb-4">
                When you submit maintenance requests, they'll appear here.
              </p>
              <Button 
                onClick={() => setIsCreateDialogOpen(true)}
                className="bg-ocean-blue hover:bg-ocean-blue-dark"
              >
                <Plus className="h-4 w-4 mr-2" />
                Submit Your First Request
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {recentMaintenance.map((request) => (
              <Card key={request.id} className="hover:shadow-medium transition-all duration-200 cursor-pointer" onClick={()=>navigate(`/tenant-dashboard/maintenance/${request.id}`)}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{request.title}</CardTitle>
                      <CardDescription>
                        Submitted on {new Date(request.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={priorityColors[request.priority]}>
                        {request.priority}
                      </Badge>
                      <Badge className={statusColors[request.status]}>
                        {request.status.replace('_', ' ')}
                      </Badge>
                      {unreadCounts?.[request.id] > 0 && (<Badge variant="destructive">{unreadCounts[request.id]}</Badge>)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Wrench className="h-4 w-4" />
                      <span>Request #{request.id.slice(0, 8)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
