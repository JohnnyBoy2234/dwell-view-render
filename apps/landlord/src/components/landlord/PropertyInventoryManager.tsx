import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@mzanzihomes/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import { Button } from '@mzanzihomes/ui/components/button';
import { Badge } from '@mzanzihomes/ui/components/badge';
import { Input } from '@mzanzihomes/ui/components/input';
import { Label } from '@mzanzihomes/ui/components/label';
import { Textarea } from '@mzanzihomes/ui/components/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@mzanzihomes/ui/components/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@mzanzihomes/ui/components/select';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';
import { Camera, CheckCircle2, Clock, Package, Pencil, Plus, Trash2, X } from 'lucide-react';

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
  category: string | null;
  condition: string;
  image_urls: string[] | null;
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
  category: string;
  condition: string;
}

const EMPTY_FORM: ItemForm = {
  room: '', name: '', quantity: '1', description: '', serial_number: '', brand_model: '', note: '',
  category: 'none', condition: 'good'
};

// Condition describes the item as the landlord supplies it. Values must match
// the property_inventory_items.condition check constraint.
const CONDITION_CHOICES = [
  { value: 'good', label: 'Good condition' },
  { value: 'needs_attention', label: 'Needs attention' },
  { value: 'not_working', label: 'Not working' },
  { value: 'unknown', label: 'Not recorded' },
];

const CATEGORY_CHOICES = [
  { value: 'furniture', label: 'Furniture' },
  { value: 'appliances', label: 'Appliances' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'fixtures', label: 'Fixtures' },
  { value: 'decor', label: 'Decor' },
  { value: 'kitchenware', label: 'Kitchenware' },
  { value: 'outdoor', label: 'Outdoor' },
  { value: 'other', label: 'Other' },
];

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
  // Item photos: URLs already saved + files picked in this dialog session
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  // Tenant approval of this property's inventory
  const [approval, setApproval] = useState<{ approved_at: string } | null>(null);

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
    (supabase.from('inventory_approvals') as any)
      .select('approved_at')
      .eq('property_id', propertyId)
      .order('approved_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }: any) => setApproval(data ?? null));
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
    setExistingImages([]);
    setNewFiles([]);
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
      note: item.note ?? '',
      category: item.category ?? 'none',
      condition: item.condition ?? 'unknown'
    });
    setExistingImages(item.image_urls ?? []);
    setNewFiles([]);
    setDialogOpen(true);
  };

  const saveItem = async () => {
    if (!form.room.trim() || !form.name.trim()) {
      toast({ variant: 'destructive', title: 'Room and item name are required' });
      return;
    }
    setSaving(true);

    // Upload any newly picked photos first
    const uploadedUrls: string[] = [];
    for (const file of newFiles) {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${propertyId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('inventory-images').upload(path, file);
      if (uploadError) {
        setSaving(false);
        toast({ variant: 'destructive', title: 'Photo upload failed', description: uploadError.message });
        return;
      }
      const { data: { publicUrl } } = supabase.storage.from('inventory-images').getPublicUrl(path);
      uploadedUrls.push(publicUrl);
    }

    const payload = {
      property_id: propertyId,
      room: form.room.trim(),
      name: form.name.trim(),
      quantity: Math.max(1, parseInt(form.quantity, 10) || 1),
      description: form.description.trim() || null,
      serial_number: form.serial_number.trim() || null,
      brand_model: form.brand_model.trim() || null,
      note: form.note.trim() || null,
      category: form.category === 'none' ? null : form.category,
      condition: form.condition,
      image_urls: [...existingImages, ...uploadedUrls]
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
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <p className="text-xs text-muted-foreground">
              {totalItems} item{totalItems === 1 ? '' : 's'} listed
              {lastUpdated && ` • Last updated ${new Date(lastUpdated).toLocaleDateString()}`}
            </p>
            {approval && lastUpdated && lastUpdated > approval.approved_at ? (
              <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                <Clock className="h-3 w-3 mr-1" /> Changed since tenant acknowledged
              </Badge>
            ) : approval ? (
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Acknowledged by tenant {new Date(approval.approved_at).toLocaleDateString()}
              </Badge>
            ) : (
              <Badge variant="secondary">
                <Clock className="h-3 w-3 mr-1" /> Awaiting tenant acknowledgement
              </Badge>
            )}
          </div>
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
                      {(item.image_urls?.length ?? 0) > 0 && (
                        <div className="flex gap-1.5 mt-2 overflow-x-auto">
                          {item.image_urls!.map((url) => (
                            <a key={url} href={url} target="_blank" rel="noreferrer" className="shrink-0">
                              <img src={url} alt={item.name} className="h-14 w-14 rounded-lg object-cover border" />
                            </a>
                          ))}
                        </div>
                      )}
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
        <DialogContent className="max-w-lg max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 text-teal-600">
                <Package className="h-4 w-4" />
              </span>
              {editingId ? 'Edit item' : 'Add inventory item'}
            </DialogTitle>
            <DialogDescription>
              Record what's supplied with the property, its condition and photos — so nothing is disputed later.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Basics */}
            <div className="rounded-2xl border bg-muted/20 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">The basics</p>
              <div className="space-y-1">
                <Label htmlFor="inv-room">Room or area <span className="text-red-500">*</span></Label>
                <Input id="inv-room" list="inv-room-suggestions" value={form.room} onChange={setField('room')} placeholder="e.g. Living room" />
                <datalist id="inv-room-suggestions">
                  {ROOM_SUGGESTIONS.map((r) => <option key={r} value={r} />)}
                </datalist>
              </div>
              <div className="space-y-1">
                <Label htmlFor="inv-name">Item name <span className="text-red-500">*</span></Label>
                <Input id="inv-name" value={form.name} onChange={setField('name')} placeholder="e.g. Couch" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="inv-qty">Quantity</Label>
                  <Input id="inv-qty" type="number" min={1} value={form.quantity} onChange={setField('quantity')} />
                </div>
                <div className="space-y-1">
                  <Label>Condition</Label>
                  <Select value={form.condition} onValueChange={(v) => setForm((prev) => ({ ...prev, condition: v }))}>
                    <SelectTrigger><SelectValue placeholder="Condition" /></SelectTrigger>
                    <SelectContent>
                      {CONDITION_CHOICES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm((prev) => ({ ...prev, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No category</SelectItem>
                    {CATEGORY_CHOICES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Details */}
            <div className="rounded-2xl border bg-muted/20 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Details <span className="normal-case font-normal">(optional)</span></p>
              <div className="space-y-1">
                <Label htmlFor="inv-desc">Description</Label>
                <Input id="inv-desc" value={form.description} onChange={setField('description')} placeholder="e.g. 3-seater, grey fabric" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="inv-brand">Brand or model</Label>
                  <Input id="inv-brand" value={form.brand_model} onChange={setField('brand_model')} placeholder="e.g. Samsung" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="inv-serial">Serial number</Label>
                  <Input id="inv-serial" value={form.serial_number} onChange={setField('serial_number')} />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="inv-note">Note</Label>
                <Textarea id="inv-note" rows={2} value={form.note} onChange={setField('note')} placeholder="Any existing marks, wear or details worth recording" />
              </div>
            </div>

            {/* Photos */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Camera className="h-4 w-4" /> Photos
              </Label>
              <label
                htmlFor="inv-photos"
                className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-muted-foreground/25 bg-muted/20 px-4 py-6 text-center transition-colors hover:border-teal-400 hover:bg-teal-50/40"
              >
                <Camera className="h-6 w-6 text-teal-500" />
                <span className="text-sm font-medium text-foreground">Tap to add photos</span>
                <span className="text-xs text-muted-foreground">Take a photo or choose from your gallery</span>
                <Input
                  id="inv-photos"
                  type="file"
                  accept="image/*"
                  multiple
                  capture="environment"
                  className="sr-only"
                  onChange={(e) => setNewFiles((prev) => [...prev, ...Array.from(e.target.files || [])])}
                />
              </label>
              {(existingImages.length > 0 || newFiles.length > 0) && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {existingImages.map((url) => (
                    <div key={url} className="relative">
                      <img src={url} alt="Item" className="h-16 w-16 rounded-lg object-cover border" />
                      <button
                        type="button"
                        aria-label="Remove photo"
                        className="absolute -top-1.5 -right-1.5 bg-black/60 text-white rounded-full p-0.5"
                        onClick={() => setExistingImages((prev) => prev.filter((u) => u !== url))}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {newFiles.map((file, i) => (
                    <div key={`${file.name}-${i}`} className="relative">
                      <img src={URL.createObjectURL(file)} alt={file.name} className="h-16 w-16 rounded-lg object-cover border opacity-80" />
                      <button
                        type="button"
                        aria-label="Remove photo"
                        className="absolute -top-1.5 -right-1.5 bg-black/60 text-white rounded-full p-0.5"
                        onClick={() => setNewFiles((prev) => prev.filter((_, idx) => idx !== i))}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
