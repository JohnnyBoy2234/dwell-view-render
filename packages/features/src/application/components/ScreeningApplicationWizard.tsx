import { useCallback, useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import { Button } from '@mzanzihomes/ui/components/button';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';
import { useAuth } from '@mzanzihomes/supabase/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@mzanzihomes/supabase/client';
import { SuccessDialog } from '@mzanzihomes/ui/components/SuccessDialog';
import { AlertCircle, Check, Loader2 } from 'lucide-react';
import { completionPercentage } from '../services/draftService';
import { deleteDraft } from '../services/draftService';
import { submitApplication } from '../services/submitService';
import { useApplicationDraft } from '../hooks/useApplicationDraft';
import { emptyFormData, mergeDraft, type ApplicationFormData, type SectionKey } from '../types';
import { validateSection, type FieldErrors } from '../validation';
import { WelcomeBack } from './WelcomeBack';
import { PersonalStep } from './steps/PersonalStep';
import { IdentityStep } from './steps/IdentityStep';
import { AddressStep } from './steps/AddressStep';
import { CreditStep } from './steps/CreditStep';
import { EmploymentStep } from './steps/EmploymentStep';
import { HouseholdStep } from './steps/HouseholdStep';
import { RiskStep } from './steps/RiskStep';
import { ReviewStep } from './steps/ReviewStep';

export interface ScreeningApplicationWizardProps {
  propertyId: string;
  landlordId: string;
  inviteId?: string;
  onSubmissionComplete?: () => void;
}

// Raw Postgres/RLS errors are meaningless to a tenant ("new row violates
// row-level security policy for table applications"). Translate the ones
// worth explaining; anything else (e.g. a trigger's own raised message,
// which is already human-written) passes through unchanged.
export function friendlySubmitError(error: any): string {
  const message = typeof error?.message === 'string' ? error.message : '';
  const lower = message.toLowerCase();
  if (lower.includes('row-level security') || lower.includes('permission denied')) {
    return "You don't have permission to submit this application right now. Please try again, or contact the landlord if this keeps happening.";
  }
  if (lower.includes('duplicate key')) {
    return "You've already applied for this property.";
  }
  return message || 'Something went wrong submitting your application. Please try again.';
}

const steps: { key: string; title: string; section: SectionKey | null }[] = [
  { key: 'personal', title: 'Personal', section: 'personal' },
  { key: 'identity', title: 'Identity', section: 'identity' },
  { key: 'address', title: 'Address', section: 'address' },
  { key: 'credit', title: 'Credit', section: 'credit' },
  { key: 'employment', title: 'Employment', section: 'employment' },
  { key: 'household', title: 'Household', section: 'household' },
  { key: 'questions', title: 'Questions', section: 'risk' },
  { key: 'review', title: 'Review', section: null }
];

export function ScreeningApplicationWizard({ propertyId, landlordId, inviteId, onSubmissionComplete }: ScreeningApplicationWizardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [existingApplication, setExistingApplication] = useState<any>(null);
  const [formData, setFormData] = useState<ApplicationFormData>(emptyFormData());
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [confirmations, setConfirmationsState] = useState({ accurate: false, terms: false });
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [firstName, setFirstName] = useState<string | undefined>();
  const stepChipRefs = useRef<(HTMLDivElement | null)[]>([]);
  const initialised = useRef(false);

  const { draft, loaded, saveStatus, scheduleSave, saveNow, clearLocal } = useApplicationDraft({
    userId: user?.id,
    propertyId,
    landlordId,
    inviteId
  });

  // Keep the active step chip in view on mobile as the wizard advances
  useEffect(() => {
    stepChipRefs.current[currentStep]?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest'
    });
  }, [currentStep]);

  // Resolve entry state once auth + draft are known: existing application,
  // returning draft, or a fresh form prefilled from the reusable profile.
  useEffect(() => {
    if (!user || !loaded || initialised.current) return;
    initialised.current = true;

    (async () => {
      try {
        const { data: application } = await (supabase.from('applications') as any)
          .select('*')
          .eq('tenant_id', user.id)
          .eq('property_id', propertyId)
          .maybeSingle();

        if (application && application.status !== 'invited') {
          setExistingApplication(application);
          return;
        }

        if (draft) {
          setFormData(draft.formData);
          setCurrentStep(Math.min(Math.max(draft.currentStep, 0), steps.length - 1));
          setCompletedSteps(draft.completedSteps);
          setFirstName(draft.formData.personal.first_name || undefined);
          setShowWelcomeBack(draft.completedSteps.length > 0 || draft.currentStep > 0);
          return;
        }

        // No draft — prefill what we can from the reusable tenant profile
        const [detailsRes, profileRes, basicRes] = await Promise.all([
          (supabase.from('screening_details') as any).select('*').eq('user_id', user.id).maybeSingle(),
          (supabase.from('screening_profiles') as any).select('*').eq('user_id', user.id).maybeSingle(),
          (supabase.from('profiles') as any).select('display_name, phone').eq('user_id', user.id).maybeSingle()
        ]);
        const details = detailsRes.data;
        const profile = profileRes.data;
        const basic = basicRes.data;

        if (details || profile || basic) {
          const displayParts: string[] = basic?.display_name?.split(' ') ?? [];
          const prefilled = mergeDraft({
            personal: {
              first_name: profile?.first_name || displayParts[0] || '',
              middle_name: profile?.middle_name || '',
              last_name: profile?.last_name || displayParts.slice(1).join(' ') || '',
              phone: details?.phone || basic?.phone || '',
              email: user.email || ''
            },
            identity: {
              id_type: details?.id_type || 'sa_id',
              id_number: details?.id_number || '',
              date_of_birth: details?.date_of_birth || '',
              nationality: details?.nationality || 'South African',
              id_expiry_date: details?.id_expiry_date || ''
            },
            address: {
              ...(details?.address && typeof details.address === 'object' ? details.address : { line1: details?.current_address || '' }),
              reason_for_moving: details?.reason_for_moving || '',
              previous_landlord_name: details?.previous_landlord_name || '',
              previous_landlord_contact: details?.previous_landlord_contact || '',
              proof_document: null
            },
            employment: {
              ...(details?.employment && typeof details.employment === 'object' ? details.employment : {}),
              status: details?.employment_status || '',
              net_monthly_income: details?.net_monthly_income?.toString() || '',
              gross_monthly_income: details?.gross_monthly_income?.toString() || '',
              income_documents: []
            }
          });
          // consent is per-application — never carried over
          prefilled.credit.consent = false;
          setFormData(prefilled);
          setFirstName(prefilled.personal.first_name || undefined);
          toast({
            title: 'Details pre-filled',
            description: 'We reused information from your saved application profile. Please review each step before submitting.'
          });
        }
      } catch (err) {
        console.error('Error loading application state', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, loaded, draft, propertyId, toast]);

  const update = useCallback(
    <S extends SectionKey>(section: S, patch: Partial<ApplicationFormData[S]>) => {
      setFormData((prev) => {
        const next = { ...prev, [section]: { ...prev[section], ...patch } };
        scheduleSave(next, currentStep, completedSteps);
        return next;
      });
    },
    [scheduleSave, currentStep, completedSteps]
  );

  const onUploadComplete = useCallback(() => {
    // persist document references promptly so refreshes can't lose them
    setFormData((prev) => {
      void saveNow(prev, currentStep, completedSteps);
      return prev;
    });
  }, [saveNow, currentStep, completedSteps]);

  const goToStep = (idx: number) => {
    setErrors({});
    setCurrentStep(idx);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goNext = () => {
    const section = steps[currentStep].section;
    if (section) {
      const sectionErrors = validateSection(section, formData);
      if (Object.keys(sectionErrors).length > 0) {
        setErrors(sectionErrors);
        toast({
          title: 'Missing information',
          description: 'Please complete the highlighted fields before continuing.',
          variant: 'destructive'
        });
        return;
      }
    }
    const nextCompleted = completedSteps.includes(currentStep) ? completedSteps : [...completedSteps, currentStep];
    setCompletedSteps(nextCompleted);
    const next = Math.min(currentStep + 1, steps.length - 1);
    goToStep(next);
    void saveNow(formData, next, nextCompleted);
  };

  const goBack = () => {
    const prev = Math.max(currentStep - 1, 0);
    goToStep(prev);
    void saveNow(formData, prev, completedSteps);
  };

  const handleStartOver = async () => {
    if (!user) return;
    try {
      await deleteDraft(user.id, propertyId, formData);
      clearLocal();
      setFormData(emptyFormData());
      setCurrentStep(0);
      setCompletedSteps([]);
      setShowWelcomeBack(false);
      setLoading(false);
    } catch (error) {
      console.error('Start over failed', error);
      toast({ title: 'Could not reset', description: 'Please try again.', variant: 'destructive' });
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

    const allErrors: FieldErrors = {};
    for (const step of steps) {
      if (step.section) Object.assign(allErrors, validateSection(step.section, formData));
    }
    if (!confirmations.accurate || !confirmations.terms) {
      allErrors.confirmations = 'Please confirm the declarations above before submitting.';
    }
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      toast({
        title: 'Application incomplete',
        description: 'Some sections still need attention — use Edit on the incomplete sections.',
        variant: 'destructive'
      });
      return;
    }

    setSubmitting(true);
    try {
      await submitApplication({ userId: user.id, propertyId, landlordId, inviteId, formData });
      clearLocal();
      setShowSuccessDialog(true);
    } catch (error: any) {
      console.error('Submit application error', error);
      toast({
        title: 'Submission failed',
        description: friendlySubmitError(error),
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !showWelcomeBack && !existingApplication) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Once an application exists (anything past the "invited" state) it's already
  // submitted — show its status instead of the form so it doesn't look like a to-do.
  if (existingApplication && existingApplication.status !== 'invited') {
    const st = existingApplication.status;
    const isReview = st === 'pending' || st === 'submitted';
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>{isReview ? 'Application submitted' : 'Application Status'}</CardTitle>
          <CardDescription>Your application for this property</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-lg mb-2">
              {isReview ? 'Thanks — your application is in! 🎉' : `Application ${st}`}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              {isReview
                ? "The landlord is reviewing it. We'll let you know as soon as there's an update."
                : <>Status: <span className="capitalize font-medium">{st}</span></>}
            </p>
            <Button variant="outline" onClick={() => navigate('/tenant-dashboard')}>Go to Dashboard</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (showWelcomeBack && draft) {
    const lastCompleted = draft.completedSteps.length > 0 ? Math.max(...draft.completedSteps) : null;
    return (
      <WelcomeBack
        firstName={firstName}
        percentage={completionPercentage(draft.completedSteps)}
        lastSectionTitle={lastCompleted !== null ? steps[lastCompleted].title : null}
        lastSavedAt={draft.updatedAt}
        onContinue={() => {
          setShowWelcomeBack(false);
          setLoading(false);
        }}
        onStartOver={handleStartOver}
      />
    );
  }

  const SaveIndicator = () => {
    if (saveStatus === 'idle') return null;
    const content = {
      saving: { icon: <Loader2 className="h-3 w-3 animate-spin" />, text: 'Saving…' },
      saved: { icon: <Check className="h-3 w-3" />, text: 'Saved' },
      error: { icon: <AlertCircle className="h-3 w-3 text-destructive" />, text: 'Unable to save' }
    }[saveStatus];
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" role="status">
        {content.icon}
        {content.text}
      </span>
    );
  };

  const StepIndicator = () => (
    <div className="w-full">
      {/* Desktop/Tablet progress bar */}
      <div className="hidden sm:flex items-center justify-between gap-2">
        {steps.map((s, idx) => (
          <div key={s.key} className="flex-1">
            <div className={`h-1 rounded-full ${idx <= currentStep ? 'bg-primary' : 'bg-muted'}`} />
            <div className="mt-2 text-xs text-muted-foreground text-center">{s.title}</div>
          </div>
        ))}
      </div>
      {/* Mobile: always-visible step count + scrollable chips that auto-scroll into view */}
      <div className="sm:hidden">
        <div className="text-xs font-medium text-muted-foreground mb-2">
          Step {currentStep + 1} of {steps.length}: {steps[currentStep].title}
        </div>
        <div className="-mx-2 px-2 overflow-x-auto pb-2">
          <div className="flex gap-2 snap-x snap-mandatory">
            {steps.map((s, idx) => (
              <div
                key={s.key}
                ref={(el) => { stepChipRefs.current[idx] = el; }}
                className={`shrink-0 snap-center px-3 py-1.5 rounded-full text-xs border ${idx === currentStep ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-foreground border-muted'}`}
              >
                {s.title}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const isReviewStep = currentStep === steps.length - 1;
  const stepProps = {
    data: formData,
    update,
    errors,
    userId: user?.id ?? '',
    onUploadComplete
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle>Rental Application</CardTitle>
            <CardDescription>Complete each step to submit your application.</CardDescription>
          </div>
          <SaveIndicator />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          <StepIndicator />

          {currentStep === 0 && <PersonalStep {...stepProps} />}
          {currentStep === 1 && <IdentityStep {...stepProps} />}
          {currentStep === 2 && <AddressStep {...stepProps} />}
          {currentStep === 3 && <CreditStep {...stepProps} />}
          {currentStep === 4 && <EmploymentStep {...stepProps} />}
          {currentStep === 5 && <HouseholdStep {...stepProps} />}
          {currentStep === 6 && <RiskStep {...stepProps} />}
          {isReviewStep && (
            <ReviewStep
              {...stepProps}
              onEdit={goToStep}
              confirmations={confirmations}
              setConfirmations={(patch) => setConfirmationsState((prev) => ({ ...prev, ...patch }))}
            />
          )}

          <div className="flex gap-3 pt-6">
            {currentStep > 0 && (
              <Button type="button" variant="secondary" onClick={goBack} disabled={submitting}>
                Back
              </Button>
            )}
            <div className="ml-auto flex gap-3">
              {!isReviewStep && (
                <Button type="button" onClick={goNext} disabled={submitting}>
                  Next
                </Button>
              )}
              {isReviewStep && (
                <Button
                  type="button"
                  className="min-w-40"
                  onClick={handleSubmit}
                  disabled={submitting || !confirmations.accurate || !confirmations.terms}
                >
                  {submitting ? 'Submitting...' : 'Submit Application'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>

      <SuccessDialog
        open={showSuccessDialog}
        onClose={() => setShowSuccessDialog(false)}
        icon="check"
        title="Application Submitted!"
        subtitle="Your rental application has been successfully submitted."
        progress={{ current: 1, total: 3, label: 'Application Progress' }}
        nextSteps={[
          { title: 'Credit check in progress', description: "We're verifying your credit score automatically" },
          { title: 'Landlord review', description: 'The landlord will review your complete application' },
          { title: 'Decision notification', description: "You'll receive an email with the outcome" }
        ]}
        primaryAction={{
          label: 'Go to Dashboard',
          onClick: () => {
            setShowSuccessDialog(false);
            if (onSubmissionComplete) onSubmissionComplete();
            else navigate('/enhancedtenantdashboard');
          }
        }}
        showConfetti={true}
      />
    </Card>
  );
}
