import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useProperties } from '@/hooks/useProperties';
import { useInspection } from '@/hooks/useInspection';
import { ArrowLeft, Plus, Check } from 'lucide-react';
import { InspectionItemForm } from '@/components/inspection/InspectionItemForm';

export default function CreateInspection() {
  const [searchParams] = useSearchParams();
  const propertyId = searchParams.get('propertyId');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { properties, loading: propertiesLoading } = useProperties();
  const { createInspectionRecord, createInspectionItem } = useInspection();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inspectionItems, setInspectionItems] = useState<Array<{
    roomName: string;
    itemName: string;
    condition: string;
    description: string;
    photos: string[];
  }>>([]);
  const [showItemForm, setShowItemForm] = useState(false);

  const property = properties.find(p => p.id === propertyId);

  useEffect(() => {
    if (!propertyId && properties.length > 0) {
      navigate(`/create-inspection?propertyId=${properties[0].id}`);
    }
  }, [propertyId, properties, navigate]);

  const handleAddItem = (item: {
    roomName: string;
    itemName: string;
    condition: string;
    description: string;
    photos: string[];
  }) => {
    setInspectionItems(prev => [...prev, item]);
    setShowItemForm(false);
  };

  const handleSubmitInspection = async () => {
    if (!propertyId || inspectionItems.length === 0) {
      toast({
        title: 'Incomplete Inspection',
        description: 'Please add at least one item to the inspection.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      // First, create the inspection record
      const inspectionData = {
        property_id: propertyId,
        status: 'in_progress',
        notes: `Inspection created on ${new Date().toLocaleDateString()}`,
      };

      const { data: inspection, error } = await createInspectionRecord(inspectionData);
      
      if (error) throw error;
      if (!inspection) throw new Error('Failed to create inspection');

      // Then, add all items to the inspection
      for (const item of inspectionItems) {
        await createInspectionItem({
          inventory_record_id: inspection.id,
          room_name: item.roomName,
          item_name: item.itemName,
          condition: item.condition,
          description: item.description,
          photos: item.photos,
        });
      }

      toast({
        title: 'Success',
        description: 'Inspection created successfully!',
      });

      // Navigate back to inspections list
      navigate('/landlord/inspections');
    } catch (error: any) {
      console.error('Error creating inspection:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create inspection',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (propertiesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Inspections
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p>Property not found. Please select a valid property.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Inspections
        </Button>
        
        <Button 
          onClick={handleSubmitInspection}
          disabled={inspectionItems.length === 0 || isSubmitting}
          className="bg-primary text-white hover:bg-primary/90"
        >
          {isSubmitting ? 'Saving...' : 'Complete Inspection'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">
                New Inspection: {property.title}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Add items to document the property's condition
              </p>
            </CardHeader>
            <CardContent>
              {showItemForm ? (
                <InspectionItemForm
                  onSave={handleAddItem}
                  onCancel={() => setShowItemForm(false)}
                />
              ) : (
                <Button 
                  variant="outline" 
                  className="w-full h-32 border-dashed"
                  onClick={() => setShowItemForm(true)}
                >
                  <Plus className="h-6 w-6 mr-2 text-muted-foreground" />
                  <span className="text-muted-foreground">Add Item to Inspect</span>
                </Button>
              )}
            </CardContent>
          </Card>

          {inspectionItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Inspection Items ({inspectionItems.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {inspectionItems.map((item, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{item.itemName}</h4>
                        <p className="text-sm text-muted-foreground">{item.roomName}</p>
                        {item.description && (
                          <p className="text-sm mt-1">{item.description}</p>
                        )}
                        <div className="mt-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {item.condition.charAt(0).toUpperCase() + item.condition.slice(1)}
                          </span>
                        </div>
                      </div>
                      {item.photos.length > 0 && (
                        <div className="flex-shrink-0 ml-4">
                          <img 
                            src={item.photos[0]} 
                            alt={item.itemName} 
                            className="h-16 w-16 object-cover rounded"
                          />
                          {item.photos.length > 1 && (
                            <span className="text-xs text-muted-foreground">
                              +{item.photos.length - 1} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Inspection Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  <Check className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <h4 className="font-medium">Take Clear Photos</h4>
                  <p className="text-sm text-muted-foreground">
                    Capture both wide shots and close-ups of any issues.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  <Check className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <h4 className="font-medium">Be Thorough</h4>
                  <p className="text-sm text-muted-foreground">
                    Document all rooms and major items in the property.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  <Check className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <h4 className="font-medium">Note the Condition</h4>
                  <p className="text-sm text-muted-foreground">
                    Accurately rate each item's condition for reference.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
