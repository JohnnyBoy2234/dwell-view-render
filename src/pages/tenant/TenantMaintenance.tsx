import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMaintenanceRequests, useCreateMaintenanceRequest } from '@/hooks/maintenance/useMaintenanceRequests';
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
import type { Priority, Category } from '@/types/maintenance';

const priorityColors = {
  low: 'bg-success-green text-white',
  medium: 'bg-earth-warm text-white',
  high: 'bg-destructive text-white',
  emergency: 'bg-red-600 text-white',
};

const statusColors = {
  submitted: 'bg-blue-500 text-white',
  in_progress: 'bg-earth-warm text-white',
  completed: 'bg-success-green text-white',
  cancelled: 'bg-muted text-muted-foreground',
};

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
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [category, setCategory] = useState<Category>('other');
  const [photos, setPhotos] = useState<FileList | null>(null);

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
          .single();
          
        if (tenancyData) {
          propertyId = tenancyData.property_id;
        } else {
          // If still no property, create a generic maintenance request
          // This allows tenants to submit requests even without active tenancy
          const { data: userData } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('user_id', user.id)
            .single();
            
          if (!userData) {
            toast({
              title: "Error",
              description: "Unable to verify your account. Please contact support.",
              variant: "destructive",
            });
            return;
          }
          
          // Use a placeholder property ID or create without property_id
          propertyId = 'no-property-assigned';
        }
      }

      await createMaintenance.mutateAsync({
        property_id: propertyId,
        title: title.trim(),
        description: description.trim(),
        priority,
        category,
        images: [], // TODO: Handle photo uploads
      });

      // Reset form
      setTitle('');
      setDescription('');
      setPriority('medium');
      setCategory('other');
      setPhotos(null);
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
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="photos">Photos (Optional)</Label>
                <Input
                  id="photos"
                  type="file"
                  multiple
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => setPhotos(e.target.files)}
                />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Camera className="h-4 w-4" />
                  <span>Upload photos to help us understand the issue better</span>
                </div>
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
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-earth-warm" />
              <div>
                <p className="text-sm text-muted-foreground">Submitted</p>
                <p className="text-xl font-bold">
                  {maintenanceRequests?.filter(r => r.status === 'submitted').length || 0}
                </p>
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
                <p className="text-xl font-bold">
                  {maintenanceRequests?.filter(r => r.status === 'in_progress').length || 0}
                </p>
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
                <p className="text-xl font-bold">
                  {maintenanceRequests?.filter(r => r.status === 'completed').length || 0}
                </p>
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
                <p className="text-xl font-bold">
                  {maintenanceRequests?.filter(r => r.priority === 'high' || r.priority === 'emergency').length || 0}
                </p>
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
        {isLoading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="animate-pulse">Loading your maintenance requests...</div>
            </CardContent>
          </Card>
        ) : !maintenanceRequests || maintenanceRequests.length === 0 ? (
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
            {maintenanceRequests.map((request) => (
              <Card key={request.id} className="hover:shadow-medium transition-all duration-200 cursor-pointer" onClick={()=>navigate(`/maintenance/${request.id}`)}>
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
                        {request.priority.toUpperCase()}
                      </Badge>
                      <Badge className={statusColors[request.status]}>
                        {request.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Wrench className="h-4 w-4" />
                      <span>Request #{request.id.slice(0, 8)}</span>
                    </div>
                    <span className="text-sm text-muted-foreground capitalize">
                      {request.category}
                    </span>
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