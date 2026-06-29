import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMaintenanceTickets } from '@/hooks/useMaintenanceTickets';
import { toast } from 'sonner';
import { Upload, Camera, X } from 'lucide-react';
import type { Priority, Category } from '@mzanzihomes/common/types/maintenance';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { SuccessDialog } from '@/components/ui/SuccessDialog';

interface CreateMaintenanceTicketProps {
  propertyId: string;
  onTicketCreated?: () => void;
}

export function CreateMaintenanceTicket({ propertyId, onTicketCreated }: CreateMaintenanceTicketProps) {
  const { createTicket } = useMaintenanceTickets(propertyId);
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as const,
    category: 'other' as const,
    images: [] as File[]
  });

  const uploadImages = async (files: File[]): Promise<string[]> => {
    if (!user || !files.length) return [];

    const imageUrls: string[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}_${i}.${fileExt}`;
      
      try {
        const { error: uploadError } = await supabase.storage
          .from('maintenance-images')
          .upload(fileName, file);
          
        if (uploadError) {
          console.error('Error uploading image:', uploadError);
          toast.error(`Failed to upload image: ${file.name}`);
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('maintenance-images')
            .getPublicUrl(fileName);
          imageUrls.push(publicUrl);
        }
      } catch (error) {
        console.error('Error uploading image:', error);
        toast.error(`Failed to upload image: ${file.name}`);
      }
    }
    
    return imageUrls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('You must be logged in to create a maintenance request');
      return;
    }
    
    if (!formData.title || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      
      // Upload images first
      const imageUrls = await uploadImages(formData.images);
      
      // Map UI values to DB-allowed enums
      const mapCategory = (c: string): Category => {
        if (c === 'appliances') return 'appliance';
        if (c === 'pest') return 'pest_control';
        if (c === 'general') return 'other';
        return c as Category;
      };
      const mapPriority = (p: string): Priority => (p === 'emergency' ? 'urgent' : p as Priority);

      await createTicket({
        property_id: propertyId,
        title: formData.title,
        description: formData.description,
        priority: mapPriority(formData.priority),
        category: mapCategory(formData.category),
        images: imageUrls
      });

      // Reset form
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        category: 'other',
        images: []
      });
      
      setShowSuccessDialog(true);
      
    } catch (error) {
      console.error('Error creating maintenance ticket:', error);
      toast.error('Failed to submit maintenance request');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages = Array.from(files);
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...newImages]
    }));
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>🔧</span>
          Report Maintenance Issue
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Describe the issue you're experiencing and we'll get it resolved quickly.
        </p>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="title">Issue Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                title: e.target.value 
              }))}
              placeholder="e.g., Kitchen tap is leaking"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Detailed Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                description: e.target.value 
              }))}
              placeholder="Please describe the issue in detail, including when it started, how severe it is, and any relevant context..."
              rows={4}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  category: value as any 
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="plumbing">🚰 Plumbing</SelectItem>
                  <SelectItem value="electrical">⚡ Electrical</SelectItem>
                  <SelectItem value="heating">🔥 Heating</SelectItem>
                  <SelectItem value="appliance">🏠 Appliance</SelectItem>
                  <SelectItem value="structural">🏗️ Structural</SelectItem>
                  <SelectItem value="pest_control">🐛 Pest Control</SelectItem>
                  <SelectItem value="cleaning">🧹 Cleaning</SelectItem>
                  <SelectItem value="other">❓ Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="priority">Priority Level</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  priority: value as any 
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">🟢 Low - Can wait</SelectItem>
                  <SelectItem value="medium">🟡 Medium - Normal</SelectItem>
                  <SelectItem value="high">🟠 High - Soon</SelectItem>
                  <SelectItem value="urgent">🔴 Urgent - Immediate</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Photos (Optional)</Label>
            <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-4">
                  <Camera className="h-8 w-8 text-muted-foreground" />
                  <Upload className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Upload photos to help us understand the issue better
                </p>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => document.getElementById('image-upload')?.click()}
                >
                  Choose Files
                </Button>
              </div>
              
              {formData.images.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Selected Images:</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {formData.images.map((file, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-24 object-cover rounded-md border"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1 rounded">
                          {file.name.length > 15 ? file.name.substring(0, 15) + '...' : file.name}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h4 className="font-medium text-blue-900 mb-2">What happens next?</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Your request will be automatically categorized and prioritized</li>
              <li>• We'll assign a qualified contractor based on the issue type</li>
              <li>• You'll receive updates via the app and notifications</li>
              <li>• Emergency issues (high priority) are handled within 8 hours</li>
            </ul>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => window.history.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </CardContent>

      {/* Success Dialog */}
      <SuccessDialog
        open={showSuccessDialog}
        onClose={() => {
          setShowSuccessDialog(false);
          onTicketCreated?.();
        }}
        icon="wrench"
        title="Maintenance Request Submitted!"
        subtitle="Your request has been logged and sent to your landlord."
        nextSteps={[
          { title: "Landlord notified", description: "Your landlord has received your maintenance request" },
          { title: "Service provider assignment", description: "A contractor will be assigned to resolve the issue" },
          { title: "Track progress", description: "Monitor updates in your maintenance dashboard" }
        ]}
        primaryAction={{
          label: "View My Requests",
          onClick: () => {
            setShowSuccessDialog(false);
            onTicketCreated?.();
          }
        }}
        showConfetti={false}
      />
    </Card>
  );
}