import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Upload, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PropertyFormData {
  title: string;
  description: string;
  location: string;
  price: number;
  property_type: string;
  bedrooms: number;
  bathrooms: number;
  parking_spaces: number;
  size_sqm?: number;
  furnished: boolean;
  pets_allowed: boolean;
  available_from?: string;
}

const propertyTypes = [
  'Apartment',
  'House',
  'Townhouse',
  'Flat',
  'Studio',
  'Bachelor',
  'Room',
  'Other'
];

const amenitiesList = [
  'Swimming Pool',
  'Garden',
  'Security',
  'Gym/Fitness Center',
  'Braai Area',
  'Air Conditioning',
  'WiFi',
  'DSTV',
  'Backup Power',
  'Water Tank',
  'Fiber Internet',
  'Pet Friendly'
];

export default function AddProperty() {
  const { user, isLandlord } = useAuth();
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<PropertyFormData>({
    defaultValues: {
      furnished: false,
      pets_allowed: false
    }
  });

  if (!user) {
    navigate('/auth');
    return null;
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setImages(prev => [...prev, ...files].slice(0, 10)); // Max 10 images
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async () => {
    const uploadedUrls: string[] = [];

    for (const image of images) {
      const fileExt = image.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('property-images')
        .upload(filePath, image);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('property-images')
        .getPublicUrl(filePath);

      uploadedUrls.push(data.publicUrl);
    }

    return uploadedUrls;
  };

  const onSubmit = async (data: PropertyFormData) => {
    setUploading(true);

    try {
      // Ensure user has landlord role before creating property
      if (!isLandlord) {
        const { error: roleError } = await supabase.rpc('promote_to_landlord');
        if (roleError) {
          console.error('Error promoting to landlord:', roleError);
          // Continue anyway - the RLS policy allows users without roles to create properties
        }
      }

      // Upload images first
      const imageUrls = images.length > 0 ? await uploadImages() : [];

      // Insert property - use exact values to prevent precision loss
      const { error } = await supabase
        .from('properties')
        .insert({
          ...data,
          landlord_id: user.id,
          images: imageUrls,
          amenities: selectedAmenities,
          price: data.price, // Use exact price value
          bedrooms: Number(data.bedrooms),
          bathrooms: Number(data.bathrooms),
          parking_spaces: Number(data.parking_spaces),
          size_sqm: data.size_sqm ? Number(data.size_sqm) : null
        });

      if (error) throw error;

      toast({
        title: "Property added successfully!",
        description: "Your property is now listed on SwiftRent."
      });

      navigate('/dashboard');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error adding property",
        description: error.message
      });
    } finally {
      setUploading(false);
    }
  };

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities(prev =>
      prev.includes(amenity)
        ? prev.filter(a => a !== amenity)
        : [...prev, amenity]
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex flex-col items-left gap-4 mb-8">
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-primary">Add New Property</h1>
            <p className="text-muted-foreground">List your property for rent</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Essential details about your property</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Property Title *</Label>
                  <Input
                    {...register('title', { required: 'Title is required' })}
                    placeholder="e.g., Modern 2-bedroom apartment in Sandton"
                  />
                  {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="property_type">Property Type *</Label>
                  <Select onValueChange={(value) => setValue('property_type', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select property type" />
                    </SelectTrigger>
                    <SelectContent>
                      {propertyTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Input
                  {...register('location', { required: 'Location is required' })}
                  placeholder="e.g., Sandton, Johannesburg, Gauteng"
                />
                {errors.location && <p className="text-sm text-destructive">{errors.location.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  {...register('description', { required: 'Description is required' })}
                  placeholder="Describe your property, its features, and surroundings..."
                  rows={4}
                />
                {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Property Details */}
          <Card>
            <CardHeader>
              <CardTitle>Property Details</CardTitle>
              <CardDescription>Specifications and pricing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Monthly Rent (R) *</Label>
                  <Input
                    type="number"
                    {...register('price', { required: 'Price is required', min: 1 })}
                    placeholder="12000"
                  />
                  {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bedrooms">Bedrooms *</Label>
                  <Input
                    type="number"
                    {...register('bedrooms', { required: true, min: 0 })}
                    min="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bathrooms">Bathrooms *</Label>
                  <Input
                    type="number"
                    {...register('bathrooms', { required: true, min: 1 })}
                    min="1"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="parking_spaces">Parking Spaces</Label>
                  <Input
                    type="number"
                    {...register('parking_spaces')}
                    min="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="size_sqm">Size (sqm)</Label>
                  <Input
                    type="number"
                    {...register('size_sqm')}
                    placeholder="85"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="available_from">Available From</Label>
                  <Input
                    type="date"
                    {...register('available_from')}
                  />
                </div>
              </div>

              <div className="flex flex-col space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="furnished"
                    checked={watch('furnished')}
                    onCheckedChange={(checked) => setValue('furnished', !!checked)}
                  />
                  <Label htmlFor="furnished">Furnished</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="pets_allowed"
                    checked={watch('pets_allowed')}
                    onCheckedChange={(checked) => setValue('pets_allowed', !!checked)}
                  />
                  <Label htmlFor="pets_allowed">Pets Allowed</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Amenities */}
          <Card>
            <CardHeader>
              <CardTitle>Amenities</CardTitle>
              <CardDescription>Select available amenities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {amenitiesList.map(amenity => (
                  <Badge
                    key={amenity}
                    variant={selectedAmenities.includes(amenity) ? "default" : "outline"}
                    className="cursor-pointer justify-center p-2"
                    onClick={() => toggleAmenity(amenity)}
                  >
                    {amenity}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Images */}
          <Card>
            <CardHeader>
              <CardTitle>Property Images</CardTitle>
              <CardDescription>Add up to 10 high-quality images</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="image-upload"
                />
                <Label htmlFor="image-upload" className="cursor-pointer">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload images or drag and drop
                  </p>
                </Label>
              </div>

              {images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {images.map((image, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(image)}
                        alt={`Property ${index + 1}`}
                        className="w-full h-24 object-cover rounded"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                        onClick={() => removeImage(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => navigate('/dashboard')}>
              Cancel
            </Button>
            <Button type="submit" disabled={uploading}>
              {uploading ? 'Adding Property...' : 'Add Property'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}