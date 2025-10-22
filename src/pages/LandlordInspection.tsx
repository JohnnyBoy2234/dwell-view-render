import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Camera, FileText, Eye, Download, Home, Clipboard, Mic} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useInspection, InspectionRecordWithDetails } from '@/hooks/useInspection';
import { InspectionDetailModal } from '@/components/inspection/InspectionDetailModal';
import { InventoryStartPanel } from '@/components/property/InventoryStartPanel';
import { MobileBackButton } from '@/components/mobile/MobileBackButton';
import { useProperties } from '@/hooks/useProperties';

export default function LandlordInspection() {
  // All hooks called unconditionally at the top
  const { user } = useAuth();
  const { toast } = useToast();
  const { 
    inspectionRecords = [], 
    loading: inspectionLoading, 
    error: inspectionError,
    downloadInspectionReport
  } = useInspection();
  
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<InspectionRecordWithDetails | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const { 
    properties = [], 
    loading: loadingProperties, 
    error: propertiesError 
  } = useProperties(user?.id);
  
  // Derived state
  const isLoading = inspectionLoading || loadingProperties;
  const hasError = Boolean(inspectionError || propertiesError);
  
  // Memoize filtered inspections
  const propertyInspections = useMemo(() => {
    if (!selectedPropertyId) return inspectionRecords;
    return inspectionRecords.filter(record => record.property_id === selectedPropertyId);
  }, [inspectionRecords, selectedPropertyId]);
  
  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted animate-pulse rounded"></div>
        <div className="grid gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-48 bg-muted animate-pulse rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  const handleViewInspection = (record: InspectionRecordWithDetails) => {
    setSelectedRecord(record);
    setIsDetailModalOpen(true);
  };

  const handleDownloadReport = async (recordId: string) => {
    try {
      await downloadInspectionReport(recordId);
      toast({
        title: "Report Download",
        description: "Inspection report download initiated successfully.",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download inspection report. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleStartNewInspection = (propertyId: string) => {
    setSelectedPropertyId(propertyId);
  };

  const getStatusBadge = (status: string, landlordApproved: boolean) => {
    if (status === 'completed' && landlordApproved) {
      return <Badge className="bg-success-green text-white">Approved</Badge>;
    } else if (status === 'completed') {
      return <Badge variant="secondary">Awaiting Approval</Badge>;
    } else {
      return <Badge variant="outline">In Progress</Badge>;
    }
  };

  // Error state
  if (hasError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Property Inspection</h1>
          <p className="text-muted-foreground">
            Capture photos and voice notes for inspections
          </p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            {inspectionError && (
              <p className="text-destructive mb-4">Error loading inspection records: {inspectionError}</p>
            )}
            {propertiesError && (
              <p className="text-destructive">Error loading properties: {propertiesError}</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // If a property is selected for inspection, show the inspection panel
  if (selectedPropertyId) {
    const selectedProperty = properties.find(p => p.id === selectedPropertyId);
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <MobileBackButton onBack={() => setSelectedPropertyId(null)} />
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {selectedProperty?.title} - Inspection
            </h1>
            <p className="text-muted-foreground">
              Record the condition of the property with voice notes and photos
            </p>
          </div>
        </div>
        <InventoryStartPanel propertyId={selectedPropertyId} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Property Inspection</h1>
        <p className="text-muted-foreground">
          Capture photos and voice notes for inspections. Media is shared with your tenant.
        </p>
      </div>

      {/* Properties Section */}
      {properties.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Your Properties</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {properties.map((property) => (
              <Card key={property.id} className="bg-gradient-to-r from-ocean-blue/5 to-success-green/5 border-ocean-blue/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-ocean-blue">
                    <Home className="h-5 w-5" />
                    {property.title}
                  </CardTitle>
                  <CardDescription>{property.location}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Start a new inspection for this property
                    </div>
                    <Button 
                      onClick={() => handleStartNewInspection(property.id)} 
                      className="bg-ocean-blue hover:bg-ocean-blue-dark"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Start Inspection
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Inspection Records */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">All Inspection Records</h2>
          <Badge variant="secondary">{inspectionRecords.length} records</Badge>
        </div>

        {inspectionRecords.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Clipboard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No inspection records yet</h3>
              <p className="text-muted-foreground mb-4">
                Start documenting property conditions to create your first inspection record
              </p>
              {properties && properties.length > 0 && (
                <Button onClick={() => handleStartNewInspection(properties[0].id)}>
                  <Camera className="h-4 w-4 mr-2" />
                  Create First Inspection
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {inspectionRecords.map((record) => (
              <Card key={record.id} className="hover:shadow-medium transition-all duration-200">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{record.property?.title || 'Property'}</h3>
                      <p className="text-muted-foreground">
                        Created: {new Date(record.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Country: {record.country}
                      </p>
                    </div>
                    {getStatusBadge(record.status, record.landlord_approved)}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-ocean-blue">{record.rooms_recorded}</div>
                      <div className="text-sm text-muted-foreground">Rooms</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-success-green">{record.photos_count}</div>
                      <div className="text-sm text-muted-foreground">Photos</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-earth-warm">{record.voice_notes_count}</div>
                      <div className="text-sm text-muted-foreground">Voice Notes</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-muted-foreground">
                        {record.landlord_approved ? '✓' : '⏳'}
                      </div>
                      <div className="text-sm text-muted-foreground">Status</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mic className="h-4 w-4" />
                      <span>Audio recordings & photos available</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewInspection(record)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadReport(record.id)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download Report
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Guidance Section */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Inspection Guidance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc ml-5 space-y-1 text-sm text-muted-foreground">
            <li>Capture wide shots and close-ups of issues</li>
            <li>Add short voice notes to describe context</li>
            <li>Include meters, appliances, walls, floors, and fixtures</li>
            <li>Submit promptly so your tenant can review</li>
          </ul>
        </CardContent>
      </Card>

      {/* Inspection Detail Modal */}
      <InspectionDetailModal
        record={selectedRecord}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedRecord(null);
        }}
        onDownloadReport={handleDownloadReport}
      />
    </div>
  );
}
