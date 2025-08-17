import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Separator } from '@/components/ui/separator';

interface RentalApplicationFormProps {
  propertyId: string;
  landlordId: string;
  inviteId?: string;
  onSubmissionComplete?: () => void;
}

interface FormData {
  // Personal Information
  first_name: string;
  middle_name: string;
  last_name: string;
  id_number: string;
  phone: string;
  
  // Employment Information
  employment_status: string;
  job_title: string;
  company_name: string;
  net_monthly_income: string;
  
  // Residence Information
  current_address: string;
  reason_for_moving: string;
  previous_landlord_name: string;
  previous_landlord_contact: string;
  
  // Additional Information
  has_pets: boolean;
  pet_details: string;
  screening_consent: boolean;
}

export const RentalApplicationForm = ({ propertyId, landlordId, inviteId, onSubmissionComplete }: RentalApplicationFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    first_name: '',
    middle_name: '',
    last_name: '',
    id_number: '',
    phone: '',
    employment_status: '',
    job_title: '',
    company_name: '',
    net_monthly_income: '',
    current_address: '',
    reason_for_moving: '',
    previous_landlord_name: '',
    previous_landlord_contact: '',
    has_pets: false,
    pet_details: '',
    screening_consent: false
  });

  const [existingApplication, setExistingApplication] = useState<any>(null);

  useEffect(() => {
    if (user) {
      loadExistingData();
    }
  }, [user, propertyId]);

  const loadExistingData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Check for existing application
      const { data: application } = await supabase
        .from('applications')
        .select('*')
        .eq('tenant_id', user.id)
        .eq('property_id', propertyId)
        .maybeSingle();

      if (application) {
        setExistingApplication(application);
        
        // If application exists and is not in draft state, prevent submission
        if (application.status !== 'invited') {
          return;
        }
      }

      // Load existing screening profile data
      const { data: profile } = await supabase
        .from('screening_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile) {
        setFormData(prev => ({
          ...prev,
          first_name: profile.first_name || '',
          middle_name: profile.middle_name || '',
          last_name: profile.last_name || '',
          has_pets: profile.has_pets || false,
          pet_details: profile.pet_details || '',
          screening_consent: profile.screening_consent || false
        }));
      }

      // Load existing screening details
      const { data: details } = await supabase
        .from('screening_details')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (details) {
        setFormData(prev => ({
          ...prev,
          id_number: details.id_number || '',
          phone: details.phone || '',
          employment_status: details.employment_status || '',
          job_title: details.job_title || '',
          company_name: details.company_name || '',
          net_monthly_income: details.net_monthly_income?.toString() || '',
          current_address: details.current_address || '',
          reason_for_moving: details.reason_for_moving || '',
          previous_landlord_name: details.previous_landlord_name || '',
          previous_landlord_contact: details.previous_landlord_contact || ''
        }));
      }
    } catch (error) {
      console.error('Error loading existing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    const requiredFields = [
      'first_name', 'last_name', 'id_number', 'phone', 
      'employment_status', 'current_address', 'screening_consent'
    ];
    
    for (const field of requiredFields) {
      if (!formData[field as keyof FormData]) {
        toast({
          title: "Validation Error",
          description: `Please fill in all required fields.`,
          variant: "destructive"
        });
        return false;
      }
    }

    if (!formData.screening_consent) {
      toast({
        title: "Consent Required",
        description: "You must consent to the screening process to submit your application.",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !validateForm()) return;

    // Check if application already exists and is submitted
    if (existingApplication && existingApplication.status !== 'invited') {
      toast({
        title: "Application Already Submitted",
        description: "You have already submitted an application for this property.",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    
    try {
      // Save/update screening profile
      const { error: profileError } = await supabase
        .from('screening_profiles')
        .upsert([
          {
            user_id: user.id,
            first_name: formData.first_name,
            middle_name: formData.middle_name,
            last_name: formData.last_name,
            has_pets: formData.has_pets,
            pet_details: formData.pet_details,
            screening_consent: formData.screening_consent,
            screening_consent_date: new Date().toISOString(),
            is_complete: true,
            updated_at: new Date().toISOString()
          }
        ], { onConflict: 'user_id' });

      if (profileError) throw profileError;

      // Save/update screening details with upsert on user_id
      const { error: detailsError } = await supabase
        .from('screening_details')
        .upsert([
          {
            user_id: user.id,
            full_name: `${formData.first_name} ${formData.last_name}`,
            id_number: formData.id_number,
            phone: formData.phone,
            employment_status: formData.employment_status,
            job_title: formData.job_title,
            company_name: formData.company_name,
            net_monthly_income: parseFloat(formData.net_monthly_income) || null,
            current_address: formData.current_address,
            reason_for_moving: formData.reason_for_moving,
            previous_landlord_name: formData.previous_landlord_name,
            previous_landlord_contact: formData.previous_landlord_contact,
            consent_given: formData.screening_consent,
            updated_at: new Date().toISOString()
          }
        ], { onConflict: 'user_id' });

      if (detailsError) throw detailsError;

      // Mark tenant as screened
      await supabase
        .from('profiles')
        .update({ is_tenant_screened: true })
        .eq('user_id', user.id);

      // Create or update application
      const applicationData = {
        tenant_id: user.id,
        landlord_id: landlordId,
        property_id: propertyId,
        status: 'submitted'
      };

      let applicationResult;
      if (existingApplication) {
        applicationResult = await supabase
          .from('applications')
          .update({ ...applicationData, updated_at: new Date().toISOString() })
          .eq('id', existingApplication.id)
          .select()
          .single();
      } else {
        applicationResult = await supabase
          .from('applications')
          .insert(applicationData)
          .select()
          .single();
      }

      if (applicationResult.error) throw applicationResult.error;

      // Mark invite as used if provided
      if (inviteId) {
        await supabase
          .from('application_invites')
          .update({ status: 'used', used_at: new Date().toISOString() })
          .eq('id', inviteId);
      }

      // Trigger credit check (this would be implemented as an edge function)
      try {
        await supabase.functions.invoke('trigger-credit-check', {
          body: { 
            application_id: applicationResult.data.id,
            tenant_id: user.id 
          }
        });
      } catch (creditCheckError) {
        console.warn('Credit check trigger failed:', creditCheckError);
        // Continue with success flow even if credit check fails to start
      }

      toast({
        title: "Application Submitted",
        description: "Your rental application has been submitted successfully. A credit check will be performed.",
      });

      if (onSubmissionComplete) {
        onSubmissionComplete();
      } else {
        navigate('/tenant-dashboard');
      }

    } catch (error: any) {
      console.error('Error submitting application:', error);
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit application. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If application exists and is not in invited state, show status
  if (existingApplication && existingApplication.status !== 'invited') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Application Status</CardTitle>
          <CardDescription>Your application for this property</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-lg mb-2">Application already submitted</p>
            <p className="text-sm text-muted-foreground mb-4">
              Status: <span className="capitalize font-medium">{existingApplication.status}</span>
            </p>
            <Button variant="outline" onClick={() => navigate('/tenant-dashboard')}>
              Go to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Rental Application</CardTitle>
        <CardDescription>
          Please complete all sections to submit your application. All information will be verified.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="middle_name">Middle Name</Label>
                <Input
                  id="middle_name"
                  value={formData.middle_name}
                  onChange={(e) => handleInputChange('middle_name', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="id_number">ID Number *</Label>
                <Input
                  id="id_number"
                  value={formData.id_number}
                  onChange={(e) => handleInputChange('id_number', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Employment Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Employment Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="employment_status">Employment Status *</Label>
                <Select 
                  value={formData.employment_status} 
                  onValueChange={(value) => handleInputChange('employment_status', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employment status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employed">Employed</SelectItem>
                    <SelectItem value="self-employed">Self-Employed</SelectItem>
                    <SelectItem value="unemployed">Unemployed</SelectItem>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="retired">Retired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="net_monthly_income">Net Monthly Income (R)</Label>
                <Input
                  id="net_monthly_income"
                  type="number"
                  value={formData.net_monthly_income}
                  onChange={(e) => handleInputChange('net_monthly_income', e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="job_title">Job Title</Label>
                <Input
                  id="job_title"
                  value={formData.job_title}
                  onChange={(e) => handleInputChange('job_title', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="company_name">Company Name</Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => handleInputChange('company_name', e.target.value)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Residence Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Current Residence</h3>
            <div>
              <Label htmlFor="current_address">Current Address *</Label>
              <Textarea
                id="current_address"
                value={formData.current_address}
                onChange={(e) => handleInputChange('current_address', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="reason_for_moving">Reason for Moving</Label>
              <Textarea
                id="reason_for_moving"
                value={formData.reason_for_moving}
                onChange={(e) => handleInputChange('reason_for_moving', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="previous_landlord_name">Previous Landlord Name</Label>
                <Input
                  id="previous_landlord_name"
                  value={formData.previous_landlord_name}
                  onChange={(e) => handleInputChange('previous_landlord_name', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="previous_landlord_contact">Previous Landlord Contact</Label>
                <Input
                  id="previous_landlord_contact"
                  value={formData.previous_landlord_contact}
                  onChange={(e) => handleInputChange('previous_landlord_contact', e.target.value)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Additional Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Additional Information</h3>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="has_pets"
                checked={formData.has_pets}
                onCheckedChange={(checked) => handleInputChange('has_pets', checked as boolean)}
              />
              <Label htmlFor="has_pets">I have pets</Label>
            </div>
            {formData.has_pets && (
              <div>
                <Label htmlFor="pet_details">Pet Details</Label>
                <Textarea
                  id="pet_details"
                  value={formData.pet_details}
                  onChange={(e) => handleInputChange('pet_details', e.target.value)}
                  placeholder="Please describe your pets (type, breed, size, etc.)"
                />
              </div>
            )}
          </div>

          <Separator />

          {/* Consent */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Consent and Authorization</h3>
            <div className="flex items-start space-x-2">
              <Checkbox
                id="screening_consent"
                checked={formData.screening_consent}
                onCheckedChange={(checked) => handleInputChange('screening_consent', checked as boolean)}
              />
              <Label htmlFor="screening_consent" className="text-sm leading-relaxed">
                I hereby authorize the landlord and their agents to conduct a credit check, verify my employment, 
                contact previous landlords, and perform any other screening deemed necessary for this rental application. 
                I understand that this information will be used to evaluate my application. *
              </Label>
            </div>
          </div>

          <div className="flex gap-4 pt-6">
            <Button
              type="submit"
              disabled={submitting || !formData.screening_consent}
              className="flex-1"
            >
              {submitting ? 'Submitting...' : 'Submit Application'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/tenant-dashboard')}
              disabled={submitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};