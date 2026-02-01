// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, ArrowRight, Building2, FileUp, CheckCircle2, AlertCircle } from 'lucide-react';

type AgencyStatus = 'draft' | 'submitted' | 'approved' | 'declined';

type AgencyRow = {
  id: string;
  name: string;
  status: AgencyStatus;
  created_by: string;
  decline_reason?: string | null;
};

export default function AgencyOnboarding() {
  const { user, loading, redirectAfterAuth } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);

  const [accountEmail, setAccountEmail] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [accountConfirmPassword, setAccountConfirmPassword] = useState('');

  const [agency, setAgency] = useState<AgencyRow | null>(null);

  const [agencyName, setAgencyName] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);

  const hasAccountStep = !user;
  const totalSteps = hasAccountStep ? 4 : 3;
  const progress = (step / totalSteps) * 100;

  const stepMeta = useMemo(() => {
    if (hasAccountStep) {
      if (step === 1) return { title: 'Create Account', description: 'Create your agency admin account' };
      if (step === 2) return { title: 'Agency Details', description: 'Tell us about your agency' };
      if (step === 3) return { title: 'Upload Document', description: 'Upload your agency document' };
      return { title: 'Submit', description: 'Submit for approval' };
    }

    if (step === 1) return { title: 'Agency Details', description: 'Tell us about your agency' };
    if (step === 2) return { title: 'Upload Document', description: 'Upload your agency document' };
    return { title: 'Submit', description: 'Submit for approval' };
  }, [hasAccountStep, step]);

  useEffect(() => {
    if (loading) return;

    if (user) {
      fetchExistingAgency();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  const createAccount = async () => {
    if (!accountEmail.trim()) {
      toast({ variant: 'destructive', title: 'Email required', description: 'Please enter your email.' });
      return;
    }
    if (!accountPassword) {
      toast({ variant: 'destructive', title: 'Password required', description: 'Please enter a password.' });
      return;
    }
    if (accountPassword !== accountConfirmPassword) {
      toast({ variant: 'destructive', title: "Passwords don't match", description: 'Please confirm your password.' });
      return;
    }

    setBusy(true);
    try {
      redirectAfterAuth('/agency/onboarding');

      const { error } = await supabase.auth.signUp({
        email: accountEmail.trim(),
        password: accountPassword,
        options: {
          data: { role: 'tenant' },
          emailRedirectTo: `${window.location.origin}/auth`,
        },
      });

      if (error) throw error;

      toast({
        title: 'Account created',
        description: 'Please verify your email if required, then sign in to continue the agency onboarding.',
      });

      navigate('/auth');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Account creation failed', description: err.message });
    } finally {
      setBusy(false);
    }
  };

  const fetchExistingAgency = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('agencies')
        .select('id,name,status,created_by,decline_reason')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setAgency(data as any);
        setAgencyName(data.name || '');

        if (data.status === 'submitted') {
          setStep(3);
        }
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to load agency onboarding',
        description: err.message,
      });
    }
  };

  const ensureAgencyDraft = async () => {
    if (!user) throw new Error('Not signed in');

    if (agency?.id) return agency;

    const { data, error } = await supabase
      .from('agencies')
      .insert({
        name: agencyName,
        created_by: user.id,
        status: 'draft',
      })
      .select('id,name,status,created_by,decline_reason')
      .single();

    if (error) throw error;

    // Ensure agency admin membership
    await supabase.from('agency_members').insert({
      agency_id: data.id,
      user_id: user.id,
      role: 'agency_admin',
    });

    setAgency(data as any);
    return data as any;
  };

  const uploadAgencyDocument = async (agencyId: string, file: File) => {
    if (!user) throw new Error('Not signed in');

    const ext = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${ext}`;
    const path = `agency/${agencyId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('agency-uploads')
      .upload(path, file, { upsert: false });

    if (uploadError) throw uploadError;

    const { error: docErr } = await supabase.from('agency_documents').insert({
      agency_id: agencyId,
      doc_type: 'agency_document',
      file_path: path,
    });

    if (docErr) throw docErr;
  };

  const onNext = async () => {
    // When logged out, step 1 is account creation.
    if (hasAccountStep && step === 1) {
      await createAccount();
      return;
    }

    // Must be signed in for the agency/doc steps.
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Sign-in required',
        description: 'Please sign in to continue the agency onboarding.',
      });
      return;
    }

    const agencyStep = hasAccountStep ? step - 1 : step;

    if (agencyStep === 1) {
      if (!agencyName.trim()) {
        toast({ variant: 'destructive', title: 'Agency name required', description: 'Please enter your agency name.' });
        return;
      }
      setStep(step + 1);
      return;
    }

    if (agencyStep === 2) {
      if (!docFile) {
        toast({ variant: 'destructive', title: 'Document required', description: 'Please upload your agency document.' });
        return;
      }

      setBusy(true);
      try {
        const draft = await ensureAgencyDraft();

        // Update name if changed
        if (draft.name !== agencyName) {
          await supabase.from('agencies').update({ name: agencyName }).eq('id', draft.id);
        }

        await uploadAgencyDocument(draft.id, docFile);

        setStep(step + 1);
      } catch (err: any) {
        toast({ variant: 'destructive', title: 'Upload failed', description: err.message });
      } finally {
        setBusy(false);
      }
      return;
    }

    if (agencyStep === 3) {
      // nothing
      return;
    }
  };

  const onBack = () => {
    if (step > 1) setStep(step - 1);
    else navigate('/auth');
  };

  const onSubmitForApproval = async () => {
    if (!agency?.id) {
      toast({ variant: 'destructive', title: 'Missing agency', description: 'Please complete the earlier steps first.' });
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase
        .from('agencies')
        .update({ status: 'submitted' })
        .eq('id', agency.id);

      if (error) throw error;

      setAgency({ ...agency, status: 'submitted' });

      toast({
        title: 'Submitted for approval',
        description: 'Your agency signup has been submitted. You will be able to create agents after approval.',
      });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Submission failed', description: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto p-6 max-w-3xl">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" onClick={onBack} disabled={busy}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-primary">Agency Sign Up</h1>
            <p className="text-muted-foreground">Submit your agency for approval</p>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-medium text-muted-foreground">
              Step {step} of {totalSteps}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {agency?.status === 'declined' && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Your agency was declined.{agency.decline_reason ? ` Reason: ${agency.decline_reason}` : ''}
            </AlertDescription>
          </Alert>
        )}

        {agency?.status === 'approved' && (
          <Alert className="mb-6">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              Your agency is approved. You can now manage agents in your agency dashboard.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {(!user && step === 1) && <Building2 className="h-5 w-5" />}
              {((user && step === 1) || (!user && step === 2)) && <Building2 className="h-5 w-5" />}
              {((user && step === 2) || (!user && step === 3)) && <FileUp className="h-5 w-5" />}
              {((user && step === 3) || (!user && step === 4)) && <CheckCircle2 className="h-5 w-5" />}
              {stepMeta.title}
            </CardTitle>
            <CardDescription>{stepMeta.description}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {!user && step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="agency-admin-email">Email</Label>
                  <Input
                    id="agency-admin-email"
                    type="email"
                    value={accountEmail}
                    onChange={(e) => setAccountEmail(e.target.value)}
                    placeholder="you@agency.com"
                    disabled={busy}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="agency-admin-password">Password</Label>
                  <Input
                    id="agency-admin-password"
                    type="password"
                    value={accountPassword}
                    onChange={(e) => setAccountPassword(e.target.value)}
                    placeholder="Create a password"
                    disabled={busy}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="agency-admin-confirm-password">Confirm Password</Label>
                  <Input
                    id="agency-admin-confirm-password"
                    type="password"
                    value={accountConfirmPassword}
                    onChange={(e) => setAccountConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    disabled={busy}
                  />
                </div>
              </div>
            )}

            {((user && step === 1) || (!user && step === 2)) && (
              <div className="space-y-2">
                <Label htmlFor="agency-name">Agency Name</Label>
                <Input
                  id="agency-name"
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  placeholder="Your agency name"
                  disabled={busy || agency?.status === 'submitted' || agency?.status === 'approved'}
                />
              </div>
            )}

            {((user && step === 2) || (!user && step === 3)) && (
              <div className="space-y-2">
                <Label htmlFor="agency-doc">Agency Document</Label>
                <Input
                  id="agency-doc"
                  type="file"
                  onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
                  disabled={busy || agency?.status === 'submitted' || agency?.status === 'approved'}
                />
                <p className="text-sm text-muted-foreground">
                  Upload the required document for verification.
                </p>
              </div>
            )}

            {((user && step === 3) || (!user && step === 4)) && (
              <div className="space-y-4">
                <Alert>
                  <AlertDescription>
                    {agency?.status === 'submitted'
                      ? 'Submitted. Please wait for platform approval.'
                      : 'Ready to submit your agency for approval.'}
                  </AlertDescription>
                </Alert>

                <Button
                  onClick={onSubmitForApproval}
                  className="w-full"
                  disabled={busy || agency?.status === 'submitted' || agency?.status === 'approved'}
                >
                  {busy ? 'Submitting...' : 'Submit for Approval'}
                </Button>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={onBack} disabled={busy}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>

              {step < totalSteps ? (
                <Button onClick={onNext} disabled={busy}>
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button variant="outline" onClick={() => navigate('/')} disabled={busy}>
                  Done
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
