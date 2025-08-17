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
  selectedTenant?: { id: string; name: string } | null;
}

interface LeaseData {
  leaseType: 'fixed' | 'month-to-month';
  startDate: string;
  endDate: string;
  monthlyRent: string;
  securityDeposit: string;
  dueDay: string;
  selectedClauses: string[];
  customClauses: string;
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
  const [leaseData, setLeaseData] = useState<LeaseData>({
    leaseType: 'fixed',
    startDate: '',
    endDate: '',
    monthlyRent: '',
    securityDeposit: '',
    dueDay: '1',
    selectedClauses: [],
    customClauses: ''
  });

  const handleNext = () => {
    if (currentStep < 4) {
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
      
      // First create a tenancy record
      // Build custom clauses payload from selected common clauses and custom text
      const selectedClauseObjects = leaseData.selectedClauses.map((id) => {
        const clause = commonClauses.find(c => c.id === id);
        return clause ? { id: clause.id, title: clause.title, description: clause.description } : { id, title: id, description: '' };
      });
      const additionalCustom = leaseData.customClauses?.trim()
        ? [{ id: 'custom', title: 'Additional Custom Clauses', description: leaseData.customClauses.trim() }]
        : [];
      const customClausesPayload = [...selectedClauseObjects, ...additionalCustom];

      const { data: tenancy, error: tenancyError } = await supabase
        .from('tenancies')
        .insert({
          property_id: propertyId,
          landlord_id: user.id,
          tenant_id: selectedTenant.id,
          monthly_rent: parseFloat(leaseData.monthlyRent),
          security_deposit: parseFloat(leaseData.securityDeposit),
          start_date: leaseData.startDate,
          end_date: leaseData.leaseType === 'month-to-month' ? null : leaseData.endDate,
          lease_status: 'draft',
          custom_clauses: customClausesPayload
        })
        .select()
        .single();

      if (tenancyError) {
        console.error('Error creating tenancy:', tenancyError);
        throw new Error(`Failed to create tenancy: ${tenancyError.message}`);
      }

      console.log("Tenancy created:", tenancy);

      // Generate the lease document
      console.log("Calling generate-lease function...");
      const { data, error } = await supabase.functions.invoke('generate-lease', {
        body: { 
          tenancyId: tenancy.id,
          leaseData
        }
      });

      if (error) {
        console.error('Error generating lease:', error);
        throw new Error(`Failed to generate lease: ${error.message}`);
      }

      console.log("Lease generated successfully:", data);

      // Backend function updates tenancy with lease_document_path and sets status to 'awaiting_tenant_signature'
      // No additional update needed here.

      // TODO: Send notification to tenant about lease ready for signing
      // This would typically send an email or in-app notification to the tenant
      console.log(`Lease ready for tenant ${tenancy.tenant_id} to sign: ${data.documentUrl}`);

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
          <Button onClick={handleNext}>
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
};