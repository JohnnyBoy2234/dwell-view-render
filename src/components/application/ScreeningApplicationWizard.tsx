import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Upload, X } from "lucide-react";

export interface ScreeningApplicationWizardProps {
  propertyId: string;
  landlordId: string;
  inviteId?: string;
  onSubmissionComplete?: () => void;
}

interface FormData {
  // Personal
  first_name: string;
  middle_name: string;
  last_name: string;
  id_number: string;
  phone: string;
  // Employment
  employment_status: string;
  job_title: string;
  company_name: string;
  net_monthly_income: string;
  // Residence
  current_address: string;
  reason_for_moving: string;
  previous_landlord_name: string;
  previous_landlord_contact: string;
  // Additional
  has_pets: boolean;
  pet_details: string;
  screening_consent: boolean;
}

interface DocumentItem {
  name: string;
  url: string;
  type: string;
}

const steps = [
  { key: "personal", title: "Personal" },
  { key: "employment", title: "Employment" },
  { key: "residence", title: "Residence" },
  { key: "documents", title: "Documents" },
  { key: "additional", title: "Additional" },
  { key: "consent", title: "Consent" },
] as const;

type StepKey = typeof steps[number]["key"];

export function ScreeningApplicationWizard({ propertyId, landlordId, inviteId, onSubmissionComplete }: ScreeningApplicationWizardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [existingApplication, setExistingApplication] = useState<any>(null);
  const [uploadedDocuments, setUploadedDocuments] = useState<DocumentItem[]>([]);
  const [incomeDocuments, setIncomeDocuments] = useState<DocumentItem[]>([]);
  const [creditDocuments, setCreditDocuments] = useState<DocumentItem[]>([]);

  const [formData, setFormData] = useState<FormData>({
    first_name: "",
    middle_name: "",
    last_name: "",
    id_number: "",
    phone: "",
    employment_status: "",
    job_title: "",
    company_name: "",
    net_monthly_income: "",
    current_address: "",
    reason_for_moving: "",
    previous_landlord_name: "",
    previous_landlord_contact: "",
    has_pets: false,
    pet_details: "",
    screening_consent: false,
  });

  useEffect(() => {
    if (user) {
      void loadExistingData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, propertyId]);

  // Quick apply using saved screening details
  const quickApply = async () => {
    if (!user) return;
    try {
      setSubmitting(true);
      // Remove any existing, non-accepted application for this property
      await supabase
        .from("applications")
        .delete()
        .eq("tenant_id", user.id)
        .eq("property_id", propertyId)
        .neq("status", "accepted");

      // Create new application
      const { error: insertErr } = await supabase
        .from("applications")
        .insert({
          tenant_id: user.id,
          landlord_id: landlordId,
          property_id: propertyId,
          status: "pending",
        });
      if (insertErr) throw insertErr;

      toast({
        title: "Application sent",
        description: "Your application has been sent using your saved details.",
      });

      if (onSubmissionComplete) onSubmissionComplete();
      else navigate("/enhancedtenantdashboard");
      return true;
    } catch (e) {
      console.error("Quick apply error", e);
      toast({ title: "Could not submit", description: "Please try again.", variant: "destructive" });
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const loadExistingData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Existing application for this tenant & property
      const { data: application } = await supabase
        .from("applications")
        .select("*")
        .eq("tenant_id", user.id)
        .eq("property_id", propertyId)
        .maybeSingle();

      if (application) {
        setExistingApplication(application);
        // If not in a pre-submit state, prevent re-application
        if (application.status !== "invited") {
          return;
        }
      }

      // Check if tenant is already screened for auto-filling purposes
      const { data: basicProfile } = await supabase
        .from("profiles")
        .select("is_tenant_screened")
        .eq("user_id", user.id)
        .maybeSingle();

      // Auto-fill from screening profile if user is already screened, otherwise use basic profile
      if (basicProfile?.is_tenant_screened) {
        // Load comprehensive data from both screening_profile and screening_details
        const [screeningProfileResult, screeningDetailsResult] = await Promise.all([
          supabase
            .from("screening_profiles")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase
            .from("screening_details")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle()
        ]);
        
        const screeningProfile = screeningProfileResult.data;
        const screeningDetails = screeningDetailsResult.data;
        
        if (screeningProfile) {
          // Start with screening profile data
          let formDataUpdate: Partial<FormData> = {
            first_name: screeningProfile.first_name || "",
            middle_name: screeningProfile.middle_name || "",
            last_name: screeningProfile.last_name || "",
            has_pets: screeningProfile.has_pets || false,
            pet_details: screeningProfile.pet_details || "",
            screening_consent: false, // Always require explicit consent
          };
          
          // Add screening details if available
          if (screeningDetails) {
            formDataUpdate = {
              ...formDataUpdate,
              first_name: screeningDetails.full_name?.split(' ')[0] || formDataUpdate.first_name || "",
              last_name: screeningDetails.full_name?.split(' ').slice(1).join(' ') || formDataUpdate.last_name || "",
              id_number: screeningDetails.id_number || "",
              phone: screeningDetails.phone || "",
              employment_status: screeningDetails.employment_status || "",
              job_title: screeningDetails.job_title || "",
              company_name: screeningDetails.company_name || "",
              net_monthly_income: screeningDetails.net_monthly_income?.toString() || "",
              current_address: screeningDetails.current_address || "",
              reason_for_moving: screeningDetails.reason_for_moving || "",
              previous_landlord_name: screeningDetails.previous_landlord_name || "",
              previous_landlord_contact: screeningDetails.previous_landlord_contact || "",
            };
          }
          
          setFormData((prev) => ({
            ...prev,
            ...formDataUpdate,
          }));
          
          // Load existing documents
          if (screeningProfile.documents && Array.isArray(screeningProfile.documents)) {
            const documents = screeningProfile.documents as unknown as DocumentItem[];
            // Separate documents by type
            const incomeDocs = documents.filter(doc => doc.type === 'income');
            const creditDocs = documents.filter(doc => doc.type === 'experian_credit_report');
            const otherDocs = documents.filter(doc => doc.type !== 'income' && doc.type !== 'experian_credit_report');
            
            setIncomeDocuments(incomeDocs);
            setCreditDocuments(creditDocs);
            setUploadedDocuments(otherDocs);
          }
        }
      } else {
        // Auto-fill from both profiles and screening_details tables
        const [userProfileResult, screeningDetailsResult] = await Promise.all([
          supabase
            .from("profiles")
            .select("display_name, phone")
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase
            .from("screening_details")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle()
        ]);
        
        const userProfile = userProfileResult.data;
        const screeningDetails = screeningDetailsResult.data;
        
        // Start with basic profile data
        let formDataUpdate: Partial<FormData> = {
          screening_consent: false, // Always require explicit consent
        };
        
        // Add profile data
        if (userProfile) {
          const displayNameParts = userProfile.display_name?.split(' ') || [''];
          formDataUpdate = {
            ...formDataUpdate,
            first_name: displayNameParts[0] || "",
            last_name: displayNameParts.slice(1).join(' ') || "",
            phone: userProfile.phone || "",
          };
        }
        
        // Add screening details if available
        if (screeningDetails) {
          formDataUpdate = {
            ...formDataUpdate,
            first_name: screeningDetails.full_name?.split(' ')[0] || formDataUpdate.first_name || "",
            last_name: screeningDetails.full_name?.split(' ').slice(1).join(' ') || formDataUpdate.last_name || "",
            id_number: screeningDetails.id_number || "",
            phone: screeningDetails.phone || formDataUpdate.phone || "",
            employment_status: screeningDetails.employment_status || "",
            job_title: screeningDetails.job_title || "",
            company_name: screeningDetails.company_name || "",
            net_monthly_income: screeningDetails.net_monthly_income?.toString() || "",
            current_address: screeningDetails.current_address || "",
            reason_for_moving: screeningDetails.reason_for_moving || "",
            previous_landlord_name: screeningDetails.previous_landlord_name || "",
            previous_landlord_contact: screeningDetails.previous_landlord_contact || "",
          };
        }
        
        setFormData((prev) => ({
          ...prev,
          ...formDataUpdate,
        }));
        
        // Load existing documents from screening profile (if any)
        const { data: profile } = await supabase
          .from("screening_profiles")
          .select("documents")
          .eq("user_id", user.id)
          .maybeSingle();
        
        if (profile?.documents && Array.isArray(profile.documents)) {
          const documents = profile.documents as unknown as DocumentItem[];
          // Separate documents by type
          const incomeDocs = documents.filter(doc => doc.type === 'income');
          const creditDocs = documents.filter(doc => doc.type === 'experian_credit_report');
          const otherDocs = documents.filter(doc => doc.type !== 'income' && doc.type !== 'experian_credit_report');
          
          setIncomeDocuments(incomeDocs);
          setCreditDocuments(creditDocs);
          setUploadedDocuments(otherDocs);
        }
      }
    } catch (err) {
      console.error("Error loading existing application data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const uploadDocument = async (file: File, documentType: string) => {
    if (!user) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      let fileName: string;
      let bucketName: string;

      // Handle Experian credit report with special naming
      if (documentType === 'experian_credit_report') {
        const today = new Date().toISOString().split('T')[0]; // yyyy-mm-dd format
        fileName = `${user.id}/experian_report_${today}.pdf`; // Put in user folder for RLS
        bucketName = 'income-documents'; // Store in income documents bucket
      } else {
        fileName = `${user.id}/${documentType}_${Date.now()}.${fileExt}`;
        bucketName = documentType === 'id' ? 'id-documents' : 'income-documents';
      }
      
      const { error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file);

      if (error) throw error;

      // Record in documents table for secure landlord access
      await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          document_type: documentType === 'experian_credit_report' ? 'EXPERIAN_CREDIT_REPORT' : documentType,
          file_path: fileName,
          file_type: file.type,
        });

      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      const newDocument: DocumentItem = {
        name: file.name,
        url: urlData.publicUrl,
        type: documentType
      };

      // Add to appropriate document array based on type
      if (documentType === 'experian_credit_report') {
        setCreditDocuments(prev => [...prev, newDocument]);
      } else if (documentType === 'income') {
        setIncomeDocuments(prev => [...prev, newDocument]);
      } else {
        setUploadedDocuments(prev => [...prev, newDocument]);
      }
      
      const toastMessage = documentType === 'experian_credit_report' ? 'Experian report uploaded.' : `${file.name} has been uploaded successfully.`;
      toast({
        title: "Document Uploaded",
        description: toastMessage,
      });
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload document",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const removeDocument = async (index: number, documentType: 'income' | 'credit' | 'other') => {
    let document: DocumentItem;
    let bucketName: string;
    let filePath: string;
    
    // Get document from appropriate array
    if (documentType === 'income') {
      document = incomeDocuments[index];
    } else if (documentType === 'credit') {
      document = creditDocuments[index];
    } else {
      document = uploadedDocuments[index];
    }
    
    if (document.type === 'experian_credit_report') {
      bucketName = 'income-documents';
      // Experian reports use direct filename without user folder
      filePath = document.url.split('/').pop() || '';
    } else {
      bucketName = document.type === 'id' ? 'id-documents' : 'income-documents';
      const fileName = document.url.split('/').pop();
      filePath = `${user?.id}/${fileName}`;
    }
    
    try {
      await supabase.storage
        .from(bucketName)
        .remove([filePath]);
        
      // Update the appropriate array
      if (documentType === 'income') {
        setIncomeDocuments(prev => prev.filter((_, i) => i !== index));
      } else if (documentType === 'credit') {
        setCreditDocuments(prev => prev.filter((_, i) => i !== index));
      } else {
        setUploadedDocuments(prev => prev.filter((_, i) => i !== index));
      }
      
      toast({
        title: "Document Removed",
        description: "Document has been removed successfully.",
      });
    } catch (error) {
      console.error('Error removing document:', error);
      toast({
        title: "Removal Failed",
        description: "Failed to remove document",
        variant: "destructive"
      });
    }
  };

  const canProceedFromStep = (stepIdx: number): boolean => {
    // Minimal validation per step for better UX
    const required: Record<StepKey, (keyof FormData)[]> = {
      personal: ["first_name", "last_name", "id_number", "phone"],
      employment: ["employment_status"],
      residence: ["current_address"],
      documents: [],
      additional: [],
      consent: ["screening_consent"],
    };
    const stepKey = steps[stepIdx].key as StepKey;
    const fields = required[stepKey];
    for (const f of fields) {
      if (!formData[f]) return false;
    }
    if (stepKey === "consent" && !formData.screening_consent) return false;
    return true;
  };

  const goNext = () => {
    if (!canProceedFromStep(currentStep)) {
      toast({
        title: "Missing information",
        description: "Please complete required fields before continuing.",
        variant: "destructive",
      });
      return;
    }
    setCurrentStep((s) => Math.min(s + 1, steps.length - 1));
  };

  const goBack = () => setCurrentStep((s) => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    if (!user) return;

    // Note: We'll handle any duplicates seamlessly in the submission process
    // No need to block re-submissions - the system will update existing applications

    // Final validation
    if (!canProceedFromStep(5)) {
      toast({
        title: "Consent required",
        description: "You must provide screening consent to submit.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      // Upsert screening profile with documents
      const { error: profileError } = await supabase.from("screening_profiles").upsert([
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
          documents: [...incomeDocuments, ...creditDocuments, ...uploadedDocuments] as any,
          updated_at: new Date().toISOString(),
        },
      ], { onConflict: 'user_id' });
      if (profileError) throw profileError;

      // Upsert screening details (one per user)
      const { error: detailsError } = await supabase
        .from("screening_details")
        .upsert([
          {
            user_id: user.id,
            full_name: `${formData.first_name} ${formData.last_name}`.trim(),
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
            updated_at: new Date().toISOString(),
          },
        ], { onConflict: 'user_id' });
      if (detailsError) throw detailsError;

      // Mark tenant as screened
      await supabase
        .from('profiles')
        .update({ is_tenant_screened: true })
        .eq('user_id', user.id);

      // Submit application - handle duplicates seamlessly
      // First, remove any existing application to prevent duplicate key errors
      await supabase
        .from("applications")
        .delete()
        .eq("tenant_id", user.id)
        .eq("property_id", propertyId)
        .neq("status", "accepted");

      // Now insert the new application
      const { data, error } = await supabase
        .from("applications")
        .insert({
          tenant_id: user.id,
          landlord_id: landlordId,
          property_id: propertyId,
          status: "pending" as const,
        })
        .select()
        .single();

      if (error) throw error;
      const applicationId = data?.id ?? null;

      // Mark invite used
      if (inviteId) {
        await supabase
          .from("application_invites")
          .update({ status: "used", used_at: new Date().toISOString() })
          .eq("id", inviteId);
      }

      // Trigger credit check
      if (applicationId) {
        try {
          await supabase.functions.invoke("trigger-credit-check", {
            body: { application_id: applicationId, tenant_id: user.id },
          });
        } catch (err) {
          console.warn("Credit check trigger failed", err);
        }
      }

      toast({
        title: "Application submitted",
        description: "We will run a credit check and update your status shortly.",
      });

      if (onSubmissionComplete) onSubmissionComplete();
      else navigate("/enhancedtenantdashboard");
    } catch (error: any) {
      console.error("Submit application error", error);
      toast({
        title: "Submission failed",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Allow re-applications for all statuses except accepted/declined
  if (existingApplication && ['accepted', 'declined'].includes(existingApplication.status)) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Application Status</CardTitle>
          <CardDescription>Your application for this property</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-lg mb-2">Application {existingApplication.status}</p>
            <p className="text-sm text-muted-foreground mb-4">
              Status: <span className="capitalize font-medium">{existingApplication.status}</span>
            </p>
            <Button variant="outline" onClick={() => navigate("/tenant-dashboard")}>Go to Dashboard</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const StepIndicator = () => (
    <div className="w-full">
      {/* Desktop/Tablet progress bar */}
      <div className="hidden sm:flex items-center justify-between gap-2">
        {steps.map((s, idx) => (
          <div key={s.key} className="flex-1">
            <div className={`h-1 rounded-full ${idx <= currentStep ? "bg-primary" : "bg-muted"}`} />
            <div className="mt-2 text-xs text-muted-foreground text-center">{s.title}</div>
          </div>
        ))}
      </div>
      {/* Mobile: scrollable chips */}
      <div className="sm:hidden -mx-2 px-2 overflow-x-auto pb-2">
        <div className="flex gap-2 snap-x snap-mandatory">
          {steps.map((s, idx) => (
            <div
              key={s.key}
              className={`shrink-0 snap-start px-3 py-1.5 rounded-full text-xs border ${idx === currentStep ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-foreground border-muted"}`}
            >
              {s.title}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const NextBack = ({ onSubmit = false }: { onSubmit?: boolean }) => (
    <div className="flex gap-3 pt-6">
      {currentStep > 0 && (
        <Button type="button" variant="secondary" onClick={goBack} disabled={submitting}>
          Back
        </Button>
      )}
      <div className="ml-auto flex gap-3">
        {currentStep < steps.length - 1 && (
          <Button type="button" onClick={goNext} disabled={submitting}>
            Next
          </Button>
        )}
        {onSubmit && (
          <Button type="button" className="min-w-40" onClick={handleSubmit} disabled={submitting || !formData.screening_consent}>
            {submitting ? "Submitting..." : "Submit Application"}
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Rental Application</CardTitle>
        <CardDescription>Complete each step to submit your application.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          <StepIndicator />

          {/* Step 1: Personal Information */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input id="first_name" value={formData.first_name} onChange={(e) => handleInputChange("first_name", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="middle_name">Middle Name</Label>
                  <Input id="middle_name" value={formData.middle_name} onChange={(e) => handleInputChange("middle_name", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input id="last_name" value={formData.last_name} onChange={(e) => handleInputChange("last_name", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="id_number">ID Number *</Label>
                  <Input id="id_number" value={formData.id_number} onChange={(e) => handleInputChange("id_number", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input id="phone" type="tel" value={formData.phone} onChange={(e) => handleInputChange("phone", e.target.value)} />
                </div>
              </div>
              <NextBack />
            </div>
          )}

          {/* Step 2: Employment Information */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Employment Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="employment_status">Employment Status *</Label>
                  <Select value={formData.employment_status} onValueChange={(v) => handleInputChange("employment_status", v)}>
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
                  <Input id="net_monthly_income" type="number" value={formData.net_monthly_income} onChange={(e) => handleInputChange("net_monthly_income", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="job_title">Job Title</Label>
                  <Input id="job_title" value={formData.job_title} onChange={(e) => handleInputChange("job_title", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="company_name">Company Name</Label>
                  <Input id="company_name" value={formData.company_name} onChange={(e) => handleInputChange("company_name", e.target.value)} />
                </div>
              </div>
              <NextBack />
            </div>
          )}

          {/* Step 3: Residence Information */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Current Residence</h3>
              <div>
                <Label htmlFor="current_address">Current Address *</Label>
                <Textarea id="current_address" value={formData.current_address} onChange={(e) => handleInputChange("current_address", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="reason_for_moving">Reason for Moving</Label>
                <Textarea id="reason_for_moving" value={formData.reason_for_moving} onChange={(e) => handleInputChange("reason_for_moving", e.target.value)} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="previous_landlord_name">Previous Landlord Name</Label>
                  <Input id="previous_landlord_name" value={formData.previous_landlord_name} onChange={(e) => handleInputChange("previous_landlord_name", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="previous_landlord_contact">Previous Landlord Contact</Label>
                  <Input id="previous_landlord_contact" value={formData.previous_landlord_contact} onChange={(e) => handleInputChange("previous_landlord_contact", e.target.value)} />
                </div>
              </div>
              <NextBack />
            </div>
          )}

          {/* Step 4: Supporting Documents */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Supporting Documents</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Upload supporting documents to strengthen your application. All documents are optional but recommended.
                </p>
              </div>

              {/* Experian Credit Check */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-base">Experian Credit Check (Free)</CardTitle>
                  <CardDescription className="space-y-3">
                    <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-3 rounded-lg">
                      <p className="text-sm font-medium text-primary">
                        ✨ Check your Experian Credit Report for FREE in under 5 minutes — instantly downloadable and ready to upload to your SwiftRent application for landlord review. ✨
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground leading-relaxed">
                      <strong>Disclaimer:</strong> SwiftRent provides this link for your convenience. Credit reports and related services are offered directly by Experian Credit Bureau South Africa. SwiftRent does not manage or store this information. This is a free service under the National Credit Act. Reports are generally available in less than 5 minutes and can be added to your rental documents for landlord review.
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    type="button"
                    className="w-full"
                    onClick={() => window.open('https://up.experian.co.za', '_blank', 'noopener,noreferrer')}
                  >
                    Get My Free Experian Credit Report
                  </Button>
                  
                  <div className="space-y-2">
                    <Label htmlFor="experian-upload">Upload your Experian Credit Report (PDF only)</Label>
                    <Input
                      id="experian-upload"
                      type="file"
                      accept=".pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.type !== 'application/pdf') {
                            toast({ 
                              variant: 'destructive', 
                              title: 'Invalid file type', 
                              description: 'Please upload a PDF file from Experian.' 
                            });
                            return;
                          }
                          if (file.size > 10 * 1024 * 1024) { // 10MB
                            toast({ 
                              variant: 'destructive', 
                              title: 'File too large', 
                              description: 'File is larger than 10 MB. Please compress and try again.' 
                            });
                            return;
                          }
                          uploadDocument(file, 'experian_credit_report');
                        }
                      }}
                      disabled={uploading}
                    />
                    <p className="text-xs text-muted-foreground">
                      Please upload the PDF you downloaded from Experian. Max 10 MB.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Income Documents */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Income Documents</CardTitle>
                    <CardDescription>
                      Payslips, bank statements, employment letter
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="income-upload">Upload Income Documents</Label>
                        <Input
                          id="income-upload"
                          type="file"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          multiple
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            files.forEach(file => uploadDocument(file, 'income'));
                          }}
                          disabled={uploading}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Accepted formats: PDF, DOC, DOCX, JPG, PNG
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* ID Documents */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Identity Documents</CardTitle>
                    <CardDescription>
                      ID copy, passport, driver's license
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="id-upload">Upload ID Documents</Label>
                        <Input
                          id="id-upload"
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          multiple
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            files.forEach(file => uploadDocument(file, 'id'));
                          }}
                          disabled={uploading}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Accepted formats: PDF, JPG, PNG
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Document Lists */}
                {incomeDocuments.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Income Documents</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {incomeDocuments.map((doc, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center space-x-3">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">{doc.name}</p>
                                <p className="text-xs text-muted-foreground capitalize">
                                  Income document
                                </p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeDocument(index, 'income')}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Credit Documents List */}
                {creditDocuments.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Credit Documents</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {creditDocuments.map((doc, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center space-x-3">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">{doc.name}</p>
                                <p className="text-xs text-muted-foreground capitalize">
                                  Experian Credit Report
                                </p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeDocument(index, 'credit')}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Other Documents List */}
                {uploadedDocuments.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Other Documents</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {uploadedDocuments.map((doc, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center space-x-3">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">{doc.name}</p>
                                <p className="text-xs text-muted-foreground capitalize">
                                  {doc.type} document
                                </p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeDocument(index, 'other')}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

              {uploading && (
                <div className="flex items-center justify-center p-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  <span className="ml-2 text-sm">Uploading documents...</span>
                </div>
              )}

              <NextBack />
            </div>
          )}

          {/* Step 5: Additional Information */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Additional Information</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="has_pets"
                    checked={formData.has_pets}
                    onCheckedChange={(checked) => handleInputChange("has_pets", !!checked)}
                  />
                  <Label htmlFor="has_pets">Do you have pets?</Label>
                </div>
                {formData.has_pets && (
                  <div>
                    <Label htmlFor="pet_details">Pet Details</Label>
                    <Textarea
                      id="pet_details"
                      placeholder="Please describe your pets (type, breed, age, etc.)"
                      value={formData.pet_details}
                      onChange={(e) => handleInputChange("pet_details", e.target.value)}
                    />
                  </div>
                )}
              </div>
              <NextBack />
            </div>
          )}

          {/* Step 6: Consent */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Screening Consent</h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="screening_consent"
                    checked={formData.screening_consent}
                    onCheckedChange={(checked) => handleInputChange("screening_consent", !!checked)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="screening_consent" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      I consent to background and credit screening *
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      By checking this box, you authorize us to conduct background and credit checks as part of the application process.
                      This information will be used solely for rental application evaluation purposes.
                    </p>
                  </div>
                </div>
              </div>
              <NextBack onSubmit />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
