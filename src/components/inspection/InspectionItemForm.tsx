import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { X, Save } from 'lucide-react';
import { PhotoCapture } from './PhotoCapture';

interface InspectionItemFormProps {
  initialData?: {
    roomName?: string;
    itemName?: string;
    condition?: string;
    description?: string;
    photos?: string[];
  };
  onSave: (data: {
    roomName: string;
    itemName: string;
    condition: string;
    description: string;
    photos: string[];
  }) => void;
  onCancel: () => void;
}

export function InspectionItemForm({ initialData, onSave, onCancel }: InspectionItemFormProps) {
  const [roomName, setRoomName] = useState(initialData?.roomName || '');
  const [itemName, setItemName] = useState(initialData?.itemName || '');
  const [condition, setCondition] = useState(initialData?.condition || 'good');
  const [description, setDescription] = useState(initialData?.description || '');
  const [photos, setPhotos] = useState<string[]>(initialData?.photos || []);

  const handlePhotoCaptured = (photoUrl: string) => {
    setPhotos(prev => [...prev, photoUrl]);
  };

  const handlePhotoRemoved = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      roomName,
      itemName,
      condition,
      description,
      photos,
    });
  };

  const isFormValid = roomName.trim() && itemName.trim() && condition;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="roomName">Room Name *</Label>
            <Input
              id="roomName"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="e.g., Living Room, Kitchen"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="itemName">Item Name *</Label>
            <Input
              id="itemName"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="e.g., Sofa, Refrigerator"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="condition">Condition *</Label>
          <Select
            value={condition}
            onValueChange={setCondition}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Select condition" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="excellent">Excellent - Like new</SelectItem>
              <SelectItem value="good">Good - Minor wear and tear</SelectItem>
              <SelectItem value="fair">Fair - Noticeable wear</SelectItem>
              <SelectItem value="poor">Poor - Needs attention</SelectItem>
              <SelectItem value="damaged">Damaged - Needs repair/replacement</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add any notes about the item's condition..."
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label>Photos</Label>
          <PhotoCapture
            onPhotoCaptured={handlePhotoCaptured}
            onRemovePhoto={() => {}} // Handled separately
            className="mb-4"
          />
          
          {photos.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">Captured Photos ({photos.length})</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {photos.map((photo, index) => (
                  <div key={index} className="relative group">
                    <img 
                      src={photo} 
                      alt={`Item ${index + 1}`} 
                      className="h-20 w-full object-cover rounded-md"
                    />
                    <button
                      type="button"
                      onClick={() => handlePhotoRemoved(index)}
                      className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Remove photo"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={!isFormValid}
          className="bg-primary text-white hover:bg-primary/90"
        >
          <Save className="h-4 w-4 mr-2" />
          Save Item
        </Button>
      </div>
    </form>
  );
}
