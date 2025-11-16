// @ts-nocheck
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMaintenanceRequests, useCreateMaintenanceRequest } from '@/hooks/maintenance/useMaintenanceRequests';
import { useUnreadCounts } from '@/hooks/maintenance/useUnreadCounts';
import { useTenantResponses } from '@/hooks/maintenance/useTenantResponses';
import { Plus, Wrench, Clock, CheckCircle, AlertTriangle, Camera, Images } from 'lucide-react';
import { MaintenanceImageGallery } from '@/components/maintenance/MaintenanceImageGallery';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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

      // Upload images if any
      const imageUrls: string[] = [];
      if (photos && photos.length > 0) {
        for (let i = 0; i < photos.length; i++) {
          const file = photos[i];
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}/${Date.now()}_${i}.${fileExt}`;
          
        const { error: uploadError } = await supabase.storage
          .from('maintenance-images')
          .upload(fileName, file);
          
        if (uploadError) {
          console.error('Error uploading image:', uploadError);
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('maintenance-images')
            .getPublicUrl(fileName);
          imageUrls.push(publicUrl);
        }
        }
      }

      await createMaintenance.mutateAsync({
        property_id: propertyId,
        title: title.trim(),
        description: description.trim(),
        priority,
        category,
        images: imageUrls,
      });

      // Reset form
      setTitle('');
      setDescription('');
      setPriority('medium');
      setCategory('other');
      setPhotos(null);
      
      // Reset file input
      const fileInput = document.getElementById('photos') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
      
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
    <div className="space-y-8">
      {/* Header with prominent action button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Maintenance Requests</h1>
          <p className="text-muted-foreground">
            Submit new requests and track the status of existing ones
          </p>
        </div>
        
        <Button 
          onClick={() => setIsCreateDialogOpen(true)}
          size="lg"
          className="bg-gradient-to-r from-ocean-blue to-ocean-blue-dark hover:from-ocean-blue-dark hover:to-ocean-blue text-white shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <Plus className="h-5 w-5 mr-2" />
          New Request
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

      {/* Color-coded Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100/60">
          <CardContent className="p-4">
            <div className="flex flex-col items-center text-center">
              <Clock className="h-8 w-8 text-orange-600 mb-2" />
              <div className="text-3xl font-bold text-orange-700 mb-1">
                {maintenanceRequests?.filter(r => r.status === 'submitted').length || 0}
              </div>
              <p className="text-sm font-medium text-orange-600">Submitted</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/60">
          <CardContent className="p-4">
            <div className="flex flex-col items-center text-center">
              <Wrench className="h-8 w-8 text-blue-600 mb-2" />
              <div className="text-3xl font-bold text-blue-700 mb-1">
                {maintenanceRequests?.filter(r => r.status === 'in_progress').length || 0}
              </div>
              <p className="text-sm font-medium text-blue-600">In Progress</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100/60">
          <CardContent className="p-4">
            <div className="flex flex-col items-center text-center">
              <CheckCircle className="h-8 w-8 text-green-600 mb-2" />
              <div className="text-3xl font-bold text-green-700 mb-1">
                {maintenanceRequests?.filter(r => r.status === 'completed').length || 0}
              </div>
              <p className="text-sm font-medium text-green-600">Completed</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-red-200 bg-gradient-to-br from-red-50 to-red-100/60">
          <CardContent className="p-4">
            <div className="flex flex-col items-center text-center">
              <AlertTriangle className="h-8 w-8 text-red-600 mb-2" />
              <div className="text-3xl font-bold text-red-700 mb-1">
                {maintenanceRequests?.filter(r => r.priority === 'high' || r.priority === 'urgent').length || 0}
              </div>
              <p className="text-sm font-medium text-red-600">High Priority</p>
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
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-foreground">Your Requests</h2>
        {isLoading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="animate-pulse">Loading your maintenance requests...</div>
            </CardContent>
          </Card>
        ) : !maintenanceRequests || maintenanceRequests.length === 0 ? (
          <Card className="border-dashed border-2 border-muted">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                <Wrench className="h-10 w-10 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-foreground">No maintenance requests yet!</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                When you need something fixed or maintained, create your first request and we'll take care of it quickly.
              </p>
              <Button 
                onClick={() => setIsCreateDialogOpen(true)}
                size="lg"
                className="bg-gradient-to-r from-ocean-blue to-ocean-blue-dark hover:from-ocean-blue-dark hover:to-ocean-blue text-white shadow-lg"
              >
                <Plus className="h-5 w-5 mr-2" />
                Start Your First Request
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {maintenanceRequests.map((request) => (
              <Card key={request.id} className="hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4 border-l-ocean-blue" onClick={()=>navigate(`/maintenance/${request.id}`)}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{request.title}</CardTitle>
                      <CardDescription className="text-base">
                        Submitted on {new Date(request.created_at).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge 
                        className={`${priorityColors[request.priority]} font-semibold px-3 py-1`}
                      >
                        {request.priority.toUpperCase()}
                      </Badge>
                      <Badge 
                        className={`${statusColors[request.status]} font-semibold px-3 py-1`}
                      >
                        {request.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">{request.description}</p>
                    
                    <div className="flex items-center justify-between pt-2 border-t border-muted">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Wrench className="h-4 w-4" />
                        <span>Request #{request.id.slice(0, 8)}</span>
                      </div>
                      <span className="text-sm font-medium text-foreground capitalize bg-muted px-2 py-1 rounded">
                        {request.category}
                      </span>
                    </div>
                    
                    {request.images && request.images.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Images className="h-4 w-4" />
                          <span>{request.images.length} image(s) attached</span>
                        </div>
                        <MaintenanceImageGallery images={request.images} ticketTitle={request.title} />
                      </div>
                    )}
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