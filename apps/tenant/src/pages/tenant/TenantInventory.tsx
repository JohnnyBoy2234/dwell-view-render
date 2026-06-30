import { useState } from 'react';
import { InventoryStartPanel } from '@mzanzihomes/features/property';
import { InventoryDetailModal } from '@mzanzihomes/ui/components/inventory/InventoryDetailModal';
import { useTenantDashboard } from '@/hooks/useTenantDashboard';
import { useInventory } from '@/hooks/useInventory';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import { Button } from '@mzanzihomes/ui/components/button';
import { Badge } from '@mzanzihomes/ui/components/badge';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';
import { Home, FileText, Camera, Mic, Download, Eye } from 'lucide-react';
import { InventoryRecordWithDetails } from '@mzanzihomes/common/types/inventory';

export default function TenantInventory() {
  const { tenantProperty, loading } = useTenantDashboard();
  const { user } = useAuth();
  const { toast } = useToast();
  const { 
    inventoryRecords, 
    loading: inventoryLoading, 
    error: inventoryError,
    downloadInventoryReport,
    viewInventoryRecord
  } = useInventory();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<InventoryRecordWithDetails | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  if (loading || inventoryLoading) {
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

  const handleViewInventory = (record: InventoryRecordWithDetails) => {
    setSelectedRecord(record);
    setIsDetailModalOpen(true);
  };

  const handleDownloadReport = async (recordId: string) => {
    try {
      await downloadInventoryReport(recordId);
      toast({
        title: "Report Download",
        description: "Inventory report download initiated successfully.",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download inventory report. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleStartNewInventory = () => {
    if (tenantProperty) {
      setSelectedPropertyId(tenantProperty.id);
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

  // Show error if there's an inventory error
  if (inventoryError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Property Inventory</h1>
          <p className="text-muted-foreground">
            Record and manage property condition documentation for your tenancies
          </p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive">Error loading inventory records: {inventoryError}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If a property is selected for inventory, show the inventory panel
  if (selectedPropertyId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Property Inventory</h1>
            <p className="text-muted-foreground">
              Record the condition of your property with voice notes and photos
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setSelectedPropertyId(null)}
          >
            Back to Overview
          </Button>
        </div>
        <InventoryStartPanel propertyId={selectedPropertyId} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Property Inventory</h1>
        <p className="text-muted-foreground">
          Record and manage property condition documentation for your tenancies
        </p>
      </div>

      {/* Current Property Section */}
      {tenantProperty && (
        <Card className="bg-ocean-blue/5 border-ocean-blue/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-ocean-blue">
              <Home className="h-5 w-5" />
              Current Property
            </CardTitle>
            <CardDescription>
              Document your current property's condition
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-lg">{tenantProperty.title}</h3>
                <p className="text-muted-foreground">{tenantProperty.location}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span>Move-in: Available</span>
                  <span>Monthly Rent: R{tenantProperty.monthlyRent.toLocaleString()}</span>
                </div>
              </div>
              <Button onClick={handleStartNewInventory} className="bg-ocean-blue hover:bg-ocean-blue-dark">
                <Camera className="h-4 w-4 mr-2" />
                Start Inventory
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inventory Records */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Inventory Records</h2>
          <Badge variant="secondary">{inventoryRecords.length} records</Badge>
        </div>

        {inventoryRecords.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No inventory records yet</h3>
              <p className="text-muted-foreground mb-4">
                Start documenting your property's condition to create your first inventory record
              </p>
              <Button onClick={handleStartNewInventory}>
                <Camera className="h-4 w-4 mr-2" />
                Create First Inventory
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {inventoryRecords.map((record) => (
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
                        onClick={() => handleViewInventory(record)}
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

      {/* How It Works Section */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-lg">How Property Inventory Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">For Move-In:</h4>
              <ul className="list-disc ml-5 space-y-1 text-sm text-muted-foreground">
                <li>Document existing conditions and any damage</li>
                <li>Record voice notes for each room</li>
                <li>Take photos of key items and potential issues</li>
                <li>Submit for landlord approval</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">For Move-Out:</h4>
              <ul className="list-disc ml-5 space-y-1 text-sm text-muted-foreground">
                <li>Compare with original move-in inventory</li>
                <li>Document any new damage or changes</li>
                <li>Helps protect your security deposit</li>
                <li>Provides evidence for dispute resolution</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Detail Modal */}
      <InventoryDetailModal
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