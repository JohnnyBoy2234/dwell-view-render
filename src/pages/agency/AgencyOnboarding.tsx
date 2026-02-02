// @ts-nocheck
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AgencySignupForm } from '@/components/agency/AgencySignupForm';
import { AgencyValueProps } from '@/components/agency/AgencyValueProps';
import { ArrowLeft, Building2, FileUp, CheckCircle2, AlertCircle, Upload } from 'lucide-react';

type AgencyStatus = 'draft' | 'submitted' | 'approved' | 'declined';

type AgencyRow = {
  id: string;
  name: string;
  status: AgencyStatus;
  created_by: string;
  decline_reason?: string | null;
};

export default function AgencyOnboarding() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [agency, setAgency] = useState<AgencyRow | null>(null);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [showDocUpload, setShowDocUpload] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      fetchExistingAgency();
    }
  }, [user, loading]);

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
        setShowDocUpload(true);
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to load agency',
        description: err.message,
      });
    }
  };

  const uploadAgencyDocument = async () => {
    if (!agency?.id || !docFile || !user) return;

    setBusy(true);
    try {
      const ext = docFile.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${ext}`;
      const path = `agency/${agency.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('agency-uploads')
        .upload(path, docFile, { upsert: false });

      if (uploadError) throw uploadError;

      const { error: docErr } = await supabase.from('agency_documents').insert({
        agency_id: agency.id,
        doc_type: 'agency_document',
        file_path: path,
      });

      if (docErr) throw docErr;

      toast({
        title: 'Document uploaded',
        description: 'Your document has been uploaded successfully.',
      });

      // Auto-submit for approval
      await submitForApproval();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: err.message,
      });
    } finally {
      setBusy(false);
    }
  };

  const submitForApproval = async () => {
    if (!agency?.id) return;

    try {
      const { error } = await supabase
        .from('agencies')
        .update({ status: 'submitted' })
        .eq('id', agency.id);

      if (error) throw error;

      setAgency({ ...agency, status: 'submitted' });

      toast({
        title: 'Submitted for approval',
        description: 'Your agency is now under review. You will be notified once approved.',
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Submission failed',
        description: err.message,
      });
    }
  };

  // If user is logged in and has an agency, show document upload
  if (user && showDocUpload && agency) {
    const status = agency.status;

    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto p-6 max-w-2xl">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="outline" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Agency Registration</h1>
              <p className="text-muted-foreground">{agency.name}</p>
            </div>
            <div className="ml-auto">
              <Badge 
                variant={status === 'approved' ? 'default' : status === 'declined' ? 'destructive' : 'secondary'}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Badge>
            </div>
          </div>

          {status === 'approved' && (
            <Alert className="mb-6 border-success-green bg-success-green/10">
              <CheckCircle2 className="h-4 w-4 text-success-green" />
              <AlertDescription className="text-success-green-dark">
                Your agency is approved! You can now manage agents in your dashboard.
              </AlertDescription>
              <Button 
                className="mt-4 bg-success-green hover:bg-success-green-dark"
                onClick={() => navigate('/agency/dashboard')}
              >
                Go to Dashboard
              </Button>
            </Alert>
          )}

          {status === 'submitted' && (
            <Alert className="mb-6">
              <AlertDescription>
                Your agency is under review. You will be notified once approved.
              </AlertDescription>
            </Alert>
          )}

          {status === 'declined' && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Your agency was declined.{agency.decline_reason ? ` Reason: ${agency.decline_reason}` : ''} 
                Please contact support for assistance.
              </AlertDescription>
            </Alert>
          )}

          {status === 'draft' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileUp className="h-5 w-5" />
                  Upload Agency Document
                </CardTitle>
                <CardDescription>
                  Upload your FFC certificate or agency registration document for verification.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="agency-doc">Agency Document</Label>
                  <Input
                    id="agency-doc"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
                    disabled={busy}
                  />
                  <p className="text-sm text-muted-foreground">
                    Accepted formats: PDF, JPG, PNG
                  </p>
                </div>

                <Button
                  onClick={uploadAgencyDocument}
                  disabled={!docFile || busy}
                  className="w-full"
                >
                  {busy ? 'Uploading...' : 'Upload & Submit for Approval'}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // Landing page for new agencies
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-ocean-blue via-ocean-blue-dark to-[hsl(210,60%,20%)] overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Headline & Benefits */}
            <div className="text-white">
              <Badge className="bg-white/20 text-white border-white/30 mb-4">
                For Real Estate Agencies
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                Grow Your Agency with{' '}
                <span className="text-success-green">RentLekker</span>
              </h1>
              <p className="text-xl text-white/90 mb-8">
                Join South Africa's fastest-growing rental platform. List properties, manage agents, and connect with verified tenants — all in one place.
              </p>
              
              <ul className="space-y-4 mb-8">
                {[
                  'Access thousands of verified tenants',
                  'Powerful agent management tools',
                  'Digital leases & e-signatures',
                  'Priority listing placement',
                ].map((benefit, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-success-green flex-shrink-0" />
                    <span className="text-white/90">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right: Signup Form Card */}
            <div className="lg:pl-8">
              <Card className="shadow-2xl border-0">
                <CardHeader className="text-center pb-4">
                  <div className="w-12 h-12 rounded-full bg-ocean-blue/10 flex items-center justify-center mx-auto mb-4">
                    <Building2 className="h-6 w-6 text-ocean-blue" />
                  </div>
                  <CardTitle className="text-2xl">Register Your Agency</CardTitle>
                  <CardDescription>
                    Fill in your details to get started
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AgencySignupForm 
                    onSuccess={() => {
                      fetchExistingAgency();
                      setShowDocUpload(true);
                    }} 
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Value Props Section */}
      <AgencyValueProps />

      {/* Final CTA */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Ready to Transform Your Agency?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join hundreds of agencies already growing their business on RentLekker.
          </p>
          <Button
            size="lg"
            className="bg-ocean-blue hover:bg-ocean-blue-dark text-white px-8"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            Get Started Now
          </Button>
        </div>
      </section>
    </div>
  );
}
