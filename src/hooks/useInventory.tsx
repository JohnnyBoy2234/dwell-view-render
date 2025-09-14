import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { 
  InventoryRecord, 
  InventoryRecordWithDetails, 
  CreateInventoryRecordData, 
  UpdateInventoryRecordData,
  InventoryItem,
  CreateInventoryItemData
} from '@/types/inventory';

export function useInventory() {
  const { user } = useAuth();
  const [inventoryRecords, setInventoryRecords] = useState<InventoryRecordWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInventoryRecords = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('inventory_records')
        .select(`
          *,
          property:properties(id, title, location),
          items:inventory_items(*),
          reports:inventory_reports(*)
        `)
        .or(`tenant_id.eq.${user.id},landlord_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setInventoryRecords(data || []);
    } catch (err) {
      console.error('Error fetching inventory records:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch inventory records');
    } finally {
      setLoading(false);
    }
  };

  const createInventoryRecord = async (data: CreateInventoryRecordData): Promise<InventoryRecord | null> => {
    try {
      const { data: record, error } = await supabase
        .from('inventory_records')
        .insert([data])
        .select()
        .single();

      if (error) throw error;

      await fetchInventoryRecords();
      return record;
    } catch (err) {
      console.error('Error creating inventory record:', err);
      setError(err instanceof Error ? err.message : 'Failed to create inventory record');
      return null;
    }
  };

  const updateInventoryRecord = async (id: string, data: UpdateInventoryRecordData): Promise<InventoryRecord | null> => {
    try {
      const { data: record, error } = await supabase
        .from('inventory_records')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await fetchInventoryRecords();
      return record;
    } catch (err) {
      console.error('Error updating inventory record:', err);
      setError(err instanceof Error ? err.message : 'Failed to update inventory record');
      return null;
    }
  };

  const createInventoryItem = async (data: CreateInventoryItemData): Promise<InventoryItem | null> => {
    try {
      const { data: item, error } = await supabase
        .from('inventory_items')
        .insert([data])
        .select()
        .single();

      if (error) throw error;

      await fetchInventoryRecords();
      return item;
    } catch (err) {
      console.error('Error creating inventory item:', err);
      setError(err instanceof Error ? err.message : 'Failed to create inventory item');
      return null;
    }
  };

  const generateInventoryReport = async (inventoryRecordId: string, reportType: 'move_in' | 'move_out' | 'periodic' = 'move_in'): Promise<string | null> => {
    try {
      // This would typically call a server function to generate the PDF
      // For now, we'll simulate the process
      const { data: report, error } = await supabase
        .from('inventory_reports')
        .insert([{
          inventory_record_id: inventoryRecordId,
          report_type: reportType,
          pdf_url: `https://example.com/reports/inventory-${inventoryRecordId}-${Date.now()}.pdf`
        }])
        .select()
        .single();

      if (error) throw error;

      await fetchInventoryRecords();
      return report.pdf_url;
    } catch (err) {
      console.error('Error generating inventory report:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate inventory report');
      return null;
    }
  };

  const downloadInventoryReport = async (inventoryRecordId: string): Promise<void> => {
    try {
      const { data: report, error } = await supabase
        .from('inventory_reports')
        .select('pdf_url')
        .eq('inventory_record_id', inventoryRecordId)
        .order('generated_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"

      if (report?.pdf_url) {
        // Open the PDF in a new tab
        window.open(report.pdf_url, '_blank');
      } else {
        // Generate a new report if none exists
        const pdfUrl = await generateInventoryReport(inventoryRecordId);
        if (pdfUrl) {
          window.open(pdfUrl, '_blank');
        }
      }
    } catch (err) {
      console.error('Error downloading inventory report:', err);
      setError(err instanceof Error ? err.message : 'Failed to download inventory report');
    }
  };

  const viewInventoryRecord = async (inventoryRecordId: string): Promise<void> => {
    try {
      // This would typically open a detailed view of the inventory record
      // For now, we'll just log it and could redirect to a detailed page
      console.log('Viewing inventory record:', inventoryRecordId);
      
      // In a real implementation, you might:
      // 1. Navigate to a detailed inventory view page
      // 2. Open a modal with inventory details
      // 3. Show a preview of the inventory data
      
      // For now, let's simulate opening a detailed view
      const record = inventoryRecords.find(r => r.id === inventoryRecordId);
      if (record) {
        // You could implement a modal or navigation here
        console.log('Inventory record details:', record);
      }
    } catch (err) {
      console.error('Error viewing inventory record:', err);
      setError(err instanceof Error ? err.message : 'Failed to view inventory record');
    }
  };

  useEffect(() => {
    fetchInventoryRecords();
  }, [user]);

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
