import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Plus, Eye, Download } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useInspection } from '@/hooks/useInspection';
import { InspectionRecordWithDetails } from '@/types/inspection';
import { supabase } from '@/integrations/supabase/client';
import { InspectionDetailModal } from '@/components/inspection/InspectionDetailModal';
import { InventoryStartPanel } from '@/components/property/InventoryStartPanel';
import { MobileBackButton } from '@/components/mobile/MobileBackButton';
import { useProperties } from '@/hooks/useProperties';

// Move the inspectionChecklist to the top level
const inspectionChecklist = {
  ext: [
    { id: 'ext-1', label: 'Roof condition', checked: false },
    { id: 'ext-2', label: 'Gutters and downspouts', checked: false },
    { id: 'ext-3', label: 'Exterior walls', checked: false },
    { id: 'ext-4', label: 'Windows and doors', checked: false },
    { id: 'ext-5', label: 'Driveway and walkways', checked: false },
    { id: 'ext-6', label: 'Landscaping', checked: false },
  ],
  living: [
    { id: 'living-1', label: 'Walls and ceilings', checked: false },
    { id: 'living-2', label: 'Flooring condition', checked: false },
    { id: 'living-3', label: 'Windows and window coverings', checked: false },
    { id: 'living-4', label: 'Doors and locks', checked: false },
    { id: 'living-5', label: 'Light fixtures', checked: false },
  ],
  kitchen: [
    { id: 'kitchen-1', label: 'Cabinets and countertops', checked: false },
    { id: 'kitchen-2', label: 'Sink and faucet', checked: false },
    { id: 'kitchen-3', label: 'Appliances', checked: false },
    { id: 'kitchen-4', label: 'Ventilation', checked: false },
  ],
  beds: [
    { id: 'bed-1', label: 'Walls and ceilings', checked: false },
    { id: 'bed-2', label: 'Flooring', checked: false },
    { id: 'bed-3', label: 'Closet doors and hardware', checked: false },
    { id: 'bed-4', label: 'Windows and coverings', checked: false },
  ],
  elec: [
    { id: 'elec-1', label: 'Outlets and switches', checked: false },
    { id: 'elec-2', label: 'Circuit breaker panel', checked: false },
    { id: 'elec-3', label: 'Light fixtures', checked: false },
    { id: 'elec-4', label: 'Smoke detectors', checked: false },
  ],
  plum: [
    { id: 'plum-1', label: 'Water pressure', checked: false },
    { id: 'plum-2', label: 'Drains and pipes', checked: false },
    { id: 'plum-3', label: 'Toilets', checked: false },
    { id: 'plum-4', label: 'Water heater', checked: false },
  ],
};

const tabs = [
  { id: 'ext', label: 'Exterior', icon: '🏠' },
  { id: 'living', label: 'Living Area', icon: '🛋️' },
  { id: 'kitchen', label: 'Kitchen', icon: '🍳' },
  { id: 'beds', label: 'Bedrooms', icon: '🛏️' },
  { id: 'elec', label: 'Electrical', icon: '💡' },
  { id: 'plum', label: 'Plumbing', icon: '🚿' },
];

export default function LandlordInspection() {
  // Hooks
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // State
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<InspectionRecordWithDetails | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  // Data fetching
  const { properties = [], loading: loadingProperties } = useProperties(user?.id);
  const { inspectionRecords: allInspectionRecords = [], loading: inspectionLoading, fetchAllInspections } = useInspection();
  
  // Fetch inspections on mount and when needed
  useEffect(() => {
    fetchAllInspections();
  }, [fetchAllInspections]);
  
  // Filter inspection records by selected property
  const inspectionRecords = useMemo(() => 
    selectedPropertyId 
      ? allInspectionRecords.filter(record => record.property_id === selectedPropertyId)
      : allInspectionRecords,
    [allInspectionRecords, selectedPropertyId]
  );
  
  // Effects
  useEffect(() => {
    if (properties.length > 0 && !selectedPropertyId) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [properties, selectedPropertyId]);
  
  // Derived state
  const isLoading = inspectionLoading || loadingProperties;
  
  // State for tabs and checklist
  const [activeTab, setActiveTab] = useState('ext');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [checklist, setChecklist] = useState(inspectionChecklist);
  
  // Memoized checklist for the active tab
  const currentChecklist = useMemo(() => {
    return checklist[activeTab as keyof typeof inspectionChecklist] || [];
  }, [checklist, activeTab]);
  
  // Handlers
  const downloadInspectionReport = useCallback(async (inspectionId: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('inspection-reports')
        .download(`report-${inspectionId}.pdf`);
        
      if (error) throw error;
      
      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inspection-report-${inspectionId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
      toast({
        title: 'Success',
        description: 'Report downloaded successfully',
      });
    } catch (err) {
      console.error('Error downloading report:', err);
      toast({
        title: 'Error',
        description: 'Failed to download report',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const handleDownloadReport = useCallback((recordId: string) => {
    downloadInspectionReport(recordId);
  }, [downloadInspectionReport]);

  const toggleItemSelection = (inspectionId: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(inspectionId)) {
      newSelection.delete(inspectionId);
    } else {
      newSelection.add(inspectionId);
    }
    setSelectedItems(newSelection);
  };

  const toggleChecklistItem = (category: keyof typeof inspectionChecklist, itemId: string) => {
    setChecklist(prev => ({
      ...prev,
      [category]: prev[category].map(item => 
        item.id === itemId ? { ...item, checked: !item.checked } : item
      )
    }));
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Property Inspections</h1>
        <button 
          onClick={() => navigate('/inspections/new')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Inspection
        </button>
      </div>
      
      {selectedPropertyId && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-3 text-sm font-medium flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'border-b-2 border-blue-500 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="text-lg">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
          
          {/* Checklist */}
          <div className="p-6">
            <div className="space-y-4">
              {currentChecklist.map((item) => (
                <div key={item.id} className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id={item.id}
                      name={item.id}
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => toggleChecklistItem(activeTab as keyof typeof inspectionChecklist, item.id)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label 
                      htmlFor={item.id} 
                      className={`font-medium ${
                        item.checked ? 'text-gray-500 line-through' : 'text-gray-700'
                      }`}
                    >
                      {item.label}
                    </label>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Notes Section */}
            <div className="mt-8">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border border-gray-300 rounded-md p-2"
                placeholder="Add any additional notes or observations here..."
              />
            </div>
            
            {/* Photo Upload */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add Photos
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                    aria-hidden="true"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none"
                    >
                      <span>Upload photos</span>
                      <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                </div>
              </div>
            </div>
            
            {/* Save Button */}
            <div className="mt-8 flex justify-end">
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Save Inspection
              </button>
            </div>
        </div>
      </div>
    )}
    <InspectionDetailModal
      record={selectedRecord}
      isOpen={isDetailModalOpen}
      onClose={() => setIsDetailModalOpen(false)}
      onDownloadReport={handleDownloadReport}
    />
    </div>
  );
}
