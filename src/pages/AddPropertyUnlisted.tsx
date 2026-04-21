// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Home, MapPin, Camera, Settings, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SuccessDialog } from '@/components/ui/SuccessDialog';
import { MiniNavbar } from '@/components/ui/mini-navbar';
import PropertyTypeStep from '@/components/listing/PropertyTypeStep';
import LocationStep from '@/components/listing/LocationStep';
import DetailsStep from '@/components/listing/DetailsStep';
import PhotosStep from '@/components/listing/PhotosStep';
import ReviewStep from '@/components/listing/ReviewStep';
import type { ListingFormData } from '@/pages/ListProperty';

const steps = [
  { id: 1, title: 'Property Type', icon: Home, description: 'What are you adding?' },
  { id: 2, title: 'Location', icon: MapPin, description: 'Where is your property?' },
  { id: 3, title: 'Details', icon: Settings, description: 'Property specifications' },
  { id: 4, title: 'Photos', icon: Camera, description: 'Add photos (optional)' },
  { id: 5, title: 'Review', icon: CheckCircle, description: 'Confirm and save' },
];

const LOCAL_STORAGE_KEY = 'add_unlisted_property_draft';

export default function AddPropertyUnlisted() {
  const { user, isLandlord } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const { control, handleSubmit, watch, setValue, reset, formState: { errors }, trigger } = useForm<ListingFormData>({
    defaultValues: {
      property_type: '',
      location: '',
      description: '',
      bedrooms: undefined,
      bathrooms: undefined,
      parking_spaces: undefined,
      furnished: false,
      pets_allowed: false,
      amenities: [],
      price: 0,
      images: [],
    },
    mode: 'onChange',
  });

  const formData = watch();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.currentStep) setCurrentStep(parsed.currentStep);
        if (parsed.formData) reset(parsed.formData);
      }
    } catch (error) {
      console.warn('Failed to restore unlisted property draft', error);
    }
  }, [reset]);

  useEffect(() => {
    try {
      localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify({ currentStep, formData: { ...formData, images: [] } })
      );
    } catch (error) {
      console.warn('Failed to persist unlisted property draft', error);
    }
  }, [formData, currentStep]);

  if (!user) return null;

  const progress = (currentStep / steps.length) * 100;

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
      default:
        break;
    }

    const isValid = fieldsToValidate.length > 0 ? await trigger(fieldsToValidate) : true;

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
      const ext = image.name.split('.').pop();
      const filePath = `${user.id}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('property-images')
        .upload(filePath, image);

      if (uploadError) throw uploadError;

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
      if (!isLandlord) {
        const { error: roleError } = await supabase.rpc('promote_to_landlord');
        if (roleError) {
          console.error('Error promoting to landlord:', roleError);
        }
      }

      const imageUrls = data.images && data.images.length > 0 ? await uploadImages(data.images) : [];

      const { data: inserted, error } = await supabase
        .from('properties')
        .insert({
          title: `${data.property_type} in ${data.location}`,
          description: data.description,
          location: data.location,
          property_type: data.property_type,
          price: 0,
          bedrooms: Number(data.bedrooms) || 1,
          bathrooms: Number(data.bathrooms) || 1,
          parking_spaces: Number(data.parking_spaces) || 0,
          size_sqm: data.size_sqm ? Number(data.size_sqm) : null,
          furnished: data.furnished,
          pets_allowed: data.pets_allowed,
          amenities: data.amenities,
          landlord_id: user.id,
          images: imageUrls,
          status: 'available',
        })
        .select('id')
        .single();

      if (error) throw error;

      // Mark as unlisted in a separate update so PostgREST schema cache
      // issues with the new is_listed column don't block the insert.
      const { error: updateError } = await supabase
        .from('properties')
        .update({ is_listed: false })
        .eq('id', inserted.id);

      if (updateError) {
        console.warn('Could not mark property as unlisted:', updateError.message);
      }

      try { localStorage.removeItem(LOCAL_STORAGE_KEY); } catch {}

      setShowSuccessDialog(true);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error saving property',
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <PropertyTypeStep control={control} errors={errors} />;
      case 2:
        return <LocationStep control={control} errors={errors} />;
      case 3:
        return <DetailsStep control={control} errors={errors} setValue={setValue} watch={watch} />;
      case 4:
        return <PhotosStep setValue={setValue} formData={formData} />;
      case 5:
        return <ReviewStep formData={formData} />;
      default:
        return null;
    }
  };

  const handleSaveClick = () => {
    handleSubmit(onSubmit)();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <MiniNavbar />

      <div className="container mx-auto p-6 max-w-4xl pt-28 sm:pt-24 pb-24">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-primary">Add Your Property</h1>
            <p className="text-muted-foreground">
              This property won't appear in public search. You can publish it later.
            </p>
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

          {/* Step pills — horizontal scroll on small screens */}
          <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
            {steps.map((step) => {
              const IconComponent = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;

              return (
                <div
                  key={step.id}
                  className={`flex flex-col items-center space-y-1 min-w-[72px] ${
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
              {(() => {
                const IconComponent = steps[currentStep - 1]?.icon;
                return IconComponent ? <IconComponent className="h-5 w-5" /> : null;
              })()}
              {steps[currentStep - 1]?.title}
            </CardTitle>
            <CardDescription>{steps[currentStep - 1]?.description}</CardDescription>
          </CardHeader>
          <CardContent>{renderStep()}</CardContent>
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
              onClick={handleSaveClick}
              disabled={isSubmitting}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isSubmitting ? 'Saving...' : 'Save Property'}
              <CheckCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Success Dialog */}
      <SuccessDialog
        open={showSuccessDialog}
        onClose={() => {
          setShowSuccessDialog(false);
          navigate('/enhancedlandlorddashboard');
        }}
        icon="check"
        title="Property Added!"
        subtitle="Your property has been saved privately."
        nextSteps={[
          { title: "Manage", description: "Use all management tools privately" },
        ]}
        primaryAction={{
          label: "Go to Dashboard",
          onClick: () => {
            setShowSuccessDialog(false);
            navigate('/enhancedlandlorddashboard');
          },
        }}
        showConfetti={true}
      />
    </div>
  );
}
