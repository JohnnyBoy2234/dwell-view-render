import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Home, MapPin, Camera, Settings, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Import step components
import PropertyTypeStep from '@/components/listing/PropertyTypeStep';
import LocationStep from '@/components/listing/LocationStep';
import DetailsStep from '@/components/listing/DetailsStep';
import PricingStep from '@/components/listing/PricingStep';
import PhotosStep from '@/components/listing/PhotosStep';
import ReviewStep from '@/components/listing/ReviewStep';

export interface ListingFormData {
  // Property Type
  property_type: string;
  
  // Location
  location: string;
  title: string;
  description: string;
  
  // Details
  bedrooms: number;
  bathrooms: number;
  parking_spaces: number;
  size_sqm?: number;
  furnished: boolean;
  pets_allowed: boolean;
  amenities: string[];
  
  // Pricing & Availability
  price: number;
  available_from?: string;
  
  // Photos
  images: File[];
}

const steps = [
  { id: 1, title: 'Property Type', icon: Home, description: 'What are you listing?' },
  { id: 2, title: 'Location', icon: MapPin, description: 'Where is your property?' },
  { id: 3, title: 'Details', icon: Settings, description: 'Property specifications' },
  { id: 4, title: 'Pricing', icon: Settings, description: 'Set your price' },
  { id: 5, title: 'Photos', icon: Camera, description: 'Add beautiful photos' },
  { id: 6, title: 'Review', icon: CheckCircle, description: 'Review and publish' },
];

export default function ListProperty() {
  const { user, isLandlord } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const { control, handleSubmit, watch, setValue, formState: { errors }, trigger } = useForm<ListingFormData>({
    defaultValues: {
      property_type: '',
      location: '',
      title: '',
      description: '',
      bedrooms: undefined,
      bathrooms: undefined,
      parking_spaces: undefined,
      furnished: false,
      pets_allowed: false,
      amenities: [],
      price: undefined,
      images: []
    },
    mode: 'onChange'
  });

  const formData = watch();

  if (!user) {
    navigate('/auth');
    return null;
  }

  const progress = (currentStep / steps.length) * 100;

  const nextStep = async () => {
    let fieldsToValidate: (keyof ListingFormData)[] = [];
    
    switch (currentStep) {
      case 1:
        fieldsToValidate = ['property_type'];
        break;
      case 2:
        fieldsToValidate = ['location', 'title', 'description'];
        break;
      case 3:
        fieldsToValidate = ['bedrooms', 'bathrooms'];
        break;
      case 4:
        fieldsToValidate = ['price'];
        break;
    }

    const isValid = await trigger(fieldsToValidate);
    
    if (isValid && currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
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
          // Continue anyway - the RLS policy allows users without roles to create properties
        }
      }

      // Upload images first
      const imageUrls = data.images.length > 0 ? await uploadImages(data.images) : [];

      // Insert property - keep price as the exact number without any conversion that could cause precision loss
      const { error } = await supabase
        .from('properties')
        .insert({
          title: data.title,
          description: data.description,
          location: data.location,
          property_type: data.property_type,
          price: data.price, // Use the exact price value without Number() conversion
          bedrooms: Number(data.bedrooms) || 1,
          bathrooms: Number(data.bathrooms) || 1,
          parking_spaces: Number(data.parking_spaces) || 0,
          size_sqm: data.size_sqm ? Number(data.size_sqm) : null,
          furnished: data.furnished,
          pets_allowed: data.pets_allowed,
          available_from: data.available_from || null,
          landlord_id: user.id,
          images: imageUrls,
          amenities: data.amenities,
        });

      if (error) throw error;

      toast({
        title: "🎉 Property Listed Successfully!",
        description: "Your property is now live on SwiftRent and visible to potential tenants."
      });

      navigate('/dashboard');
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

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <PropertyTypeStep control={control} errors={errors} />;
      case 2:
        return <LocationStep control={control} errors={errors} />;
      case 3:
        return <DetailsStep control={control} errors={errors} setValue={setValue} watch={watch} />;
      case 4:
        return <PricingStep control={control} errors={errors} setValue={setValue} />;
      case 5:
        return <PhotosStep setValue={setValue} formData={formData} />;
      case 6:
        return <ReviewStep formData={formData} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto p-6 max-w-4xl">
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
              Step {currentStep} of {steps.length}
            </span>
            <span className="text-sm font-medium text-primary">
              {Math.round(progress)}% complete
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          
          {/* Step indicators */}
          <div className="flex justify-between mt-4">
            {steps.map((step) => {
              const IconComponent = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              
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
              onClick={handleSubmit(onSubmit)}
              disabled={isSubmitting}
              className="flex items-center gap-2"
            >
              {isSubmitting ? 'Publishing...' : 'Publish Property'}
              <CheckCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}