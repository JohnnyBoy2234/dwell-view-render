import { useInventory, InventoryRecordWithDetails } from '@/hooks/useInventory';

export type InspectionRecordWithDetails = InventoryRecordWithDetails;

/**
 * Hook for managing property inspections
 * Reuses inventory infrastructure but provides inspection-specific interface
 */
interface UseInspectionReturn {
  inspectionRecords: any[];
  loading: boolean;
  error: Error | null;
  fetchInspectionRecords: () => Promise<void>;
  createInspectionRecord: (data: any) => Promise<any>;
  updateInspectionRecord: (id: string, data: any) => Promise<any>;
  createInspectionItem: (data: any) => Promise<any>;
  generateInspectionReport: (id: string) => Promise<string>;
  downloadInspectionReport: (id: string, fileName: string) => Promise<void>;
  viewInspectionRecord: (id: string) => Promise<void>;
}

export function useInspection(): UseInspectionReturn {
  const {
    inventoryRecords,
    loading,
    error,
    fetchInventoryRecords,
    createInventoryRecord,
    updateInventoryRecord,
    createInventoryItem,
    generateInventoryReport,
    downloadInventoryReport,
    viewInventoryRecord,
  } = useInventory();

  // Inspections are just inventory records viewed from a different perspective
  // Both landlords and tenants can create/view them
  const inspectionRecords = inventoryRecords;

  return {
    inspectionRecords,
    loading,
    error,
    fetchInspectionRecords: fetchInventoryRecords,
    createInspectionRecord: createInventoryRecord,
    updateInspectionRecord: updateInventoryRecord,
    createInspectionItem: createInventoryItem,
    generateInspectionReport: generateInventoryReport,
    downloadInspectionReport: downloadInventoryReport,
    viewInspectionRecord: viewInventoryRecord,
  };
}

// Re-export the types
export type { InventoryRecordWithDetails };
export type { InventoryRecordWithDetails as InspectionRecordWithDetails };
