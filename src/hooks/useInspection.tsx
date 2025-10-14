import { useInventory, InventoryRecordWithDetails } from '@/hooks/useInventory';

/**
 * Hook for managing property inspections
 * Reuses inventory infrastructure but provides inspection-specific interface
 */
export function useInspection() {
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

export type { InventoryRecordWithDetails as InspectionRecordWithDetails };
