import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { LeasePack } from "../types";
import { PartiesStep } from "./wizard/PartiesStep";
import { PropertyTermStep } from "./wizard/PropertyTermStep";
import { RentDepositStep } from "./wizard/RentDepositStep";
import { UtilitiesMaintenanceStep } from "./wizard/UtilitiesMaintenanceStep";
import { ReviewSignStep } from "./wizard/ReviewSignStep";

interface LeaseWizardProps {
  onComplete: (leasePack: LeasePack) => void;
  onCancel: () => void;
  initialData?: Partial<LeasePack>;
}

const STEPS = [
  { id: 1, title: "Parties", component: PartiesStep },
  { id: 2, title: "Property & Term", component: PropertyTermStep },
  { id: 3, title: "Rent & Deposit", component: RentDepositStep },
  { id: 4, title: "Utilities & Maintenance", component: UtilitiesMaintenanceStep },
  { id: 5, title: "Review & Sign", component: ReviewSignStep },
];

export function LeaseWizard({ onComplete, onCancel, initialData }: LeaseWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [leasePack, setLeasePack] = useState<Partial<LeasePack>>(initialData || {
    core: {
      leaseId: `LSE-${Date.now()}`,
      propertyAddress: "",
      propertyType: "apartment",
      startDate: "",
      endDate: "",
      noticeDays: 30,
      monthlyRentZAR: 0,
      rentDueDay: 1,
      paymentMethod: "SwiftRent",
      depositZAR: 0,
      depositHeldIn: "Trust",
      depositRefundDays: 14,
      utilities: {
        water: "tenant",
        electricity: "tenant",
        refuse: "tenant",
        internet: "tenant"
      },
      conditionReportRequired: true,
      petsAllowed: false,
      maxOccupants: 2,
      maintenanceMinorRepairLimitZAR: 500,
      governingLaw: "South Africa"
    },
    parties: {
      landlord: { fullName: "", idNumber: "", email: "" },
      tenant: { fullName: "", idNumber: "", email: "" }
    },
    consent: {
      eSignConsentVersion: "1.0-ZA"
    },
    signatures: {
      tenant: {},
      landlord: {},
      initials: []
    },
    auditLog: [],
    pdf: {
      version: "v1.0"
    }
  });

  const progress = (currentStep / STEPS.length) * 100;
  const CurrentStepComponent = STEPS[currentStep - 1]?.component;

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepComplete = (stepData: Partial<LeasePack>) => {
    const updatedPack = { ...leasePack, ...stepData };
    setLeasePack(updatedPack);
    
    if (currentStep === STEPS.length) {
      onComplete(updatedPack as LeasePack);
    } else {
      handleNext();
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>SwiftRent Professional Lease Agreement</span>
            <span className="text-sm font-normal text-muted-foreground">
              Step {currentStep} of {STEPS.length}
            </span>
          </CardTitle>
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <div className="flex justify-between text-sm text-muted-foreground">
              {STEPS.map((step) => (
                <span 
                  key={step.id}
                  className={`${currentStep >= step.id ? 'text-primary font-medium' : ''}`}
                >
                  {step.title}
                </span>
              ))}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {CurrentStepComponent && (
            <CurrentStepComponent
              data={leasePack}
              onComplete={handleStepComplete}
            />
          )}
          
          <div className="flex justify-between pt-6 border-t">
            <Button
              variant="outline"
              onClick={currentStep === 1 ? onCancel : handlePrev}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              {currentStep === 1 ? "Cancel" : "Previous"}
            </Button>
            
            <div className="text-sm text-muted-foreground self-center">
              Lease ID: {leasePack.core?.leaseId}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}