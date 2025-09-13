import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ArrowRight, Calendar, DollarSign, FileText, Send, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface TemplateLeaseWorkflowProps {
  propertyId: string;
  onBack: () => void;
  onComplete: () => void;
  selectedTenant?: { 
    id: string; 
    name: string;
    id_number?: string;
    email?: string;
    phone?: string;
    current_address?: string;
  } | null;
}

interface TemplateLeaseData {
  leaseType: 'fixed' | 'month-to-month';
  startDate: string;
  endDate: string;
  monthlyRent: string;
  securityDeposit: string;
  dueDay: string;
  selectedClauses: string[];
  customClauses: string;
  // Landlord information
  landlordName?: string;
  landlordIdNumber?: string;
  landlordCompany?: string;
  landlordEmail?: string;
  landlordPhone?: string;
  landlordAddress?: string;
  // Property information
  propertyAddress?: string;
  propertyUnit?: string;
  propertyCity?: string;
  propertyProvince?: string;
  propertyPostalCode?: string;
  propertyType?: string;
  propertyParking?: string;
  // Terms
  optionToRenew?: boolean;
  noticePeriodDays?: number;
  // Rent details
  rentDueDay?: number;
  paymentMethod?: string;
  lateFeeGraceDays?: number;
  lateFeeAmount?: number;
  lateFeePercent?: number;
  // Deposit
  depositReturnDays?: number;
  // Utilities
  waterResponsibility?: string;
  electricityResponsibility?: string;
  internetResponsibility?: string;
  otherUtilities?: string;
  // Maintenance
  tenantMinorRepairsCap?: number;
  landlordMaintenanceResponsible?: string;
  // Access
  entryNoticeHours?: number;
  // Legal
  governingLaw?: string;
  // Attachments
  moveInInspectionRequired?: boolean;
  annexures?: string;
}

const commonClauses = [
  { id: 'no-smoking', title: 'No Smoking Clause', description: 'Prohibits smoking in the rental property' },
  { id: 'pet-policy', title: 'Pet Policy Addendum', description: 'Defines rules and restrictions for pets' },
  { id: 'late-fee', title: 'Late Fee Policy', description: 'Specifies late payment fees and grace periods' },
  { id: 'maintenance', title: 'Maintenance Responsibilities', description: 'Defines tenant and landlord maintenance duties' },
  { id: 'utilities', title: 'Utilities Agreement', description: 'Specifies which utilities are included/excluded' },
  { id: 'parking', title: 'Parking Policy', description: 'Rules for parking spaces and vehicle registration' }
];

export const TemplateLeaseWorkflow = ({ 
  propertyId, 
  onBack, 
  onComplete,
  selectedTenant 
}: TemplateLeaseWorkflowProps) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [leaseData, setLeaseData] = useState<TemplateLeaseData>({
    leaseType: 'fixed',
    startDate: '',
    endDate: '',
    monthlyRent: '',
    securityDeposit: '',
    dueDay: '1',
    selectedClauses: [],
    customClauses: ''
  });

  // Step-specific validation
  const isStepValid = (stepNumber: number) => {
    switch (stepNumber) {
      case 1: // Basic Info
        return leaseData.monthlyRent && leaseData.securityDeposit && leaseData.startDate;
      case 2: // Property Details
        return leaseData.propertyAddress && leaseData.propertyCity && leaseData.propertyProvince;
      case 3: // Landlord Details
        return leaseData.landlordName && leaseData.landlordIdNumber && leaseData.landlordEmail && leaseData.landlordPhone;
      case 4: // Clauses
        return true; // Clauses are optional
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (isStepValid(currentStep) && currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClauseToggle = (clauseId: string) => {
    setLeaseData(prev => ({
      ...prev,
      selectedClauses: prev.selectedClauses.includes(clauseId)
        ? prev.selectedClauses.filter(id => id !== clauseId)
        : [...prev.selectedClauses, clauseId]
    }));
  };

  const handleGenerateAndSend = async () => {
    console.log("Button clicked - handleGenerateAndSend called");
    console.log("Current user:", user);
    console.log("Property ID:", propertyId);
    console.log("Selected tenant:", selectedTenant);
    console.log("Lease data:", leaseData);
    
    if (!user) {
      console.error("No user found");
      toast.error("You must be logged in to generate a lease");
      return;
    }

    if (!selectedTenant) {
      console.error("No tenant selected for lease generation");
      console.log("Available props:", { propertyId, selectedTenant });
      toast.error("No tenant selected. Please select a tenant from the applications tab first.");
      return;
    }
    
    // Validate lease data
    if (!leaseData.monthlyRent || !leaseData.securityDeposit || !leaseData.startDate) {
      console.error("Missing required lease data:", leaseData);
      toast.error("Please fill in all required fields");
      return;
    }
    
    setIsGenerating(true);
    try {
      console.log("Starting lease generation for property:", propertyId);
      console.log("Selected tenant for lease:", selectedTenant);
      
      // Prepare lease data in the new format
      const selectedClauseObjects = leaseData.selectedClauses.map((id) => {
        const clause = commonClauses.find(c => c.id === id);
        return clause ? { id: clause.id, title: clause.title, description: clause.description } : { id, title: id, description: '' };
      });
      const additionalCustom = leaseData.customClauses?.trim()
        ? [{ id: 'custom', title: 'Additional Custom Clauses', description: leaseData.customClauses.trim() }]
        : [];
      const customClausesPayload = [...selectedClauseObjects, ...additionalCustom];

      const newLeaseData = {
        landlord: {
          name: leaseData.landlordName || 'Landlord',
          id_number: leaseData.landlordIdNumber || '',
          company: leaseData.landlordCompany || '',
          email: leaseData.landlordEmail || '',
          phone: leaseData.landlordPhone || '',
          address: leaseData.landlordAddress || '',
        },
        tenant: {
          name: selectedTenant.name || '',
          id_number: selectedTenant.id_number || '',
          email: selectedTenant.email || '', // Use selected tenant's email from application
          phone: selectedTenant.phone || '',
          current_address: selectedTenant.current_address || '',
          occupants: [],
        },
        property: {
          address: leaseData.propertyAddress || '',
          unit: leaseData.propertyUnit || '',
          city: leaseData.propertyCity || 'Cape Town',
          province: leaseData.propertyProvince || 'Western Cape',
          postal_code: leaseData.propertyPostalCode || '',
          type: (leaseData.propertyType as 'apartment' | 'house' | 'townhouse') || 'apartment',
          parking: (leaseData.propertyParking as 'N/A' | '1 bay' | '2 bays') || 'N/A',
        },
        term: {
          start_date: leaseData.startDate,
          end_date: leaseData.leaseType === 'month-to-month' ? '' : leaseData.endDate,
          option_to_renew: leaseData.optionToRenew || true,
          notice_period_days: leaseData.noticePeriodDays || 30,
        },
        rent: {
          monthly_rent: parseFloat(leaseData.monthlyRent),
          due_day: leaseData.rentDueDay || 1,
          payment_method: (leaseData.paymentMethod as 'EFT' | 'Cash' | 'Cheque') || 'EFT',
          late_fee_policy: {
            grace_days: leaseData.lateFeeGraceDays || 7,
            late_fee_fixed: parseFloat(leaseData.lateFeeAmount?.toString() || '250') || 250,
            late_fee_percent: parseFloat(leaseData.lateFeePercent?.toString() || '0') || 0,
          },
        },
        deposit: {
          amount: parseFloat(leaseData.securityDeposit),
          return_days: leaseData.depositReturnDays || 30,
        },
        utilities: {
          water: (leaseData.waterResponsibility as 'tenant' | 'landlord' | 'included') || 'tenant',
          electricity: (leaseData.electricityResponsibility as 'tenant' | 'landlord' | 'included') || 'tenant',
          internet: (leaseData.internetResponsibility as 'tenant' | 'landlord' | 'included') || 'tenant',
          other: leaseData.otherUtilities || '',
        },
        maintenance: {
          tenant_minor_repairs_cap: parseFloat(leaseData.tenantMinorRepairsCap?.toString() || '500') || 500,
          landlord_responsible: leaseData.landlordMaintenanceResponsible || ['Structural repairs', 'Plumbing issues', 'Electrical problems'],
        },
        access: {
          entry_notice_hours: leaseData.entryNoticeHours || 24,
        },
        governing_law: leaseData.governingLaw || 'South African law',
        attachments: {
          move_in_inspection_required: leaseData.moveInInspectionRequired || false,
          annexures: leaseData.annexures || [],
        },
        branding: {
          logo_url: 'https://swiftrent.co.za/logo.png',
          primary_hex: '#2563eb',
          secondary_hex: '#1d4ed8',
          font_family: 'Helvetica'
        },
        clauses: customClausesPayload,
      };

      // Use the new lease management system
      console.log("Calling lease-management function...");
      const { data, error } = await supabase.functions.invoke('lease-management', {
        body: {
          action: 'generate',
          property_id: propertyId,
          tenant_user_id: selectedTenant.id,
          lease_data: newLeaseData
        }
      });

      if (error) {
        console.error('Lease generation error:', error);
        let errorMessage = (error as any)?.message || 'Failed to generate lease';
        try {
          const body: any = (error as any)?.context?.body;
          if (typeof body === 'string') {
            try {
              const parsed = JSON.parse(body);
              errorMessage = parsed.error || parsed.message || errorMessage;
            } catch {}
          }
        } catch {}
        throw new Error(errorMessage);
      }
      
      if ((data as any)?.error) {
        console.error('Lease generation data error:', (data as any).error);
        throw new Error((data as any).error);
      }

      console.log("Lease generated successfully:", data);

      // Backend function updates tenancy with lease_document_path and sets status to 'awaiting_tenant_signature'
      // No additional update needed here.

      // TODO: Send notification to tenant about lease ready for signing
      // This would typically send an email or in-app notification to the tenant
      console.log(`Lease ready for tenant ${selectedTenant.id} to sign: ${data.documentUrl}`);

      toast.success("Lease generated successfully! Tenant will be notified to sign.");
      onComplete();
    } catch (error) {
      console.error('Error generating lease:', error);
      toast.error(`Failed to generate lease: ${error.message || "Unknown error"}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Define Lease Terms
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-base font-medium">Lease Type</Label>
                <RadioGroup 
                  value={leaseData.leaseType} 
                  onValueChange={(value) => setLeaseData(prev => ({ ...prev, leaseType: value as 'fixed' | 'month-to-month' }))}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fixed" id="fixed" />
                    <Label htmlFor="fixed">Fixed term</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="month-to-month" id="month-to-month" />
                    <Label htmlFor="month-to-month">Month-to-month</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Lease Start/Move-in Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={leaseData.startDate}
                    onChange={(e) => setLeaseData(prev => ({ ...prev, startDate: e.target.value }))}
                    required
                    className="border-2 border-gray-300 focus:border-blue-500"
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">Lease End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={leaseData.endDate}
                    onChange={(e) => setLeaseData(prev => ({ ...prev, endDate: e.target.value }))}
                    disabled={leaseData.leaseType === 'month-to-month'}
                    required={leaseData.leaseType === 'fixed'}
                    className="border-2 border-gray-300 focus:border-blue-500"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Set Financials
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="monthlyRent">Monthly Rent (ZAR)</Label>
                  <Input
                    id="monthlyRent"
                    type="number"
                    placeholder="5000"
                    value={leaseData.monthlyRent}
                    onChange={(e) => setLeaseData(prev => ({ ...prev, monthlyRent: e.target.value }))}
                    required
                    className="border-2 border-gray-300 focus:border-blue-500"
                  />
                </div>
                <div>
                  <Label htmlFor="securityDeposit">Security Deposit (ZAR)</Label>
                  <Input
                    id="securityDeposit"
                    type="number"
                    placeholder="5000"
                    value={leaseData.securityDeposit}
                    onChange={(e) => setLeaseData(prev => ({ ...prev, securityDeposit: e.target.value }))}
                    required
                    className="border-2 border-gray-300 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="dueDay">Rent Due Day of Month</Label>
                <Input
                  id="dueDay"
                  type="number"
                  min="1"
                  max="31"
                  placeholder="1"
                  value={leaseData.dueDay}
                  onChange={(e) => setLeaseData(prev => ({ ...prev, dueDay: e.target.value }))}
                  required
                  className="border-2 border-gray-300 focus:border-blue-500"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Enter the day of the month when rent is due (e.g., 1, 15, 30)
                </p>
              </div>
            </CardContent>
          </Card>
        );

      case 3:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Add Clauses & Rules
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-base font-medium">Common Clauses</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Select the clauses you want to include in your lease agreement:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {commonClauses.map((clause) => (
                    <div key={clause.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                      <Checkbox
                        id={clause.id}
                        checked={leaseData.selectedClauses.includes(clause.id)}
                        onCheckedChange={() => handleClauseToggle(clause.id)}
                      />
                      <div className="flex-1">
                        <Label htmlFor={clause.id} className="font-medium">
                          {clause.title}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {clause.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="customClauses">Custom Clauses</Label>
                <Textarea
                  id="customClauses"
                  placeholder="Enter any additional custom clauses or terms..."
                  value={leaseData.customClauses}
                  onChange={(e) => setLeaseData(prev => ({ ...prev, customClauses: e.target.value }))}
                  rows={6}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Add any specific terms, conditions, or clauses unique to this property or tenancy.
                </p>
              </div>
            </CardContent>
          </Card>
        );

      case 4:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Review & Send
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-3">Lease Summary</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="font-medium">Type:</span> {leaseData.leaseType === 'fixed' ? 'Fixed Term' : 'Month-to-Month'}</div>
                  <div><span className="font-medium">Start Date:</span> {leaseData.startDate}</div>
                  {leaseData.leaseType === 'fixed' && (
                    <div><span className="font-medium">End Date:</span> {leaseData.endDate}</div>
                  )}
                  <div><span className="font-medium">Monthly Rent:</span> R{leaseData.monthlyRent}</div>
                  <div><span className="font-medium">Security Deposit:</span> R{leaseData.securityDeposit}</div>
                  <div><span className="font-medium">Due Day:</span> {leaseData.dueDay} of each month</div>
                </div>
                
                {leaseData.selectedClauses.length > 0 && (
                  <div className="mt-3">
                    <span className="font-medium">Selected Clauses:</span>
                    <ul className="list-disc list-inside text-sm mt-1">
                      {leaseData.selectedClauses.map(clauseId => {
                        const clause = commonClauses.find(c => c.id === clauseId);
                        return <li key={clauseId}>{clause?.title}</li>;
                      })}
                    </ul>
                  </div>
                )}
                
                {leaseData.customClauses && (
                  <div className="mt-3">
                    <span className="font-medium">Custom Clauses:</span>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{leaseData.customClauses}</p>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h5 className="font-medium text-blue-900 mb-2">Next Steps</h5>
                <p className="text-sm text-blue-800">
                  Once you generate the lease, it will be ready for digital signing. Both you and your tenant will be able to review and sign the document electronically.
                </p>
              </div>

              <Button 
                onClick={handleGenerateAndSend}
                disabled={isGenerating}
                className="w-full"
                size="lg"
              >
                {isGenerating ? "Generating Lease..." : "Generate & Send for Signing"}
              </Button>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Options
        </Button>
        <div className="flex-1">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Step {currentStep} of 4</span>
            <span>{Math.round((currentStep / 4) * 100)}% complete</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 mt-1">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 4) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Selected Tenant Info */}
      {selectedTenant && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-green-600 rounded-full">
              <Check className="h-3 w-3 text-white" />
            </div>
            <p className="text-sm font-medium text-green-800">
              Creating lease for: <span className="font-semibold">{selectedTenant.name}</span>
            </p>
          </div>
        </div>
      )}

      {renderStepContent()}

      <div className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={handlePrevious}
          disabled={currentStep === 1}
        >
          Previous
        </Button>
        
        {currentStep < 4 && (
          <div className="flex flex-col items-end gap-2">
            <Button onClick={handleNext} disabled={!isStepValid(currentStep)}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            {!isStepValid(currentStep) && (
              <p className="text-xs text-muted-foreground">Complete required fields to continue</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};