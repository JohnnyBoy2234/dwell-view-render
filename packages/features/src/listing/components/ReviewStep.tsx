import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import { Badge } from '@mzanzihomes/ui/components/badge';
import { MapPin, Home, Bed, Bath, Car, Ruler, Calendar, Camera, Phone, Mail, User, AlertTriangle, Pencil, ShieldCheck, XCircle } from 'lucide-react';
import { Button } from '@mzanzihomes/ui/components/button';
import { Checkbox } from '@mzanzihomes/ui/components/checkbox';
import { Input } from '@mzanzihomes/ui/components/input';
import { Label } from '@mzanzihomes/ui/components/label';
import { isValidSaPhone, type PublishChecklist } from '../validation';
// Simple R icon for South African Rand
const RIcon = ({ className }: { className?: string }) => (
  <div className={`${className} flex items-center justify-center font-bold text-lg`}>
    R
  </div>
);
import { ListingFormData } from '../types';
import { SaleListingFormData } from '../types';

interface ReviewStepProps {
  formData: ListingFormData | SaleListingFormData;
  isSale?: boolean;
  // Rent-wizard extras (all optional — sale flow renders as before):
  onEdit?: (step: number) => void;
  checklist?: PublishChecklist;
  declaration?: { checked: boolean; onChange: (v: boolean) => void };
  contact?: { phone: string | null; saving: boolean; onSavePhone: (phone: string) => void };
}

function PhoneSaver({ saving, onSave }: { saving: boolean; onSave: (phone: string) => void }) {
  const [phone, setPhone] = React.useState('');
  const valid = isValidSaPhone(phone);
  return (
    <div className="flex gap-2">
      <Input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        inputMode="tel"
        placeholder="082 123 4567"
        className="text-base"
      />
      <Button type="button" disabled={!valid || saving} onClick={() => onSave(phone)}>
        {saving ? 'Saving…' : 'Save'}
      </Button>
    </div>
  );
}

export default function ReviewStep({ formData, isSale, onEdit, checklist, declaration, contact }: ReviewStepProps) {
  const EditBtn = ({ step }: { step: number }) =>
    onEdit ? (
      <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onEdit(step)}>
        <Pencil className="h-3 w-3 mr-1" /> Edit
      </Button>
    ) : null;

  const {
    property_type,
    location,
    description,
    bedrooms,
    bathrooms,
    parking_spaces,
    size_sqm,
    furnished,
    pets_allowed,
    amenities,
    price,
    available_from,
    images
  } = formData;

  // Extract contact fields only for sale listings
  const contactFields = isSale ? formData as SaleListingFormData : null;
  const { contact_name, contact_phone, contact_email, preferred_contact_method } = contactFields || {};

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">Review your listing</h2>
        <p className="text-muted-foreground">Check everything looks good before publishing</p>
      </div>

      {checklist && (checklist.blockers.length > 0 || checklist.warnings.length > 0) && (
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-900/10 dark:border-amber-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Before you publish</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {checklist.blockers.map((b) => (
              <p key={b} className="flex items-start gap-2 text-sm text-destructive">
                <XCircle className="h-4 w-4 mt-0.5 shrink-0" /> {b}
              </p>
            ))}
            {checklist.warnings.map((w) => (
              <p key={w} className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /> {w}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Preview Card */}
      <Card className="overflow-hidden">
        <div className="aspect-video bg-muted relative">
          {images && images.length > 0 ? (
            <img
              src={typeof images[0] === 'string' ? images[0] : URL.createObjectURL(images[0])}
              alt="Property main"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Camera className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
          <div className="absolute top-4 right-4 bg-black/50 text-white text-sm px-2 py-1 rounded">
            {images?.length || 0} photos
          </div>
          <div className="absolute top-4 left-4">
            <EditBtn step={5} />
          </div>
        </div>
        
        <CardContent className="p-6">
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <MapPin className="h-4 w-4" />
                {location}
              </div>
              <h3 className="text-xl font-semibold">{property_type} in {location}</h3>
            </div>
            
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Bed className="h-4 w-4" />
                {bedrooms} bed{bedrooms !== 1 ? 's' : ''}
              </div>
              <div className="flex items-center gap-1">
                <Bath className="h-4 w-4" />
                {bathrooms} bath{bathrooms !== 1 ? 's' : ''}
              </div>
              {parking_spaces > 0 && (
                <div className="flex items-center gap-1">
                  <Car className="h-4 w-4" />
                  {parking_spaces} parking
                </div>
              )}
              {size_sqm && (
                <div className="flex items-center gap-1">
                  <Ruler className="h-4 w-4" />
                  {size_sqm}sqm
                </div>
              )}
            </div>
            
            <div className="text-2xl font-bold text-primary">
              R{price?.toLocaleString()}{isSale ? '' : ' / month'}
            </div>
          </div>
        </CardContent>
      </Card>

      {!isSale && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" /> Address
              </CardTitle>
              <EditBtn step={2} />
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(formData as ListingFormData).street_address ? <p>{(formData as ListingFormData).street_address}</p> : null}
            <p>
              {[(formData as ListingFormData).suburb, (formData as ListingFormData).city, (formData as ListingFormData).province]
                .filter(Boolean)
                .join(', ')}{' '}
              {(formData as ListingFormData).postal_code}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Property Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                Property Details
              </CardTitle>
              <EditBtn step={3} />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between gap-2 min-w-0">
              <span className="text-muted-foreground shrink-0">Type:</span>
              <span className="flex items-center gap-1">
                <span className="font-medium text-right break-words">{property_type}</span>
                <EditBtn step={1} />
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bedrooms:</span>
              <span className="font-medium">{bedrooms}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bathrooms:</span>
              <span className="font-medium">{bathrooms}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Parking:</span>
              <span className="font-medium">{parking_spaces || 'None'}</span>
            </div>
            {size_sqm && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Size:</span>
                <span className="font-medium">{size_sqm}sqm</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Furnished:</span>
              <span className="font-medium">{furnished ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pet Friendly:</span>
              <span className="font-medium">{pets_allowed ? 'Yes' : 'No'}</span>
            </div>
          </CardContent>
        </Card>

        {/* Pricing & Availability */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <RIcon className="h-7 w-7" />
                Pricing & Availability
              </CardTitle>
              <EditBtn step={4} />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">{isSale ? 'Sale Price:' : 'Monthly Rent:'}</span>
              <span className="font-bold text-lg text-primary">R{price?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Available From:</span>
              <span className="font-medium">
                {available_from ? new Date(available_from).toLocaleDateString() : 'Immediately'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Description</CardTitle>
            <EditBtn step={2} />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground leading-relaxed break-words whitespace-pre-wrap">{description}</p>
        </CardContent>
      </Card>

      {/* Contact Information - Only for sales */}
      {isSale && contact_name && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between gap-2 min-w-0">
              <span className="text-muted-foreground shrink-0">Contact Name:</span>
              <span className="font-medium text-right break-words">{contact_name}</span>
            </div>
            <div className="flex justify-between gap-2 min-w-0">
              <span className="text-muted-foreground flex items-center gap-1 shrink-0">
                <Phone className="h-4 w-4" />
                Phone:
              </span>
              <span className="font-medium text-right break-all">{contact_phone}</span>
            </div>
            <div className="flex justify-between gap-2 min-w-0">
              <span className="text-muted-foreground flex items-center gap-1 shrink-0">
                <Mail className="h-4 w-4" />
                Email:
              </span>
              <span className="font-medium text-right break-all">{contact_email}</span>
            </div>
            <div className="flex justify-between gap-2 min-w-0">
              <span className="text-muted-foreground shrink-0">Preferred Contact:</span>
              <span className="font-medium capitalize text-right">
                {preferred_contact_method === 'both' ? 'Phone or Email' : preferred_contact_method}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Amenities */}
      {amenities && amenities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Amenities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {amenities.map((amenity) => (
                <Badge key={amenity} variant="secondary">
                  {amenity}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {contact && !isValidSaPhone(contact.phone || '') && (
        <Card className="border-destructive/40">
          <CardContent className="p-5 space-y-3">
            <p className="text-sm font-medium">Add a phone number to your profile before publishing.</p>
            <PhoneSaver saving={contact.saving} onSave={contact.onSavePhone} />
          </CardContent>
        </Card>
      )}

      {declaration && (
        <Card>
          <CardContent className="p-5 flex items-start gap-3">
            <Checkbox
              id="landlord-declaration"
              checked={declaration.checked}
              onCheckedChange={(v) => declaration.onChange(!!v)}
              className="mt-0.5"
            />
            <Label htmlFor="landlord-declaration" className="text-sm font-normal leading-relaxed cursor-pointer">
              <ShieldCheck className="h-4 w-4 inline mr-1 text-primary" />
              I confirm that the information provided is accurate and that I am authorised to advertise this property.
            </Label>
          </CardContent>
        </Card>
      )}
    </div>
  );
}