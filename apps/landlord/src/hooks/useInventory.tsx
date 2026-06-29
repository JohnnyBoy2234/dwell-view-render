// @ts-nocheck
import { useEffect, useState } from 'react';
import { supabase } from '@mzanzihomes/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// Types for inventory system (disabled until tables are created)
export interface InventoryRecord {
  id: string;
  property_id: string;
  tenant_id: string;
  landlord_id: string;
  country: string;
  rooms_recorded: number;
  total_items: number;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: string;
  inventory_record_id: string;
  room_name: string;
  item_name: string;
  condition: "excellent" | "good" | "fair" | "poor" | "damaged";
  description?: string;
  photos: string[];
  voice_note_url?: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryRecordWithDetails extends InventoryRecord {
  inventory_count: number;
  property?: any;
  items?: InventoryItem[];
  reports?: any[];
  status: "completed" | "in_progress" | "approved" | "rejected";
  photos_count: number;
  voice_notes_count: number;
  landlord_approved: boolean;
}

export interface CreateInventoryRecordData {
  property_id: string;
  tenant_id: string;
  landlord_id: string;
  country: string;
  rooms_recorded: number;
  total_items: number;
}

export interface UpdateInventoryRecordData {
  rooms_recorded?: number;
  total_items?: number;
}

export interface CreateInventoryItemData {
  inventory_record_id: string;
  room_name: string;
  item_name: string;
  condition: string;
  description?: string;
  photos?: string[];
}

// Disabled inventory hook until database tables are created
export function useInventory() {
  const { user } = useAuth();
  const [inventoryRecords, setInventoryRecords] = useState<InventoryRecordWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const db = supabase as any;

  const fetchInventoryRecords = async () => {
    if (!user) {
      setInventoryRecords([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // RLS restricts to allowed rows; additionally filter by current user
      const { data: records, error: selectError } = await db
        .from('inventory_records')
        .select(`
          *,
          inventory_items (*)
        `)
        .eq('tenant_id', user.id)
        .order('created_at', { ascending: false });
      if (selectError) throw selectError;
      
      console.log('Fetched inventory records with items:', records);
      setInventoryRecords((records || []) as InventoryRecordWithDetails[]);
    } catch (e: any) {
      console.error('Error fetching inventory records:', e);
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const createInventoryRecord = async (data: CreateInventoryRecordData): Promise<InventoryRecord | null> => {
    const { data: created, error: err } = await db
      .from('inventory_records')
      .insert({
        property_id: data.property_id,
        tenant_id: data.tenant_id,
        landlord_id: data.landlord_id,
        country: data.country,
        status: 'in_progress',
      })
      .select('*')
      .single();
    if (err) throw err;
    await fetchInventoryRecords();
    return created as InventoryRecord;
  };

  const updateInventoryRecord = async (id: string, data: UpdateInventoryRecordData): Promise<InventoryRecord | null> => {
    const { data: updated, error: err } = await db
      .from('inventory_records')
      .update(data)
      .eq('id', id)
      .select('*')
      .single();
    if (err) throw err;
    await fetchInventoryRecords();
    return updated as InventoryRecord;
  };

  const createInventoryItem = async (data: CreateInventoryItemData): Promise<InventoryItem | null> => {
    const { data: created, error: err } = await db
      .from('inventory_items')
      .insert({
        inventory_record_id: data.inventory_record_id,
        room_name: data.room_name,
        item_name: data.item_name,
        condition: data.condition,
        description: data.description,
        photos: data.photos || [],
      })
      .select('*')
      .single();
    if (err) throw err;
    await fetchInventoryRecords();
    return created as InventoryItem;
  };

  const generateInventoryReport = async (_inventoryRecordId: string, _reportType: 'move_in' | 'move_out' | 'periodic' = 'move_in'): Promise<string | null> => {
    // Placeholder for future function
    return null;
  };

  const downloadInventoryReport = async (_inventoryRecordId: string): Promise<void> => {
    // Placeholder for future download/report generation
  };

  const viewInventoryRecord = async (_inventoryRecordId: string): Promise<void> => {
    // Placeholder for navigation
  };

  useEffect(() => {
    fetchInventoryRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return {
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
  };
}