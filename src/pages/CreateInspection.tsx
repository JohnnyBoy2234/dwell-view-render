import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useProperties } from '@/hooks/useProperties';
import { useInspection } from '@/hooks/useInspection';
import { ArrowLeft, Plus, Check, FileText, X, Save } from 'lucide-react';
import { InspectionItemForm } from '@/components/inspection/InspectionItemForm';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

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
  const [notes, setNotes] = useState<string>('');
  const [showItemForm, setShowItemForm] = useState(false);
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false);
  const notesTextareaRef = useRef<HTMLTextAreaElement>(null);

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
    <div className="space-y-4 p-2 sm:p-4 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sticky top-0 bg-white/90 backdrop-blur-sm z-10 py-2 sm:py-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="w-full sm:w-auto justify-start"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Inspections
        </Button>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <Dialog open={isNotesDialogOpen} onOpenChange={setIsNotesDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                className="flex-1 sm:flex-none gap-2"
                onClick={() => setIsNotesDialogOpen(true)}
              >
                <FileText className="h-4 w-4" />
                <span className="sm:hidden">Notes</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Inspection Notes</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Textarea
                  ref={notesTextareaRef}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any general notes about the inspection..."
                  className="min-h-[200px]"
                />
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsNotesDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => {
                      setIsNotesDialogOpen(false);
                      toast({
                        title: 'Notes saved',
                        description: 'Your inspection notes have been saved.',
                      });
                    }}
                  >
                    Save Notes
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button 
            onClick={handleSubmitInspection}
            disabled={inspectionItems.length === 0 || isSubmitting}
            className="flex-1 sm:flex-none bg-primary text-white hover:bg-primary/90"
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </span>
            ) : (
              <span className="flex items-center">
                <Save className="h-4 w-4 mr-2" />
                <span className="whitespace-nowrap">Complete Inspection</span>
              </span>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          <Card className="overflow-hidden">
            <CardHeader className="bg-muted/20">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-lg sm:text-xl font-semibold">
                    {property.title}
                  </CardTitle>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Add items to document the property's condition
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowItemForm(true)}
                    className="w-full sm:w-auto"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {showItemForm && (
                <div className="border-b">
                  <InspectionItemForm
                    onSave={(item) => {
                      handleAddItem(item);
                      setShowItemForm(false);
                    }}
                    onCancel={() => setShowItemForm(false)}
                  />
                </div>
              )}
              
              {inspectionItems.length === 0 ? (
                <div className="p-6 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
                    <FileText className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium">No inspection items yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Get started by adding your first inspection item.
                  </p>
                  <Button 
                    onClick={() => setShowItemForm(true)}
                    className="mt-2"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>
              ) : (
                <div className="divide-y">
                  {inspectionItems.map((item, index) => (
                    <div key={index} className="p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start gap-3">
                        {item.photos.length > 0 ? (
                          <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border">
                            <img 
                              src={item.photos[0]} 
                              alt={item.itemName}
                              className="h-full w-full object-cover"
                            />
                            {item.photos.length > 1 && (
                              <div className="absolute bottom-1 right-1 bg-black/60 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                +{item.photos.length - 1}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="h-16 w-16 flex-shrink-0 rounded-md border flex items-center justify-center bg-muted/30">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium truncate">{item.roomName} - {item.itemName}</h4>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              item.condition === 'excellent' ? 'bg-green-100 text-green-800' :
                              item.condition === 'good' ? 'bg-blue-100 text-blue-800' :
                              item.condition === 'fair' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {item.condition.charAt(0).toUpperCase() + item.condition.slice(1).replace('_', ' ')}
                            </span>
                          </div>
                          {item.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </div>

        <div className="space-y-4">
          <Card className="sticky top-20">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Inspection Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground">Items</span>
                  <span className="text-sm font-medium">{inspectionItems.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground">Photos</span>
                  <span className="text-sm font-medium">
                    {inspectionItems.reduce((acc, item) => acc + item.photos.length, 0)}
                  </span>
                </div>
                <div className="pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => setIsNotesDialogOpen(true)}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    {notes ? 'Edit Notes' : 'Add Notes'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Inspection Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  <Check className="h-4 w-4 text-green-500" />
                </div>
                <div>
                  <h4 className="text-sm font-medium">Take Clear Photos</h4>
                  <p className="text-xs text-muted-foreground">
                    Capture both wide shots and close-ups of any issues.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  <Check className="h-4 w-4 text-green-500" />
                </div>
                <div>
                  <h4 className="text-sm font-medium">Be Thorough</h4>
                  <p className="text-xs text-muted-foreground">
                    Document all rooms and major items in the property.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  <Check className="h-4 w-4 text-green-500" />
                </div>
                <div>
                  <h4 className="text-sm font-medium">Note the Condition</h4>
                  <p className="text-xs text-muted-foreground">
                    Accurately rate each item's condition for reference.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {inspectionItems.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Export PDF
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
