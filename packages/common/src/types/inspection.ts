import { InventoryRecordWithDetails } from './inventory';

export interface InspectionRecordWithDetails extends InventoryRecordWithDetails {
  // Add inspection-specific properties here
  inspection_date?: string;
  inspector_name?: string;
  inspection_notes?: string;
  // Add any other inspection-specific fields that might be needed
}

// Export the type for backward compatibility
export type { InventoryRecordWithDetails };
