// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@mzanzihomes/ui/components/button';
import { Card, CardContent } from '@mzanzihomes/ui/components/card';
import { Progress } from '@mzanzihomes/ui/components/progress';
import { ArrowLeft, ArrowRight, Home, MapPin, Camera, Settings, CheckCircle } from 'lucide-react';
// Simple R icon for South African Rand
const RIcon = ({ className }: { className?: string }) => (
  <div className={`${className} flex items-center justify-center font-bold text-xs leading-none`}>
    R
  </div>
);
import { supabase } from '@mzanzihomes/supabase/client';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';
import { useSubscription } from '@mzanzihomes/supabase/hooks/useSubscription';
import { SuccessDialog } from '@mzanzihomes/ui/components/SuccessDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@mzanzihomes/ui/components/alert-dialog';
import { PublishPaywallSheet } from '@mzanzihomes/features/billing';

// Import step components
import { PropertyTypeStep } from '@mzanzihomes/features/listing';
import { LocationStep } from '@mzanzihomes/features/listing';
import { DetailsStep } from '@mzanzihomes/features/listing';
import { PricingStep } from '@mzanzihomes/features/listing';
import { PhotosStep } from '@mzanzihomes/features/listing';
import { ReviewStep } from '@mzanzihomes/features/listing';
import { useExistingProperty } from '@mzanzihomes/features/listing';

import type { ListingFormData } from '@mzanzihomes/features/listing';

const DEFAULT_FORM_VALUES: ListingFormData = {
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
  images: []
};

const steps = [
  { id: 1, title: 'Property Type', icon: Home, description: 'What are you listing?' },
  { id: 2, title: 'Location', icon: MapPin, description: 'Where is your property?' },
  { id: 3, title: 'Details', icon: Settings, description: 'Property specifications' },
  { id: 4, title: 'Pricing', icon: RIcon, description: 'Set your price' },
  { id: 5, title: 'Photos', icon: Camera, description: 'Add beautiful photos' },
  { id: 6, title: 'Review', icon: CheckCircle, description: 'Review and publish' },
];

export default function ListProperty() {
  const { user, isLandlord } = useAuth();
  const { plan, planStatus } = useSubscription();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallPropertyId, setPaywallPropertyId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { propertyId, property: existingProperty } = useExistingProperty();

  const [showDraftPrompt, setShowDraftPrompt] = useState(false);

  const { control, handleSubmit, watch, setValue, reset, formState: { errors }, trigger } = useForm<ListingFormData>({
    defaultValues: DEFAULT_FORM_VALUES,
    mode: 'onChange'
  });

  const formData = watch();

  if (!user) {
    navigate('/auth');
    return null;
  }

  const LOCAL_STORAGE_KEY = 'listing_form_draft';
  const progress = (currentStep / steps.length) * 100;

  useEffect(() => {
    // Continuing a specific existing property (e.g. "Publish" on an unlisted
    // draft) takes priority over any unrelated leftover localStorage draft.
    if (propertyId) return;
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.currentStep) {
          // Clamp: a draft saved under an older step layout must not land
          // outside the current wizard's range (renders empty content).
          setCurrentStep(Math.min(Math.max(1, Number(parsed.currentStep) || 1), steps.length));
        }
        if (parsed.formData) {
          reset(parsed.formData);
        }
        // Only worth asking if there's actually progress to lose
        if (parsed.currentStep > 1 || parsed.formData?.property_type) {
          setShowDraftPrompt(true);
        }
      }
    } catch (error) {
      console.warn('Failed to restore draft listing', error);
    }
  }, [reset, propertyId]);

  const handleStartOver = () => {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch {}
    reset(DEFAULT_FORM_VALUES);
    setCurrentStep(1);
    setShowDraftPrompt(false);
  };

  useEffect(() => {
    if (!existingProperty) return;
    reset({
      property_type: existingProperty.property_type || '',
      location: existingProperty.location || '',
      description: existingProperty.description || '',
      bedrooms: existingProperty.bedrooms ?? undefined,
      bathrooms: existingProperty.bathrooms ?? undefined,
      parking_spaces: existingProperty.parking_spaces ?? undefined,
      size_sqm: existingProperty.size_sqm ?? undefined,
      furnished: !!existingProperty.furnished,
      pets_allowed: !!existingProperty.pets_allowed,
      amenities: existingProperty.amenities || [],
      price: existingProperty.price > 0 ? existingProperty.price : undefined,
      available_from: existingProperty.available_from ?? undefined,
      images: existingProperty.images || [],
    });
  }, [existingProperty, reset]);

  useEffect(() => {
    // Editing an existing property must not overwrite the new-listing draft
    // slot, or its data would leak into the next blank listing.
    if (propertyId) return;
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
  }, [formData, currentStep, propertyId]);

  const nextStep = async () => {
    let fieldsToValidate: (keyof ListingFormData)[] = [];
    
    switch (currentStep) {
      case 1:
        fieldsToValidate = ['property_type'];
        break;
      case 2:
        fieldsToValidate = ['location', 'description'];
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
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
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
          // Continue anyway - the RLS policy allows users without roles to create properties
        }
      }

      // Existing (already-uploaded) photos are URL strings; only upload the new File ones.
      const existingImageUrls = data.images.filter((img): img is string => typeof img === 'string');
      const newFiles = data.images.filter((img): img is File => img instanceof File);
      const uploadedUrls = newFiles.length > 0 ? await uploadImages(newFiles) : [];
      const imageUrls = [...existingImageUrls, ...uploadedUrls];

      // Keep price as the exact number without any conversion that could cause precision loss
      const propertyFields = {
        title: `${data.property_type} in ${data.location}`, // Generate title from property type and location
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
        images: imageUrls,
        amenities: data.amenities,
      };

      // Continuing an existing (e.g. previously-unlisted) property updates that
      // same row instead of inserting a duplicate; new properties are inserted
      // unlisted. Publishing happens below so the paywall can intercept it.
      // (.single() also errors on a 0-row update, so a deleted/foreign row
      // cannot show a false success.)
      const { data: newProperty, error } = propertyId
        ? await supabase
            .from('properties')
            .update(propertyFields)
            .eq('id', propertyId)
            .select('id')
            .single()
        : await supabase
            .from('properties')
            .insert({ ...propertyFields, landlord_id: user.id, is_listed: false })
            .select('id')
            .single();

      if (error) throw error;

      // Attempt to publish the newly created draft property
      const { error: publishErr } = await supabase
        .from('properties')
        .update({ is_listed: true })
        .eq('id', newProperty.id);
      if (publishErr) {
        if (publishErr.message?.includes('PUBLISH_PAYWALL')) {
          try {
            localStorage.removeItem(LOCAL_STORAGE_KEY);
          } catch {}
          setPaywallPropertyId(newProperty.id);
          setShowPaywall(true);
          return; // draft saved; success dialog is skipped
        }
        throw publishErr;
      }

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

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <PropertyTypeStep control={control} errors={errors} />;
      case 2:
        return <LocationStep control={control} errors={errors} watch={watch} setValue={setValue} />;
      case 3:
        return <DetailsStep control={control} errors={errors} setValue={setValue} watch={watch} trigger={trigger} />;
      case 4:
        return <PricingStep control={control} errors={errors} setValue={setValue} watch={watch} />;
      case 5:
        return <PhotosStep setValue={setValue} formData={formData} />;
      case 6:
        return <ReviewStep formData={formData} />;
      default:
        return null;
    }
  };

  const handlePublishClick = () => {
    const submitFn = handleSubmit(onSubmit);
    submitFn();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto p-6 max-w-4xl pb-32 md:pb-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-8">
          <Button variant="outline" onClick={() => navigate('/')} className="self-start">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-primary">List Your Property</h1>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-medium text-muted-foreground">
              Step {currentStep} of {steps.length}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          
          {/* Step indicators */}
          <div className="grid grid-cols-6 gap-1 mt-4">
            {steps.map((step) => {
              const IconComponent = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              
              return (
                <div
                  key={step.id}
                  className={`flex flex-col items-center space-y-2 flex-1 min-w-0 px-0.5 ${
                    isActive ? 'text-primary' : isCompleted ? 'text-green-600' : 'text-muted-foreground'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : isCompleted
                        ? 'bg-green-600 text-white'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <div className="text-center w-full">
                    <p className="text-[10px] sm:text-xs font-medium leading-tight break-words">{step.title}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <Card className="mb-8">
          <CardContent className="pt-6">
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

        {/* Resume-draft prompt */}
        <AlertDialog open={showDraftPrompt} onOpenChange={setShowDraftPrompt}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Continue where you left off?</AlertDialogTitle>
              <AlertDialogDescription>
                We saved your unfinished listing. You can pick up from where you
                stopped, or start over with a blank form.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleStartOver}>Start over</AlertDialogCancel>
              <AlertDialogAction onClick={() => setShowDraftPrompt(false)}>Continue draft</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Success Dialog */}
        <SuccessDialog
          open={showSuccessDialog}
          onClose={() => {
            setShowSuccessDialog(false);
            navigate('/enhancedlandlorddashboard');
          }}
          icon="home"
          title="Property Listed Successfully!"
          subtitle="Your property is now live on MzanziHomes and visible to potential tenants."
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

        {/* Publish Paywall */}
        <PublishPaywallSheet
          open={showPaywall}
          onOpenChange={(open) => {
            setShowPaywall(open);
            if (!open) {
              // Property is already saved as an unlisted draft; leave the wizard
              // so re-submitting can't create a duplicate.
              setPaywallPropertyId(null);
              navigate('/enhancedlandlorddashboard');
            }
          }}
          propertyId={paywallPropertyId}
        />
      </div>
    </div>
  );
}