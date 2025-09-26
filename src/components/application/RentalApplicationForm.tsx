import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useApplicationForm } from '@/hooks/useApplicationForm';
import { useApplicationSubmission } from '@/hooks/useApplicationSubmission';
import { useExistingApplication } from '@/hooks/useExistingApplication';
import { PersonalInfoSection } from './PersonalInfoSection';
import { EmploymentInfoSection } from './EmploymentInfoSection';
import { ResidenceInfoSection } from './ResidenceInfoSection';
import { AdditionalInfoSection } from './AdditionalInfoSection';
import { ApplicationStatusCard } from './ApplicationStatusCard';
import { ARIA_LABELS } from '@/constants/applicationConstants';

interface RentalApplicationFormProps {
  propertyId: string;
  landlordId: string;
  inviteId?: string;
  onSubmissionComplete?: () => void;
}

/**
 * Main rental application form component
 * Handles form state, validation, and submission with proper error handling
 */

export const RentalApplicationForm = ({ 
  propertyId, 
  landlordId, 
  inviteId, 
  onSubmissionComplete 
}: RentalApplicationFormProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Custom hooks for form state and business logic
  const { formData, updateField, resetForm, validateForm } = useApplicationForm();
  const { submitting, submitApplication } = useApplicationSubmission({
    propertyId,
    landlordId,
    inviteId,
    onSubmissionComplete
  });
  const { 
    existingApplication, 
    loading, 
    shouldShowApplicationForm 
  } = useExistingApplication(user?.id, propertyId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !validateForm()) return;

    // Reset form on successful submission
    await submitApplication(formData, user);
    resetForm();
  };

  const handleDashboardNavigation = () => {
    navigate('/tenant-dashboard');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show status card if application exists and shouldn't show form
  if (!shouldShowApplicationForm() && existingApplication) {
    return (
      <ApplicationStatusCard 
        status={existingApplication.status}
        onDashboardClick={handleDashboardNavigation}
      />
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
        <form onSubmit={handleSubmit} className="space-y-8" role="form" aria-label={ARIA_LABELS.FORM_SECTION}>
          <PersonalInfoSection formData={formData} onFieldChange={updateField} />
          
          <Separator />
          
          <EmploymentInfoSection formData={formData} onFieldChange={updateField} />
          
          <Separator />
          
          <ResidenceInfoSection formData={formData} onFieldChange={updateField} />
          
          <Separator />
          
          <AdditionalInfoSection formData={formData} onFieldChange={updateField} />
          
          <div className="flex justify-end pt-4">
            <Button 
              type="submit" 
              disabled={submitting}
              aria-label={ARIA_LABELS.SUBMIT_BUTTON}
              size="lg"
            >
              {submitting ? 'Submitting...' : 'Submit Application'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};