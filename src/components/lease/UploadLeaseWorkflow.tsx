import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Upload, FileText, MousePointer, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface UploadLeaseWorkflowProps {
  propertyId: string;
  onBack: () => void;
  onComplete: () => void;
  selectedTenant?: { id: string; name: string } | null;
}

interface SignatureField {
  id: string;
  type: 'landlord-signature' | 'tenant-signature' | 'landlord-date' | 'tenant-date';
  x: number;
  y: number;
  width: number;
  height: number;
}

export const UploadLeaseWorkflow = ({ 
  propertyId, 
  onBack, 
  onComplete,
  selectedTenant 
}: UploadLeaseWorkflowProps) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string>('');
  const [signatureFields, setSignatureFields] = useState<SignatureField[]>([]);
  const [selectedFieldType, setSelectedFieldType] = useState<SignatureField['type']>('landlord-signature');
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentViewerRef = useRef<HTMLDivElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload a PDF or DOCX file");
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setUploadedFile(file);
    await uploadDocument(file);
  };

  const uploadDocument = async (file: File) => {
    if (!user) return;

    setIsUploading(true);
    try {
      const fileName = `${user.id}/${propertyId}/lease-${Date.now()}.${file.name.split('.').pop()}`;
      
      const { data, error } = await supabase.storage
        .from('lease-documents')
        .upload(fileName, file);

      if (error) throw error;

      setDocumentUrl(data.path);
      setCurrentStep(2);
      toast.success("Document uploaded successfully!");
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error("Failed to upload document");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDocumentClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!documentViewerRef.current) return;

    const rect = documentViewerRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    const newField: SignatureField = {
      id: `field-${Date.now()}`,
      type: selectedFieldType,
      x,
      y,
      width: selectedFieldType.includes('signature') ? 15 : 10,
      height: selectedFieldType.includes('signature') ? 8 : 5
    };

    setSignatureFields(prev => [...prev, newField]);
  };

  const removeSignatureField = (fieldId: string) => {
    setSignatureFields(prev => prev.filter(field => field.id !== fieldId));
  };

  const handleSendForSigning = async () => {
    if (!user || !documentUrl) return;

    setIsSending(true);
    try {
      // Create a tenancy record with the uploaded document
      const { data: tenancy, error: tenancyError } = await supabase
        .from('tenancies')
        .insert({
          property_id: propertyId,
          landlord_id: user.id,
          tenant_id: selectedTenant?.id || user.id, // Use selected tenant if available
          monthly_rent: 0, // Will be filled in later
          security_deposit: 0, // Will be filled in later
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
          lease_status: 'awaiting_tenant_signature',
          lease_document_path: documentUrl // Changed from lease_document_url to lease_document_path
        })
        .select()
        .single();

      if (tenancyError) throw tenancyError;

      // Store signature field positions (in a real app, you'd save this metadata)
      console.log('Signature fields:', signatureFields);

      toast.success("Document prepared for signing!");
      onComplete();
    } catch (error) {
      console.error('Error preparing document:', error);
      toast.error("Failed to prepare document for signing");
    } finally {
      setIsSending(false);
    }
  };

  const fieldTypeLabels = {
    'landlord-signature': 'Landlord Signature',
    'tenant-signature': 'Tenant Signature',
    'landlord-date': 'Landlord Date',
    'tenant-date': 'Tenant Date'
  };

  const fieldTypeColors = {
    'landlord-signature': 'bg-blue-500',
    'tenant-signature': 'bg-green-500',
    'landlord-date': 'bg-blue-300',
    'tenant-date': 'bg-green-300'
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Document
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Upload your lease agreement</h3>
                <p className="text-muted-foreground mb-4">
                  Drag and drop your PDF or DOCX file here, or click to browse
                </p>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? "Uploading..." : "Choose File"}
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  Maximum file size: 10MB
                </p>
              </div>

              {uploadedFile && (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <FileText className="h-5 w-5" />
                  <div className="flex-1">
                    <p className="font-medium">{uploadedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MousePointer className="h-5 w-5" />
                Tag Fields for Signing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h5 className="font-medium text-blue-900 mb-2">How to add signature fields:</h5>
                <ol className="text-sm text-blue-800 space-y-1">
                  <li>1. Select the field type you want to add</li>
                  <li>2. Click on the document where you want to place it</li>
                  <li>3. Repeat for all required signatures and dates</li>
                  <li>4. Click "Send for Signing" when done</li>
                </ol>
              </div>

              <div>
                <Label className="text-base font-medium">Field Type</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                  {Object.entries(fieldTypeLabels).map(([type, label]) => (
                    <Button
                      key={type}
                      variant={selectedFieldType === type ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedFieldType(type as SignatureField['type'])}
                      className="text-xs"
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted/50 p-3 border-b">
                  <p className="text-sm font-medium">
                    Document Preview - Click to add {fieldTypeLabels[selectedFieldType]}
                  </p>
                </div>
                <div 
                  ref={documentViewerRef}
                  className="relative bg-white aspect-[8.5/11] cursor-crosshair"
                  onClick={handleDocumentClick}
                >
                  {/* Placeholder document preview */}
                  <div className="w-full h-full p-8 text-gray-400 text-sm">
                    <div className="text-center mb-8">
                      <h2 className="text-xl font-bold mb-4">LEASE AGREEMENT</h2>
                      <p>Your uploaded document will be displayed here for field placement.</p>
                    </div>
                    <div className="space-y-4">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-full"></div>
                      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  </div>

                  {/* Signature fields overlay */}
                  {signatureFields.map((field) => (
                    <div
                      key={field.id}
                      className={`absolute border-2 border-dashed ${fieldTypeColors[field.type]} opacity-75 cursor-pointer group`}
                      style={{
                        left: `${field.x}%`,
                        top: `${field.y}%`,
                        width: `${field.width}%`,
                        height: `${field.height}%`
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSignatureField(field.id);
                      }}
                    >
                      <div className="w-full h-full flex items-center justify-center text-xs font-medium text-white bg-black bg-opacity-50">
                        {fieldTypeLabels[field.type]}
                      </div>
                      <div className="absolute -top-6 left-0 bg-red-500 text-white text-xs px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        Click to remove
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {signatureFields.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-base font-medium">Added Fields ({signatureFields.length})</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {Object.entries(fieldTypeLabels).map(([type, label]) => {
                      const count = signatureFields.filter(f => f.type === type).length;
                      return (
                        <div key={type} className="text-sm p-2 bg-muted/50 rounded">
                          <span className="font-medium">{label}:</span> {count}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 3:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Send for Signing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h5 className="font-medium text-green-900 mb-2">Ready to Send!</h5>
                <p className="text-sm text-green-800">
                  Your document has been prepared with signature fields. Once you send it for signing, both parties will receive notifications to review and sign the lease.
                </p>
              </div>

              <Button 
                onClick={handleSendForSigning}
                disabled={isSending || signatureFields.length === 0}
                className="w-full"
                size="lg"
              >
                {isSending ? "Sending..." : "Send for Signing"}
              </Button>

              {signatureFields.length === 0 && (
                <p className="text-sm text-muted-foreground text-center">
                  Please add at least one signature field before sending
                </p>
              )}
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
            <span>Step {currentStep} of 3</span>
            <span>{Math.round((currentStep / 3) * 100)}% complete</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 mt-1">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 3) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {renderStepContent()}

      <div className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
          disabled={currentStep === 1}
        >
          Previous
        </Button>
        
        {currentStep === 2 && (
          <Button onClick={() => setCurrentStep(3)}>
            Proceed to Send
          </Button>
        )}
      </div>
    </div>
  );
};