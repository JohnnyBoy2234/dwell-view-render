// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Home, MapPin, Camera, Settings, CheckCircle, Phone } from 'lucide-react';
import { RIcon } from '@/components/icons/RIcon';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/useSubscription';
import { SuccessDialog } from '@/components/ui/SuccessDialog';

// Import step components
import ListingTypeStep from '@/components/listing/ListingTypeStep';
import PropertyTypeStep from '@/components/listing/PropertyTypeStep';
import LocationStep from '@/components/listing/LocationStep';
import DetailsStep from '@/components/listing/DetailsStep';
import PricingStep from '@/components/listing/PricingStep';
import PhotosStep from '@/components/listing/PhotosStep';
import ReviewStep from '@/components/listing/ReviewStep';
import ContactStep from '@/components/listing/ContactStep';

export interface ListingFormData {
  // Listing Type
  listing_type: 'rent' | 'sale';
  
  // Property Type
  property_type: string;
  
  // Location
  location: string;
  description: string;
  
  // Details
  bedrooms: number;
  bathrooms: number;
  parking_spaces: number;
  size_sqm?: number;
  furnished: boolean;
  pets_allowed: boolean;
  amenities: string[];
  
  // Pricing & Availability (rental)
  price: number;
  available_from?: string;
  
  // Sale-specific fields
  sale_price?: number;
  price_negotiable?: boolean;
  levy_amount?: number;
  rates_taxes?: number;
  erf_size?: number;
  transfer_duty_estimate?: number;
  occupation_date?: string;
  
  // Contact (sale listings)
  contact_phone?: string;
  contact_email?: string;
  
  // Photos
  images: File[];
  amenities: string[];
  
  // Pricing & Availability (rental)
  price: number;
  available_from?: string;
  
  // Sale-specific fields
  sale_price?: number;
  price_negotiable?: boolean;
  levy_amount?: number;
  rates_taxes?: number;
  erf_size?: number;
  transfer_duty_estimate?: number;
  occupation_date?: string;
  
  // Photos
  images: File[];
}

const rentalSteps = [
  { id: 1, title: 'Listing Type', icon: Home, description: 'Rent or sell?' },
  { id: 2, title: 'Property Type', icon: Home, description: 'What are you listing?' },
  { id: 3, title: 'Location', icon: MapPin, description: 'Where is your property?' },
  { id: 4, title: 'Details', icon: Settings, description: 'Property specifications' },
  { id: 5, title: 'Pricing', icon: RIcon, description: 'Set your price' },
  { id: 6, title: 'Photos', icon: Camera, description: 'Add beautiful photos' },
  { id: 7, title: 'Review', icon: CheckCircle, description: 'Review and publish' },
];

const saleSteps = [
  { id: 1, title: 'Listing Type', icon: Home, description: 'Rent or sell?' },
  { id: 2, title: 'Property Type', icon: Home, description: 'What are you listing?' },
  { id: 3, title: 'Location', icon: MapPin, description: 'Where is your property?' },
  { id: 4, title: 'Details', icon: Settings, description: 'Property specifications' },
  { id: 5, title: 'Pricing', icon: RIcon, description: 'Set your price' },
  { id: 6, title: 'Photos', icon: Camera, description: 'Add beautiful photos' },
  { id: 7, title: 'Contact', icon: Phone, description: 'Your contact details' },
  { id: 8, title: 'Review', icon: CheckCircle, description: 'Review and publish' },
];

interface ListPropertyProps {
  listingType?: 'rent' | 'sale';
}

export default function ListProperty({ listingType }: ListPropertyProps = {}) {
  const { user, isLandlord } = useAuth();
  const { plan, planStatus } = useSubscription();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const { control, handleSubmit, watch, setValue, reset, formState: { errors }, trigger } = useForm<ListingFormData>({
    defaultValues: {
      listing_type: listingType || undefined,
      property_type: '',
      location: '',
      description: '',
      bedrooms: undefined,
      bathrooms: undefined,
      parking_spaces: undefined,
      furnished: false,
      pets_allowed: false,
      amenities: [],
      price: undefined,
      price_negotiable: false,
      images: []
    },
    mode: 'onChange'
  });

  const isSale = formData.listing_type === 'sale' || listingType === 'sale';
  const steps = isSale ? saleSteps : rentalSteps;
  const effectiveCurrentStep = listingType ? currentStep - 1 : currentStep;
  const effectiveSteps = listingType ? rentalSteps.slice(1) : rentalSteps;

  const formData = watch();

  if (!user) {
    navigate('/auth');
    return null;
  }

  const LOCAL_STORAGE_KEY = 'listing_form_draft';
  const progress = (effectiveCurrentStep / effectiveSteps.length) * 100;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.currentStep) {
          setCurrentStep(parsed.currentStep);
        }
        if (parsed.formData) {
          reset(parsed.formData);
        }
      }
    } catch (error) {
      console.warn('Failed to restore draft listing', error);
    }
  }, [reset]);

  useEffect(() => {
    const payload = {
      currentStep,
      formData: {
        ...formData,
        images: []
      }
    };
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.warn('Failed to persist draft listing', error);
    }
  }, [formData, currentStep]);

  const nextStep = async () => {
    let fieldsToValidate: (keyof ListingFormData)[] = [];
    
    switch (currentStep) {
      case 1:
        fieldsToValidate = ['listing_type'];
        break;
      case 2:
        fieldsToValidate = ['property_type'];
        break;
      case 3:
        fieldsToValidate = ['location', 'description'];
        break;
      case 4:
        fieldsToValidate = ['bedrooms', 'bathrooms'];
        break;
      case 5:
        if (formData.listing_type === 'sale') {
          fieldsToValidate = ['sale_price'];
        } else {
          fieldsToValidate = ['price'];
        }
        break;
      case 7:
        if (isSale) {
          fieldsToValidate = ['contact_phone', 'contact_email'];
        }
        break;
    }

    const isValid = await trigger(fieldsToValidate);
    
    if (isValid && effectiveCurrentStep < effectiveSteps.length) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    if (effectiveCurrentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const uploadImages = async (images: File[]) => {
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

  const onSubmit = async (data: ListingFormData) => {
    setIsSubmitting(true);

    try {
      // Ensure user has landlord role before creating property
      if (!isLandlord) {
        const { error: roleError } = await supabase.rpc('promote_to_landlord');
        if (roleError) {
          console.error('Error promoting to landlord:', roleError);
          // Continue anyway - RLS policy allows users without roles to create properties
        }
      }

      // Upload images first
      const imageUrls = data.images.length > 0 ? await uploadImages(data.images) : [];

      // Insert property - keep price as the exact number without any conversion that could cause precision loss
      const insertData: any = {
        title: `${data.property_type} in ${data.location}`, // Generate title from property type and location
        description: data.description,
        location: data.location,
        property_type: data.property_type,
        price: data.listing_type === 'sale' ? (data.sale_price || 0) : data.price,
        bedrooms: Number(data.bedrooms) || 1,
        bathrooms: Number(data.bathrooms) || 1,
        parking_spaces: Number(data.parking_spaces) || 0,
        size_sqm: data.size_sqm ? Number(data.size_sqm) : null,
        furnished: data.furnished,
        pets_allowed: data.pets_allowed,
        available_from: data.listing_type === 'rent' ? (data.available_from || null) : null,
        landlord_id: user.id,
        images: imageUrls,
        amenities: data.amenities,
        listing_type: data.listing_type || (listingType || 'rent'),
      };

      // Add sale-specific fields
      if (data.listing_type === 'sale') {
        insertData.sale_price = data.sale_price ? Number(data.sale_price) : null;
        insertData.price_negotiable = data.price_negotiable || false;
        insertData.levy_amount = data.levy_amount ? Number(data.levy_amount) : null;
        insertData.rates_taxes = data.rates_taxes ? Number(data.rates_taxes) : null;
        insertData.erf_size = data.erf_size ? Number(data.erf_size) : null;
        insertData.transfer_duty_estimate = data.transfer_duty_estimate ? Number(data.transfer_duty_estimate) : null;
        insertData.occupation_date = data.occupation_date || null;
        insertData.contact_phone = data.contact_phone || null;
        insertData.contact_email = data.contact_email || null;
      }

      const { error } = await supabase
        .from('properties')
        .insert(insertData);

      if (error) throw error;

      try {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      } catch {}

      setShowSuccessDialog(true);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error listing property",
        description: error.message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublishClick = () => {
    const submitFn = handleSubmit(onSubmit);
    submitFn();
  };

  const renderStepContent = () => {
    // When listingType is passed as prop, step 1 (ListingType) is skipped
    // effectiveCurrentStep maps to the visible step number
    if (listingType) {
      // Steps without ListingType: PropertyType(1), Location(2), Details(3), Pricing(4), Photos(5), [Contact(6) if sale], Review(last)
      switch (effectiveCurrentStep) {
        case 1: return <PropertyTypeStep control={control} errors={errors} />;
        case 2: return <LocationStep control={control} errors={errors} />;
        case 3: return <DetailsStep control={control} errors={errors} setValue={setValue} watch={watch} />;
        case 4: return <PricingStep control={control} errors={errors} setValue={setValue} listingType={formData.listing_type} />;
        case 5: return <PhotosStep setValue={setValue} formData={formData} />;
        case 6:
          if (isSale) return <ContactStep control={control} errors={errors} />;
          return <ReviewStep formData={formData} />;
        case 7:
          if (isSale) return <ReviewStep formData={formData} />;
          return null;
        default: return null;
      }
    }
    // Full flow with ListingType step
    switch (currentStep) {
      case 1: return <ListingTypeStep control={control} errors={errors} />;
      case 2: return <PropertyTypeStep control={control} errors={errors} />;
      case 3: return <LocationStep control={control} errors={errors} />;
      case 4: return <DetailsStep control={control} errors={errors} setValue={setValue} watch={watch} />;
      case 5: return <PricingStep control={control} errors={errors} setValue={setValue} listingType={formData.listing_type} />;
      case 6: return <PhotosStep setValue={setValue} formData={formData} />;
      case 7:
        if (isSale) return <ContactStep control={control} errors={errors} />;
        return <ReviewStep formData={formData} />;
      case 8:
        if (isSale) return <ReviewStep formData={formData} />;
        return null;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto p-6 max-w-4xl pb-32 md:pb-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-primary">List Your Property</h1>
            <p className="text-muted-foreground">Get your property in front of thousands of potential tenants</p>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-medium text-muted-foreground">
              Step {effectiveCurrentStep} of {effectiveSteps.length}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          
          {/* Step indicators */}
          <div className="flex justify-between mt-4">
            {effectiveSteps.map((step, index) => {
              const IconComponent = step.icon;
              const stepId = listingType ? index + 2 : step.id;
              const isActive = currentStep === stepId;
              const isCompleted = currentStep > stepId;
              
              return (
                <div
                  key={step.id}
                  className={`flex flex-col items-center space-y-2 ${
                    isActive ? 'text-primary' : isCompleted ? 'text-green-600' : 'text-muted-foreground'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : isCompleted
                        ? 'bg-green-600 text-white'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-medium">{step.title}</p>
                    <p className="text-xs opacity-75 hidden sm:block">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {steps[currentStep - 1]?.icon && (() => {
                const IconComponent = steps[currentStep - 1].icon;
                return <IconComponent className="h-5 w-5" />;
              })()}
              {steps[currentStep - 1]?.title}
            </CardTitle>
            <CardDescription>
              {steps[currentStep - 1]?.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderStepContent()}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </Button>

          {currentStep < steps.length ? (
            <Button onClick={nextStep} className="flex items-center gap-2">
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handlePublishClick}
              disabled={isSubmitting}
              className="flex items-center gap-2"
            >
              {isSubmitting ? 'Publishing...' : 'Publish Property'}
              <CheckCircle className="h-4 w-4" />
            </Button>
          )}
        </div>

        {(plan === 'free' || planStatus !== 'active') && (
          <div className="mt-6 rounded-lg border border-primary/20 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="font-semibold text-primary">Upgrade for unlimited pro features</p>
              <p className="text-sm text-muted-foreground">
                Stay on the free plan or unlock messaging, applications, and premium support whenever you’re ready.
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate('/pricing')}>
              View Plans
            </Button>
          </div>
        )}

        {/* Success Dialog */}
        <SuccessDialog
          open={showSuccessDialog}
          onClose={() => {
            setShowSuccessDialog(false);
            navigate('/enhancedlandlorddashboard');
          }}
          icon="home"
          title="Property Listed Successfully!"
          subtitle="Your property is now live on RentLekker and visible to potential tenants."
          nextSteps={[
            { title: "Wait for enquiries", description: "Tenants can now view and enquire about your property" },
            { title: "Manage viewings", description: "Schedule property viewings with interested tenants" },
            { title: "Review applications", description: "Accept your ideal tenant when they apply" }
          ]}
          primaryAction={{
            label: "View My Properties",
            onClick: () => {
              setShowSuccessDialog(false);
              navigate('/enhancedlandlorddashboard');
            }
          }}
          secondaryAction={{
            label: "List Another Property",
            onClick: () => {
              setShowSuccessDialog(false);
              window.location.reload();
            }
          }}
          showConfetti={true}
        />
      </div>
    </div>
  );
}