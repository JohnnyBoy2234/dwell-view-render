import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Clipboard, Eye, Download, Mic, Camera, Plus, ArrowLeft } from 'lucide-react';
import { useTenantDashboard } from '@/hooks/useTenantDashboard';
import { useInspection, InspectionRecordWithDetails } from '@/hooks/useInspection';
import { InspectionDetailModal } from '@/components/inspection/InspectionDetailModal';
import { InventoryStartPanel } from '@/components/property/InventoryStartPanel';
import { MobileBackButton } from '@/components/mobile/MobileBackButton';

export default function TenantInspection() {
  const { tenantProperty, loading } = useTenantDashboard();
  const { toast } = useToast();
  const { 
    inspectionRecords, 
    loading: inspectionLoading, 
    error: inspectionError,
    downloadInspectionReport
  } = useInspection();
  
  const [selectedRecord, setSelectedRecord] = useState<InspectionRecordWithDetails | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreatingInspection, setIsCreatingInspection] = useState(false);

  // Filter inspections for current property only
  const propertyInspections = useMemo(() => {
    if (!tenantProperty) return [];
    return inspectionRecords.filter(record => record.property_id === tenantProperty.id);
  }, [inspectionRecords, tenantProperty]);

  // Show inspection creation mode
  if (isCreatingInspection && tenantProperty) {
    return (
      <div className="space-y-4">
        <MobileBackButton onBack={() => setIsCreatingInspection(false)} />
        <InventoryStartPanel propertyId={tenantProperty.id} />
      </div>
    );
  }

  if (loading || inspectionLoading) {
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

  const getStatusBadge = (status: string, landlordApproved: boolean) => {
    if (status === 'completed' && landlordApproved) {
      return <Badge className="bg-success-green text-white">Approved</Badge>;
    } else if (status === 'completed') {
      return <Badge variant="secondary">Awaiting Approval</Badge>;
    } else {
      return <Badge variant="outline">In Progress</Badge>;
    }
  };

  // Show error if there's an inspection error
  if (inspectionError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Property Inspection</h1>
          <p className="text-muted-foreground">
            View inspection records shared by your landlord
          </p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive">Error loading inspection records: {inspectionError}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Property Inspection</h1>
        <p className="text-muted-foreground">
          View inspection records and media shared by your landlord
        </p>
      </div>

      {/* Current Property Section */}
      {tenantProperty && (
        <Card className="bg-gradient-to-r from-ocean-blue/5 to-success-green/5 border-ocean-blue/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-ocean-blue">
              <Clipboard className="h-5 w-5" />
              Current Property
            </CardTitle>
            <CardDescription>
              View inspection records for your current property
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div>
              <h3 className="font-semibold text-lg">{tenantProperty.title}</h3>
              <p className="text-muted-foreground">{tenantProperty.location}</p>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span>Monthly Rent: R{tenantProperty.monthlyRent.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inspection Records */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Inspection Records</h2>
          <div className="flex items-center gap-3">
            <Badge variant="secondary">{propertyInspections.length} records</Badge>
            {tenantProperty && (
              <Button
                onClick={() => setIsCreatingInspection(true)}
                className="bg-ocean-blue hover:bg-ocean-blue/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Start New Inspection
              </Button>
            )}
          </div>
        </div>

        {propertyInspections.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Clipboard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No inspection records yet</h3>
              <p className="text-muted-foreground">
                No inspection records for this property yet
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {propertyInspections.map((record) => (
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

      {/* Info Card */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-lg">How to Create an Inspection</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-3">
          <p>
            You can create inspection records to document the property condition at move-in, 
            move-out, or report any issues during your tenancy.
          </p>
          <ol className="list-decimal ml-5 space-y-2">
            <li>Click "Start New Inspection" button above</li>
            <li>Take multiple photos of each room (camera opens directly on mobile)</li>
            <li>Optionally record voice notes to describe items or issues</li>
            <li>Add text descriptions for additional clarity</li>
            <li>Click "Save" to submit the inspection to your landlord</li>
          </ol>
          <p className="text-xs">
            Your landlord will receive and review your inspection records.
          </p>
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
