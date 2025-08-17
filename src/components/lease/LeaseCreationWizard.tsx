import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Upload, ArrowRight } from "lucide-react";
import { TemplateLeaseWorkflow } from "./TemplateLeaseWorkflow";
import { UploadLeaseWorkflow } from "./UploadLeaseWorkflow";

interface LeaseCreationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  onLeaseCreated?: () => void;
  selectedTenant?: { id: string; name: string } | null;
}

type WorkflowType = 'template' | 'upload' | null;

export const LeaseCreationWizard = ({
  isOpen,
  onClose,
  propertyId,
  onLeaseCreated,
  selectedTenant
}: LeaseCreationWizardProps) => {
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowType>(null);

  const handleWorkflowSelect = (type: WorkflowType) => {
    setSelectedWorkflow(type);
  };

  const handleBack = () => {
    setSelectedWorkflow(null);
  };

  const handleComplete = () => {
    onLeaseCreated?.();
    onClose();
    setSelectedWorkflow(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Lease Agreement</DialogTitle>
        </DialogHeader>

        {!selectedWorkflow ? (
          <div className="space-y-6">
            <p className="text-muted-foreground">
              Choose how you'd like to create your lease agreement:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card 
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => handleWorkflowSelect('template')}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Use Our Template</CardTitle>
                      <CardDescription>
                        Create a lease using our pre-built South African template
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Legally compliant South African lease</li>
                    <li>• Step-by-step guided setup</li>
                    <li>• Pre-written clauses library</li>
                    <li>• Custom clause editor</li>
                  </ul>
                  <Button className="w-full mt-4 group">
                    Get Started
                    <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => handleWorkflowSelect('upload')}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Upload className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Upload Your Own</CardTitle>
                      <CardDescription>
                        Use your own lease agreement document
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Upload PDF or DOCX files</li>
                    <li>• Add signature fields visually</li>
                    <li>• Maintain your custom format</li>
                    <li>• Digital signing integration</li>
                  </ul>
                  <Button className="w-full mt-4 group">
                    Upload Document
                    <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : selectedWorkflow === 'template' ? (
          <TemplateLeaseWorkflow
            propertyId={propertyId}
            onBack={handleBack}
            onComplete={handleComplete}
            selectedTenant={selectedTenant}
          />
        ) : (
          <UploadLeaseWorkflow
            propertyId={propertyId}
            onBack={handleBack}
            onComplete={handleComplete}
            selectedTenant={selectedTenant}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};