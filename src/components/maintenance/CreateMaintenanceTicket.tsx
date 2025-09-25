import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMaintenanceTickets } from '@/hooks/useMaintenanceTickets';
import { toast } from 'sonner';
import { Upload, Camera } from 'lucide-react';

interface CreateMaintenanceTicketProps {
  propertyId: string;
  onTicketCreated?: () => void;
}

export function CreateMaintenanceTicket({ propertyId, onTicketCreated }: CreateMaintenanceTicketProps) {
  const { createTicket } = useMaintenanceTickets(propertyId);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as const,
    category: 'other' as const,
    images: [] as string[]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      
      // Map UI values to DB-allowed enums
      const mapCategory = (c: string) => {
        if (c === 'appliances') return 'appliance';
        if (c === 'pest') return 'pest_control';
        if (c === 'general') return 'other';
        return c;
      };
      const mapPriority = (p: string) => (p === 'emergency' ? 'urgent' : p);

      await createTicket({
        property_id: propertyId,
        title: formData.title,
        description: formData.description,
        priority: mapPriority(formData.priority),
        category: mapCategory(formData.category),
        images: formData.images
      });

      toast.success('Maintenance request submitted successfully!');
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        category: 'other',
        images: []
      });
      
      onTicketCreated?.();
      
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

    // In a real app, you would upload these to Supabase Storage
    // For now, we'll just store file names
    const newImages = Array.from(files).map(file => file.name);
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...newImages]
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
                  <p className="text-sm font-medium mb-2">Selected Files:</p>
                  <div className="flex flex-wrap gap-2">
                    {formData.images.map((image, index) => (
                      <span 
                        key={index}
                        className="px-2 py-1 bg-primary/10 text-primary text-xs rounded"
                      >
                        {image}
                      </span>
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
    </Card>
  );
}