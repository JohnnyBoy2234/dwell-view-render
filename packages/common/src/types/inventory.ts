export interface InventoryRecord {
  id: string;
  property_id: string;
  tenant_id: string;
  landlord_id: string;
  country: string;
  status: 'in_progress' | 'completed' | 'approved' | 'rejected';
  rooms_recorded: number;
  photos_count: number;
  voice_notes_count: number;
  landlord_approved: boolean;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  approved_at?: string;
}

export interface InventoryItem {
  id: string;
  inventory_record_id: string;
  room_name: string;
  item_name: string;
  condition: 'excellent' | 'good' | 'fair' | 'poor' | 'damaged';
  description?: string;
  photos: string[];
  voice_note_url?: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryRecordWithDetails extends InventoryRecord {
  property?: {
    id: string;
    title: string;
    location: string;
  };
  items?: InventoryItem[];
}

export interface CreateInventoryRecordData {
  property_id: string;
  tenant_id: string;
  landlord_id: string;
  country: string;
}

export interface UpdateInventoryRecordData {
  status?: InventoryRecord['status'];
  rooms_recorded?: number;
  photos_count?: number;
  voice_notes_count?: number;
  landlord_approved?: boolean;
  completed_at?: string;
  approved_at?: string;
}

export interface CreateInventoryItemData {
  inventory_record_id: string;
  room_name: string;
  item_name: string;
  condition: InventoryItem['condition'];
  description?: string;
  photos?: string[];
  voice_note_url?: string;
}
