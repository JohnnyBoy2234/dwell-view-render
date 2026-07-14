// @ts-nocheck
import React, { useEffect, useRef, useState } from 'react';
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
import { useListingDraft, SaveStatusIndicator, deriveResumeStep } from '@mzanzihomes/features/listing';
import { composeLocation, buildPublishChecklist, MIN_PHOTOS } from '@mzanzihomes/features/listing';
import { useQuery, useQueryClient } from '@tanstack/react-query';

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
  images: [],
  street_address: '',
  suburb: '',
  city: '',
  province: '',
  postal_code: '',
  bathrooms_confirmed: false,
  ai_key_features: '',
};

// Form → properties-row mapping used for autosave and publish.
const toRow = (d) => ({
  property_type: d.property_type || '',
  street_address: d.street_address?.trim() || null,
  suburb: d.suburb?.trim() || null,
  city: d.city?.trim() || null,
  province: d.province || null,
  postal_code: d.postal_code?.trim() || null,
  location: composeLocation(d),
  title: d.property_type ? `${d.property_type} in ${d.suburb || d.city || composeLocation(d) || 'South Africa'}` : '',
  description: d.description || '',
  bedrooms: Number(d.bedrooms) || 0,
  bathrooms: Number(d.bathrooms) || 0,
  parking_spaces: Number(d.parking_spaces) || 0,
  size_sqm: d.size_sqm ? Number(d.size_sqm) : null,
  furnished: !!d.furnished,
  pets_allowed: !!d.pets_allowed,
  amenities: d.amenities || [],
  price: Number(d.price) || 0,
  available_from: d.available_from || null,
  images: (d.images || []).filter((i) => typeof i === 'string'),
});

// properties row → form values, used by existing-property load and resume.
const rowToForm = (p) => ({
  property_type: p.property_type || '',
  location: p.location || '',
  description: p.description || '',
  bedrooms: p.bedrooms ?? undefined,
  bathrooms: p.bathrooms > 0 ? p.bathrooms : undefined,
  parking_spaces: p.parking_spaces ?? undefined,
  size_sqm: p.size_sqm ?? undefined,
  furnished: !!p.furnished,
  pets_allowed: !!p.pets_allowed,
  amenities: p.amenities || [],
  price: p.price > 0 ? p.price : undefined,
  available_from: p.available_from ?? undefined,
  images: p.images || [],
  street_address: p.street_address || '',
  suburb: p.suburb || '',
  city: p.city || '',
  province: p.province || '',
  postal_code: p.postal_code || '',
  bathrooms_confirmed: false,
});

const stageLabel = {
  verifying: 'Verifying information…',
  finalising: 'Finalising listing…',
  publishing: 'Publishing to MzanziHomes…',
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
  const [publishStage, setPublishStage] = useState<'verifying' | 'finalising' | 'publishing' | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallPropertyId, setPaywallPropertyId] = useState<string | null>(null);
  const [returnToReview, setReturnToReview] = useState(false);
  const [declarationChecked, setDeclarationChecked] = useState(false);
  // Synchronous re-entrancy guard: handleSubmit runs async validation before
  // onSubmit sets publishStage, so the button's disabled state alone leaves a
  // window where a double-click/Enter-repeat could fire onSubmit twice.
  const submittingRef = useRef(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { propertyId, property: existingProperty } = useExistingProperty();
  const draft = useListingDraft({ userId: user?.id, existingPropertyId: propertyId });

  const queryClient = useQueryClient();
  const { data: profile } = useQuery({
    queryKey: ['listing-profile-phone', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('phone').eq('user_id', user!.id).maybeSingle();
      return data;
    },
  });
  const [savingPhone, setSavingPhone] = useState(false);
  const savePhone = async (phone: string) => {
    setSavingPhone(true);
    try {
      await supabase.from('profiles').update({ phone }).eq('user_id', user!.id);
      await queryClient.invalidateQueries({ queryKey: ['listing-profile-phone', user!.id] });
    } finally {
      setSavingPhone(false);
    }
  };

  const { control, handleSubmit, watch, setValue, reset, formState: { errors }, trigger } = useForm<ListingFormData>({
    defaultValues: DEFAULT_FORM_VALUES,
    mode: 'onChange'
  });

  const formData = watch();

  // Rewrite the description on the Review step using everything we know by
  // then — final details, amenities, price, landlord highlights and up to 6
  // uploaded photos (the model can see them).
  const [regenerating, setRegenerating] = useState(false);
  const regenerateDescription = async () => {
    const v = watch();
    setRegenerating(true);
    try {
      const image_urls = (v.images || []).filter((i) => typeof i === 'string').slice(0, 6);
      const { data, error } = await supabase.functions.invoke('generate-property-description', {
        body: {
          property_type: v.property_type,
          location: composeLocation(v) || v.location,
          bedrooms: v.bedrooms,
          bathrooms: v.bathrooms,
          parking_spaces: v.parking_spaces,
          furnished: v.furnished,
          pets_allowed: v.pets_allowed,
          amenities: v.amenities,
          price: v.price,
          listing_type: 'rent',
          key_features: v.ai_key_features,
          image_urls,
        },
      });
      if (error) throw error;
      if (!data?.description) throw new Error(data?.error || 'No description was returned.');
      setValue('description', data.description, { shouldValidate: true, shouldDirty: true });
      toast({ title: 'Description rewritten ✨', description: 'Based on your details and photos. Tweak it if you like.' });
    } catch (e) {
      toast({ title: 'Could not generate', description: e?.message || 'Please try again in a moment.', variant: 'destructive' });
    } finally {
      setRegenerating(false);
    }
  };

  if (!user) {
    navigate('/auth');
    return null;
  }

  const progress = (currentStep / steps.length) * 100;
  const checklist = buildPublishChecklist(formData, profile?.phone ?? null);

  // Clear the legacy localStorage draft slot once — server drafts replace it.
  useEffect(() => {
    try {
      localStorage.removeItem('listing_form_draft');
    } catch {}
  }, []);

  const handleStartOver = () => {
    reset(DEFAULT_FORM_VALUES);
    setCurrentStep(1);
    draft.dismissResume();
  };

  useEffect(() => {
    if (!existingProperty) return;
    reset(rowToForm(existingProperty));
  }, [existingProperty, reset]);

  // Autosave: debounced by the hook, only once a draft row exists.
  // Edits still pending in the debounce window are flushed by the hook on unmount.
  useEffect(() => {
    const sub = watch((value) => {
      if (draft.draftId) draft.save(toRow(value));
    });
    return () => sub.unsubscribe();
  }, [watch, draft.draftId, draft.save]);

  // Persist the current step position per draft, so a resume lands correctly.
  useEffect(() => {
    if (draft.draftId) {
      try { localStorage.setItem(`listing_step_${draft.draftId}`, String(currentStep)); } catch {}
    }
  }, [currentStep, draft.draftId]);

  const handleResume = () => {
    const row = draft.resumeDraft;
    draft.adoptDraft(row);
    reset(rowToForm(row));
    const stored = Number(localStorage.getItem(`listing_step_${row.id}`) || 0);
    // Land on the furthest of data-completeness (deriveResumeStep) vs the
    // last-visited step, clamped to the wizard's range.
    setCurrentStep(Math.min(Math.max(deriveResumeStep(row), stored || 1), steps.length));
  };

  const nextStep = async () => {
    let fieldsToValidate: (keyof ListingFormData)[] = [];

    switch (currentStep) {
      case 1:
        fieldsToValidate = ['property_type'];
        break;
      case 2:
        fieldsToValidate = ['suburb', 'city', 'province', 'postal_code', 'description'];
        break;
      case 3:
        fieldsToValidate = ['bedrooms', 'bathrooms'];
        break;
      case 4:
        fieldsToValidate = ['price'];
        break;
    }

    const isValid = await trigger(fieldsToValidate);
    if (!isValid) return;

    if (currentStep === 1) {
      const id = await draft.ensureDraft(toRow(watch()));
      if (!id) {
        toast({
          variant: 'destructive',
          title: "Couldn't save your draft",
          description: 'Please check your connection and try again.',
        });
        return;
      }
    } else {
      draft.save(toRow(watch()));
    }

    if (returnToReview && currentStep < steps.length) {
      setReturnToReview(false);
      setCurrentStep(steps.length);
    } else if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const editFromReview = (step: number) => {
    setReturnToReview(true);
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const onSubmit = async (data: ListingFormData) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    if (!declarationChecked || checklist.blockers.length > 0) {
      submittingRef.current = false;
      return;
    }
    setPublishStage('verifying');

    try {
      // Ensure user has landlord role before creating property
      if (!isLandlord) {
        const { error: roleError } = await supabase.rpc('promote_to_landlord');
        if (roleError) {
          console.error('Error promoting to landlord:', roleError);
          // Continue anyway - the RLS policy allows users without roles to create properties
        }
      }

      const row = toRow(data);
      if (row.images.length < MIN_PHOTOS) {
        // userFacing marks messages written for the landlord; anything else
        // (raw Postgres/Supabase text) gets a friendly fallback in the catch.
        throw Object.assign(new Error(`Add at least ${MIN_PHOTOS} photos before publishing.`), { userFacing: true });
      }

      setPublishStage('finalising');
      let id = draft.draftId;
      if (id) {
        const { error } = await supabase.from('properties').update(row).eq('id', id);
        if (error) throw error;
      } else {
        const { data: created, error } = await supabase
          .from('properties')
          .insert({ ...row, landlord_id: user.id, is_listed: false })
          .select('id')
          .single();
        if (error) throw error;
        id = created.id;
      }

      setPublishStage('publishing');
      const { error: publishErr } = await supabase.from('properties').update({ is_listed: true }).eq('id', id);
      if (publishErr) {
        if (publishErr.message?.includes('PUBLISH_PAYWALL')) {
          setPaywallPropertyId(id);
          setShowPaywall(true);
          return; // draft saved; success dialog is skipped
        }
        throw publishErr;
      }

      try { localStorage.removeItem(`listing_step_${id}`); } catch {}
      setShowSuccessDialog(true);
    } catch (error: any) {
      console.error('Error listing property:', error);
      toast({
        variant: "destructive",
        title: "Error listing property",
        description: error?.userFacing
          ? error.message
          : 'Something went wrong while publishing. Please try again.'
      });
    } finally {
      submittingRef.current = false;
      setPublishStage(null);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <PropertyTypeStep control={control} errors={errors} />;
      case 2:
        return <LocationStep control={control} errors={errors} watch={watch} setValue={setValue} structuredAddress />;
      case 3:
        return <DetailsStep control={control} errors={errors} setValue={setValue} watch={watch} trigger={trigger} />;
      case 4:
        return <PricingStep control={control} errors={errors} setValue={setValue} watch={watch} />;
      case 5:
        return (
          <PhotosStep
            setValue={setValue}
            formData={formData}
            upload={{ userId: user.id, onSaved: (urls) => { if (draft.draftId) draft.save({ images: urls }); } }}
          />
        );
      case 6:
        return (
          <ReviewStep
            formData={formData}
            onEdit={editFromReview}
            checklist={checklist}
            declaration={{ checked: declarationChecked, onChange: setDeclarationChecked }}
            contact={{ phone: profile?.phone ?? null, saving: savingPhone, onSavePhone: savePhone }}
            regenerate={{ onRegenerate: regenerateDescription, generating: regenerating }}
          />
        );
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
          <Button variant="outline" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))} className="self-start">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-primary">List Your Property</h1>
            <SaveStatusIndicator state={draft.saveState} lastSavedAt={draft.lastSavedAt} />
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
              disabled={publishStage !== null || !declarationChecked || checklist.blockers.length > 0}
              className="flex items-center gap-2"
            >
              {publishStage ? stageLabel[publishStage] : 'Publish Property'}
              <CheckCircle className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Resume-draft prompt */}
        <AlertDialog open={!!draft.resumeDraft} onOpenChange={(o) => { if (!o) draft.dismissResume(); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Continue where you left off?</AlertDialogTitle>
              <AlertDialogDescription>
                You have an unfinished {draft.resumeDraft?.property_type || 'property'} listing
                {draft.resumeDraft?.suburb ? ` in ${draft.resumeDraft.suburb}` : ''}. Pick up where you
                stopped, or start a new listing — your draft stays saved either way.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={draft.dismissResume}>Start a new listing</AlertDialogCancel>
              <AlertDialogAction onClick={handleResume}>Continue where you left off</AlertDialogAction>
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