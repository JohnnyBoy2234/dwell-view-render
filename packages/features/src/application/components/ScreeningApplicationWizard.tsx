import { useCallback, useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import { Button } from '@mzanzihomes/ui/components/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@mzanzihomes/ui/components/dialog';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';
import { useAuth } from '@mzanzihomes/supabase/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@mzanzihomes/supabase/client';
import { AlertCircle, Check, CheckCircle2, WifiOff } from 'lucide-react';
import { completionPercentage, deleteDraft } from '../services/draftService';
import { submitApplication } from '../services/submitService';
import { useApplicationDraft } from '../hooks/useApplicationDraft';
import { emptyFormData, mergeDraft, type ApplicationFormData, type SectionKey } from '../types';
import { validateDocuments, validateSection, type FieldErrors } from '../validation';
import { WelcomeBack } from './WelcomeBack';
import { PropertyStep, type PropertySummary } from './steps/PropertyStep';
import { YourDetailsStep } from './steps/YourDetailsStep';
import { HouseholdIncomeStep } from './steps/HouseholdIncomeStep';
import { ConsentStep } from './steps/ConsentStep';
import { ReferencesDocumentsStep } from './steps/ReferencesDocumentsStep';
import { ReviewSubmitStep } from './steps/ReviewSubmitStep';
import { applicationTheme } from '@mzanzihomes/common/constants/applicationTheme';

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

const steps: { key: string; title: string; sections: SectionKey[] }[] = [
  { key: 'property', title: 'The property', sections: [] },
  { key: 'details', title: 'Your details', sections: ['personal', 'identity', 'address'] },
  { key: 'household', title: 'Household and income', sections: ['household', 'employment', 'support', 'risk'] },
  { key: 'consent', title: 'Consent and checks', sections: ['credit'] },
  { key: 'documents', title: 'References and documents', sections: ['references'] },
  { key: 'review', title: 'Review and submit', sections: [] }
];

const REVIEW_STEP = steps.length - 1;

function validateStep(idx: number, data: ApplicationFormData): FieldErrors {
  const errors: FieldErrors = {};
  for (const section of steps[idx].sections) {
    Object.assign(errors, validateSection(section, data));
  }
  if (steps[idx].key === 'documents') {
    Object.assign(errors, validateDocuments(data));
  }
  return errors;
}

export function ScreeningApplicationWizard({ propertyId, landlordId, inviteId, onSubmissionComplete }: ScreeningApplicationWizardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [existingApplication, setExistingApplication] = useState<any>(null);
  const [property, setProperty] = useState<PropertySummary | null>(null);
  const [formData, setFormData] = useState<ApplicationFormData>(emptyFormData());
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [declared, setDeclared] = useState(false);
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string | undefined>();
  const initialised = useRef(false);

  const { draft, loaded, saveStatus, scheduleSave, saveNow, clearLocal } = useApplicationDraft({
    userId: user?.id,
    propertyId,
    landlordId,
    inviteId
  });

  useEffect(() => {
    (async () => {
      const { data } = await (supabase.from('properties') as any)
        .select('id, title, location, price, images')
        .eq('id', propertyId)
        .maybeSingle();
      if (data) {
        setProperty({
          id: data.id,
          title: data.title,
          location: data.location,
          price: data.price ?? null,
          image: Array.isArray(data.images) && data.images.length > 0 ? data.images[0] : null
        });
      }
    })();
  }, [propertyId]);

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

        // 'invited' means "please apply"; 'withdrawn' may be replaced by a
        // fresh application — anything else is already in flight or decided.
        if (application && application.status !== 'invited' && application.status !== 'withdrawn') {
          setExistingApplication(application);
          return;
        }

        if (draft) {
          setFormData(draft.formData);
          setCurrentStep(Math.min(Math.max(draft.currentStep, 0), REVIEW_STEP));
          setCompletedSteps(draft.completedSteps.filter((s) => s >= 0 && s <= REVIEW_STEP));
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
              ...(details?.address && typeof details.address === 'object' ? details.address : { line1: details?.current_address || '' })
            },
            employment: {
              ...(details?.employment && typeof details.employment === 'object' ? details.employment : {}),
              status: details?.employment_status || '',
              net_monthly_income: details?.net_monthly_income?.toString() || '',
              gross_monthly_income: details?.gross_monthly_income?.toString() || '',
              income_documents: []
            },
            references: {
              rented_before: details?.previous_landlord_name ? 'yes' : '',
              landlord_name: details?.previous_landlord_name || '',
              landlord_phone: details?.previous_landlord_contact || ''
            }
          });
          // consent is per-application — never carried over
          prefilled.credit.consent = '';
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
    let data = formData;
    // Continuing the consent step without ticking the box records an explicit
    // "no" — consent is never assumed either way.
    if (steps[currentStep].key === 'consent' && data.credit.consent !== 'yes') {
      data = { ...data, credit: { ...data.credit, consent: 'no' } };
      setFormData(data);
    }
    const stepErrors = validateStep(currentStep, data);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      toast({
        title: 'Missing information',
        description: 'Please complete the highlighted fields before continuing.',
        variant: 'destructive'
      });
      return;
    }
    const nextCompleted = completedSteps.includes(currentStep) ? completedSteps : [...completedSteps, currentStep];
    setCompletedSteps(nextCompleted);
    const next = Math.min(currentStep + 1, REVIEW_STEP);
    goToStep(next);
    void saveNow(data, next, nextCompleted);
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

  const validateAll = (): boolean => {
    const allErrors: FieldErrors = {};
    for (let i = 0; i < steps.length; i++) {
      Object.assign(allErrors, validateStep(i, formData));
    }
    if (!declared) {
      allErrors.declaration = 'Please confirm the declaration above before submitting.';
    }
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      toast({
        title: 'Application incomplete',
        description: 'Some sections still need attention — use Edit on the incomplete sections.',
        variant: 'destructive'
      });
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!user || submitting) return;
    setSubmitting(true);
    try {
      const id = await submitApplication({ userId: user.id, propertyId, landlordId, inviteId, formData });
      clearLocal();
      setConfirmOpen(false);
      setSubmittedId(id);
      window.scrollTo({ top: 0 });
    } catch (error: any) {
      console.error('Submit application error', error);
      setConfirmOpen(false);
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

  // Submission confirmation — the end of the rental-application flow. No
  // lease, deposit or tenancy language belongs here.
  if (submittedId) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-2" aria-hidden="true" />
          <CardTitle>Application submitted</CardTitle>
          <CardDescription>
            Your rental application has been sent to the landlord for review.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border divide-y text-sm">
            <div className="flex justify-between gap-2 p-3">
              <span className="text-muted-foreground">Property</span>
              <span className="font-medium text-right break-words">{property?.title ?? '—'}</span>
            </div>
            <div className="flex justify-between gap-2 p-3">
              <span className="text-muted-foreground">Application reference</span>
              <span className="font-medium uppercase">{submittedId.slice(0, 8)}</span>
            </div>
            <div className="flex justify-between gap-2 p-3">
              <span className="text-muted-foreground">Submitted</span>
              <span className="font-medium">{new Date().toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between gap-2 p-3">
              <span className="text-muted-foreground">Status</span>
              <span className="font-medium">Submitted — under review</span>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium mb-1">What happens next</p>
            <p className="text-sm text-muted-foreground">
              The landlord will review your application. They may ask for more information — we
              will notify you if they do, and when a decision is made.
            </p>
          </div>
          <Button
            className="w-full"
            onClick={() => {
              if (onSubmissionComplete) onSubmissionComplete();
              else navigate('/tenant/applications');
            }}
          >
            Go to my applications
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Once an application exists it's already submitted — show its status
  // instead of the form so it doesn't look like a to-do.
  if (existingApplication) {
    const st = existingApplication.status;
    const copy: Record<string, { title: string; body: string }> = {
      accepted: {
        title: 'Application approved',
        body: 'The landlord has approved this rental application.'
      },
      declined: {
        title: 'Application not approved',
        body: 'The landlord has decided not to proceed with your rental application for this property.'
      },
      more_info_requested: {
        title: 'More information requested',
        body: 'The landlord needs something more from you before they can finish reviewing your application.'
      },
      expired: {
        title: 'Application expired',
        body: 'This application is no longer active.'
      }
    };
    const c = copy[st] ?? {
      title: 'Application submitted',
      body: "The landlord is reviewing your application. We'll let you know as soon as there's an update."
    };
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>{c.title}</CardTitle>
          <CardDescription>Your application for this property</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 space-y-4">
            <p className="text-sm text-muted-foreground">{c.body}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => navigate(`/application/${existingApplication.id}`)}>
                View application
              </Button>
              <Button variant="outline" onClick={() => navigate('/tenant-dashboard')}>
                Go to Dashboard
              </Button>
            </div>
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
        percentage={completionPercentage(draft.completedSteps.filter((s) => s <= REVIEW_STEP))}
        lastSectionTitle={lastCompleted !== null && lastCompleted <= REVIEW_STEP ? steps[lastCompleted].title : null}
        lastSavedAt={draft.updatedAt}
        onContinue={() => {
          setShowWelcomeBack(false);
          setLoading(false);
        }}
        onReview={() => {
          setCurrentStep(REVIEW_STEP);
          setShowWelcomeBack(false);
          setLoading(false);
        }}
        onStartOver={handleStartOver}
      />
    );
  }

  const SaveIndicator = () => {
    // Autosave is silent by design — no "Saving…"/"Saved" chatter. We only speak
    // up when a save genuinely fails, so the tenant knows their progress is at
    // risk and can retry.
    if (saveStatus !== 'error') return null;
    const offline = typeof navigator !== 'undefined' && !navigator.onLine;
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-destructive shrink-0" role="status">
        {offline ? <WifiOff className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
        {offline
          ? "You're offline — we'll save when you reconnect."
          : "We couldn't save your latest changes. Check your connection and try again."}
      </span>
    );
  };

  const isReviewStep = currentStep === REVIEW_STEP;
  const isConsentStep = steps[currentStep].key === 'consent';
  const stepProps = {
    data: formData,
    update,
    errors,
    userId: user?.id ?? '',
    onUploadComplete
  };

  const primaryLabel = isReviewStep
    ? 'Submit application'
    : isConsentStep
      ? formData.credit.consent === 'yes'
        ? 'Agree and continue'
        : 'Continue without consent'
      : steps[currentStep].key === 'documents'
        ? 'Review application'
        : 'Continue';

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle>Rental Application</CardTitle>
            <CardDescription>Designed to take about 10 minutes to complete.</CardDescription>
          </div>
          <SaveIndicator />
        </div>
        {/* Slim orange progress banner — estimated remaining time (not a timer) */}
        {(() => {
          const stepsLeft = steps.length - (currentStep + 1);
          const mins = Math.max(1, Math.round((stepsLeft / steps.length) * 10));
          const label = isReviewStep
            ? 'Almost done — just review and submit.'
            : stepsLeft <= 1
              ? "You're almost done — about 2 minutes remaining."
              : `You're about ${mins} minute${mins === 1 ? '' : 's'} away from completing your application.`;
          return (
            <div
              className="mt-3 flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-[13px] font-semibold"
              style={{ background: applicationTheme.primaryLight, border: `1px solid ${applicationTheme.border}`, color: applicationTheme.text }}
            >
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white text-[11px] font-bold"
                style={{ background: applicationTheme.primary }}
                aria-hidden="true"
              >
                {Math.round(((currentStep + 1) / steps.length) * 100)}
              </span>
              {label}
            </div>
          );
        })()}
        {/* The one and only step indicator */}
        <div className="pt-3">
          <p className="text-sm font-medium">
            Step {currentStep + 1} of {steps.length} — {steps[currentStep].title}
          </p>
          <div className="h-1.5 rounded-full mt-2" style={{ background: applicationTheme.primaryLight }} role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={currentStep + 1}>
            <div
              className="h-1.5 rounded-full transition-all"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%`, background: applicationTheme.primary }}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {currentStep === 0 && <PropertyStep property={property} />}
          {currentStep === 1 && <YourDetailsStep {...stepProps} />}
          {currentStep === 2 && <HouseholdIncomeStep {...stepProps} />}
          {currentStep === 3 && <ConsentStep {...stepProps} />}
          {currentStep === 4 && <ReferencesDocumentsStep {...stepProps} />}
          {isReviewStep && (
            <ReviewSubmitStep
              {...stepProps}
              onEdit={goToStep}
              declared={declared}
              setDeclared={setDeclared}
            />
          )}

          <div className="flex gap-3 pt-6">
            {currentStep > 0 && (
              <Button type="button" variant="secondary" onClick={goBack} disabled={submitting}>
                Back
              </Button>
            )}
            <div className="ml-auto">
              {(() => {
                const isOutline = isConsentStep && formData.credit.consent !== 'yes';
                return (
                  <Button
                    type="button"
                    className="min-w-40"
                    variant={isOutline ? 'outline' : 'default'}
                    disabled={submitting}
                    style={isOutline ? undefined : { background: applicationTheme.primary, color: '#fff' }}
                    onClick={() => {
                      if (isReviewStep) {
                        if (validateAll()) setConfirmOpen(true);
                      } else {
                        goNext();
                      }
                    }}
                  >
                    {primaryLabel}
                  </Button>
                );
              })()}
            </div>
          </div>
        </div>
      </CardContent>

      <Dialog open={confirmOpen} onOpenChange={(open) => !submitting && setConfirmOpen(open)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Submit your rental application?</DialogTitle>
            <DialogDescription>
              Your application will be sent to the landlord for review. Changes after submission
              may require the landlord to request additional information.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={submitting}>
              Go back
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit application'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
