// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ArrowLeft, ArrowRight, Home, MapPin, Camera, Settings, CheckCircle, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SuccessDialog } from '@/components/ui/SuccessDialog';

// Import step components from the rental listing
import PropertyTypeStep from '@/components/listing/PropertyTypeStep';
import LocationStep from '@/components/listing/LocationStep';
import DetailsStep from '@/components/listing/DetailsStep';
import PricingStep from '@/components/listing/PricingStep';
import PhotosStep from '@/components/listing/PhotosStep';
import ReviewStep from '@/components/listing/ReviewStep';

// Simple R icon for South African Rand
const RIcon = ({ className }: { className?: string }) => (
  <div className={`${className} flex items-center justify-center font-bold text-lg`}>
    R
  </div>
);

interface Agent {
  user_id: string;
  display_name: string;
  email: string;
  mobile: string | null;
}

export interface SaleListingFormData {
  property_type: string;
  location: string;
  description: string;
  bedrooms: number;
  bathrooms: number;
  parking_spaces: number;
  size_sqm?: number;
  furnished: boolean;
  pets_allowed: boolean;
  amenities: string[];
  price: number;
  images: File[];
  agent_id: string;
}

const steps = [
  { id: 1, title: 'Property Type', icon: Home, description: 'What are you selling?' },
  { id: 2, title: 'Location', icon: MapPin, description: 'Where is your property?' },
  { id: 3, title: 'Details', icon: Settings, description: 'Property specifications' },
  { id: 4, title: 'Pricing', icon: RIcon, description: 'Set your sale price' },
  { id: 5, title: 'Photos', icon: Camera, description: 'Add beautiful photos' },
  { id: 6, title: 'Agent', icon: User, description: 'Assign an agent' },
  { id: 7, title: 'Review', icon: CheckCircle, description: 'Review and publish' },
];

export default function ListPropertyForSale() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agencyId, setAgencyId] = useState<string | null>(null);

  const { control, handleSubmit, watch, setValue, reset, formState: { errors }, trigger } = useForm<SaleListingFormData>({
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
      price: undefined,
      images: [],
      agent_id: '',
    },
    mode: 'onChange'
  });

  const formData = watch();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchAgencyAndAgents();
  }, [user]);

  const fetchAgencyAndAgents = async () => {
    if (!user) return;

    try {
      // Get user's agency
      const { data: membership, error: memberError } = await supabase
        .from('agency_members')
        .select('agency_id, role')
        .eq('user_id', user.id)
        .eq('role', 'agency_admin')
        .single();

      if (memberError || !membership) {
        toast({
          variant: 'destructive',
          title: 'Access denied',
          description: 'You need to be an agency admin to list properties for sale.',
        });
        navigate('/agency/dashboard');
        return;
      }

      setAgencyId(membership.agency_id);

      // Get agents for this agency
      const { data: agentProfiles, error: agentError } = await supabase
        .from('agent_profiles')
        .select('user_id, display_name, email, mobile')
        .eq('agency_id', membership.agency_id)
        .eq('status', 'active');

      if (agentError) throw agentError;
      setAgents(agentProfiles || []);
    } catch (error: any) {
      console.error('Error fetching agency data:', error);
    }
  };

  const progress = (currentStep / steps.length) * 100;

  const nextStep = async () => {
    let fieldsToValidate: (keyof SaleListingFormData)[] = [];
    
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

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('property-images')
        .getPublicUrl(filePath);

      uploadedUrls.push(data.publicUrl);
    }

    return uploadedUrls;
  };

  const onSubmit = async (data: SaleListingFormData) => {
    if (!agencyId) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Agency not found.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload images
      const imageUrls = data.images.length > 0 ? await uploadImages(data.images) : [];

      // Insert property as sale listing
      const { error } = await supabase
        .from('properties')
        .insert({
          title: `${data.property_type} for Sale in ${data.location}`,
          description: data.description,
          location: data.location,
          property_type: data.property_type,
          price: data.price,
          bedrooms: Number(data.bedrooms) || 1,
          bathrooms: Number(data.bathrooms) || 1,
          parking_spaces: Number(data.parking_spaces) || 0,
          size_sqm: data.size_sqm ? Number(data.size_sqm) : null,
          furnished: data.furnished,
          pets_allowed: data.pets_allowed,
          landlord_id: user.id,
          images: imageUrls,
          amenities: data.amenities,
          listing_type: 'sale',
          agent_id: data.agent_id || null,
          agency_id: agencyId,
        });

      if (error) throw error;

      setShowSuccessDialog(true);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error listing property',
        description: error.message,
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
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">
              Set the sale price for your property (not monthly rent).
            </p>
            <PricingStep control={control} errors={errors} setValue={setValue} />
          </div>
        );
      case 5:
        return <PhotosStep setValue={setValue} formData={formData} />;
      case 6:
        return (
          <div className="space-y-4">
            <Label>Assign Agent</Label>
            <Select
              value={formData.agent_id}
              onValueChange={(value) => setValue('agent_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an agent (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No agent assigned</SelectItem>
                {agents.map((agent) => (
                  <SelectItem key={agent.user_id} value={agent.user_id}>
                    {agent.display_name} ({agent.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Assign an agent to handle enquiries for this property. The agent's contact info will be displayed to potential buyers.
            </p>
            {agents.length === 0 && (
              <p className="text-sm text-warning-foreground bg-warning/10 p-3 rounded-lg">
                No agents found. Add agents in your agency dashboard first.
              </p>
            )}
          </div>
        );
      case 7:
        return (
          <div className="space-y-4">
            <ReviewStep formData={formData} />
            {formData.agent_id && (
              <div className="p-4 bg-ocean-blue/10 rounded-lg">
                <p className="font-medium">Assigned Agent:</p>
                <p className="text-muted-foreground">
                  {agents.find(a => a.user_id === formData.agent_id)?.display_name || 'Unknown'}
                </p>
              </div>
            )}
            <div className="p-4 bg-success-green/10 rounded-lg">
              <p className="font-medium text-success-green-dark">Listing Type: For Sale</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto p-6 max-w-4xl pb-32 md:pb-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" onClick={() => navigate('/agency/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-primary">List Property for Sale</h1>
            <p className="text-muted-foreground">Create a sale listing for your agency</p>
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
          
          {/* Step indicators - simplified for 7 steps */}
          <div className="flex justify-between mt-4 overflow-x-auto">
            {steps.map((step) => {
              const IconComponent = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              
              return (
                <div
                  key={step.id}
                  className={`flex flex-col items-center space-y-2 min-w-[60px] ${
                    isActive ? 'text-primary' : isCompleted ? 'text-green-600' : 'text-muted-foreground'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : isCompleted
                        ? 'bg-green-600 text-white'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <IconComponent className="h-4 w-4" />
                  </div>
                  <p className="text-xs font-medium text-center">{step.title}</p>
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
              className="flex items-center gap-2 bg-success-green hover:bg-success-green-dark"
            >
              {isSubmitting ? 'Publishing...' : 'Publish for Sale'}
              <CheckCircle className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Success Dialog */}
        <SuccessDialog
          open={showSuccessDialog}
          onClose={() => {
            setShowSuccessDialog(false);
            navigate('/agency/dashboard');
          }}
          icon="home"
          title="Property Listed for Sale!"
          subtitle="Your property is now live on RentLekker and visible to potential buyers."
          nextSteps={[
            { title: "Wait for enquiries", description: "Buyers can now view and enquire about your property" },
            { title: "Manage viewings", description: "Schedule property viewings with interested buyers" },
            { title: "Close the deal", description: "Work with your agent to finalize the sale" }
          ]}
          primaryAction={{
            label: "View Agency Dashboard",
            onClick: () => {
              setShowSuccessDialog(false);
              navigate('/agency/dashboard');
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
