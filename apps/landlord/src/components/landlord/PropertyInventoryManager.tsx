import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@mzanzihomes/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import { Button } from '@mzanzihomes/ui/components/button';
import { Badge } from '@mzanzihomes/ui/components/badge';
import { Input } from '@mzanzihomes/ui/components/input';
import { Label } from '@mzanzihomes/ui/components/label';
import { Textarea } from '@mzanzihomes/ui/components/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@mzanzihomes/ui/components/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@mzanzihomes/ui/components/select';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';
import { Package, Pencil, Plus, Trash2 } from 'lucide-react';

interface InventoryItem {
  id: string;
  property_id: string;
  room: string;
  name: string;
  quantity: number;
  description: string | null;
  serial_number: string | null;
  brand_model: string | null;
  note: string | null;
  updated_at: string;
}

interface ItemForm {
  room: string;
  name: string;
  quantity: string;
  description: string;
  serial_number: string;
  brand_model: string;
  note: string;
}

const EMPTY_FORM: ItemForm = {
  room: '', name: '', quantity: '1', description: '', serial_number: '', brand_model: '', note: ''
};

const ROOM_SUGGESTIONS = [
  'Living room', 'Dining room', 'Kitchen', 'Main bedroom', 'Bedroom 2', 'Bathroom',
  'Study', 'Patio', 'Garden', 'Garage', 'Storage', 'Appliances', 'Keys and access devices', 'General'
];

/** The landlord's official property inventory: the list of furniture, keys and
 * equipment belonging to the property. Tenants see this read-only; condition
 * documentation happens in condition records, not here. */
export function PropertyInventoryManager({
  properties,
  initialPropertyId
}: {
  properties: Array<{ id: string; title: string }>;
  initialPropertyId?: string | null;
}) {
  const { toast } = useToast();
  const [propertyId, setPropertyId] = useState<string>(initialPropertyId || properties[0]?.id || '');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ItemForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialPropertyId) setPropertyId(initialPropertyId);
  }, [initialPropertyId]);

  // The property list loads async — adopt the first property once it arrives
  useEffect(() => {
    if (!propertyId && properties.length > 0) setPropertyId(properties[0].id);
  }, [properties, propertyId]);

  useEffect(() => {
    if (!propertyId) return;
    setLoading(true);
    (supabase.from('property_inventory_items') as any)
      .select('*')
      .eq('property_id', propertyId)
      .order('room')
      .order('name')
      .then(({ data, error }: any) => {
        if (error) {
          console.error('Error loading inventory:', error);
          toast({ variant: 'destructive', title: 'Could not load the inventory', description: error.message });
        } else {
          setItems((data ?? []) as InventoryItem[]);
        }
        setLoading(false);
      });
  }, [propertyId]);

  const rooms = useMemo(() => {
    const grouped = new Map<string, InventoryItem[]>();
    for (const item of items) {
      const list = grouped.get(item.room) ?? [];
      list.push(item);
      grouped.set(item.room, list);
    }
    return [...grouped.entries()];
  }, [items]);

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (item: InventoryItem) => {
    setEditingId(item.id);
    setForm({
      room: item.room,
      name: item.name,
      quantity: String(item.quantity),
      description: item.description ?? '',
      serial_number: item.serial_number ?? '',
      brand_model: item.brand_model ?? '',
      note: item.note ?? ''
    });
    setDialogOpen(true);
  };

  const saveItem = async () => {
    if (!form.room.trim() || !form.name.trim()) {
      toast({ variant: 'destructive', title: 'Room and item name are required' });
      return;
    }
    setSaving(true);
    const payload = {
      property_id: propertyId,
      room: form.room.trim(),
      name: form.name.trim(),
      quantity: Math.max(1, parseInt(form.quantity, 10) || 1),
      description: form.description.trim() || null,
      serial_number: form.serial_number.trim() || null,
      brand_model: form.brand_model.trim() || null,
      note: form.note.trim() || null
    };
    const table = supabase.from('property_inventory_items') as any;
    const { data, error } = editingId
      ? await table.update(payload).eq('id', editingId).select('*').single()
      : await table.insert(payload).select('*').single();
    setSaving(false);
    if (error) {
      toast({ variant: 'destructive', title: 'Could not save the item', description: error.message });
      return;
    }
    setItems((prev) =>
      editingId ? prev.map((i) => (i.id === editingId ? (data as InventoryItem) : i)) : [...prev, data as InventoryItem]
    );
    setDialogOpen(false);
    toast({ title: editingId ? 'Item updated' : 'Item added' });
  };

  const deleteItem = async (item: InventoryItem) => {
    if (!window.confirm(`Remove "${item.name}" from the inventory?`)) return;
    const { error } = await (supabase.from('property_inventory_items') as any).delete().eq('id', item.id);
    if (error) {
      toast({ variant: 'destructive', title: 'Could not remove the item', description: error.message });
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    toast({ title: 'Item removed' });
  };

  const totalItems = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const lastUpdated = items.length
    ? items.reduce((latest, item) => (item.updated_at > latest ? item.updated_at : latest), items[0].updated_at)
    : null;

  const setField = (key: keyof ItemForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <Card className="shadow-md bg-white/90 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Property Inventory</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              The official list of furniture and items belonging to the property. Tenants can view
              this list but not change it.
            </p>
          </div>
          <Button size="sm" onClick={openAdd} disabled={!propertyId}>
            <Plus className="h-4 w-4 mr-1" /> Add item
          </Button>
        </div>
        {properties.length > 1 && (
          <Select value={propertyId} onValueChange={setPropertyId}>
            <SelectTrigger className="mt-2 max-w-sm">
              <SelectValue placeholder="Select a property" />
            </SelectTrigger>
            <SelectContent>
              {properties.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {items.length > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            {totalItems} item{totalItems === 1 ? '' : 's'} listed
            {lastUpdated && ` • Last updated ${new Date(lastUpdated).toLocaleDateString()}`}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="h-24 bg-muted animate-pulse rounded" />
        ) : items.length === 0 ? (
          <div className="py-8 text-center">
            <Package className="h-10 w-10 text-muted-foreground mx-auto mb-3" aria-hidden="true" />
            <p className="font-medium">No inventory yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add the furniture, appliances and keys that belong to this property.
            </p>
          </div>
        ) : (
          rooms.map(([room, roomItems]) => (
            <div key={room}>
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-semibold text-sm">{room}</h4>
                <Badge variant="secondary" className="text-xs">{roomItems.length}</Badge>
              </div>
              <div className="divide-y border rounded-lg">
                {roomItems.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-2 p-3">
                    <div className="min-w-0">
                      <p className="font-medium break-words">
                        {item.name} <span className="text-sm text-muted-foreground">× {item.quantity}</span>
                      </p>
                      {item.description && (
                        <p className="text-sm text-muted-foreground break-words">{item.description}</p>
                      )}
                      <div className="flex flex-wrap gap-x-4 text-xs text-muted-foreground">
                        {item.brand_model && <span>Brand/model: {item.brand_model}</span>}
                        {item.serial_number && <span>Serial: {item.serial_number}</span>}
                        {item.note && <span>Note: {item.note}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" aria-label={`Edit ${item.name}`} onClick={() => openEdit(item)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove ${item.name}`}
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteItem(item)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit item' : 'Add item'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="inv-room">Room or category *</Label>
              <Input id="inv-room" list="inv-room-suggestions" value={form.room} onChange={setField('room')} placeholder="e.g. Living room" />
              <datalist id="inv-room-suggestions">
                {ROOM_SUGGESTIONS.map((r) => <option key={r} value={r} />)}
              </datalist>
            </div>
            <div className="space-y-1">
              <Label htmlFor="inv-name">Item name *</Label>
              <Input id="inv-name" value={form.name} onChange={setField('name')} placeholder="e.g. Couch" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="inv-qty">Quantity</Label>
              <Input id="inv-qty" type="number" min={1} value={form.quantity} onChange={setField('quantity')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="inv-desc">Description</Label>
              <Input id="inv-desc" value={form.description} onChange={setField('description')} placeholder="e.g. 3-seater, grey fabric" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="inv-brand">Brand or model</Label>
              <Input id="inv-brand" value={form.brand_model} onChange={setField('brand_model')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="inv-serial">Serial number</Label>
              <Input id="inv-serial" value={form.serial_number} onChange={setField('serial_number')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="inv-note">Note</Label>
              <Textarea id="inv-note" rows={2} value={form.note} onChange={setField('note')} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveItem} disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
