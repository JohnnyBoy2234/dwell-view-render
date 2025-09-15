import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Download, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { LeaseWizard } from "./LeaseWizard";
import { LeasePack } from "../types";

export function LeasePackManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showWizard, setShowWizard] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLeaseComplete = async (leasePack: LeasePack) => {
    setLoading(true);
    try {
      console.log('Completing lease pack:', leasePack.core.leaseId);

      // Generate the professional PDF
      const { data: pdfResult, error: pdfError } = await supabase.functions.invoke('lease-pack-generate', {
        body: { leasePack }
      });

      if (pdfError) {
        throw new Error(`PDF generation failed: ${pdfError.message}`);
      }

      if (!pdfResult?.success) {
        throw new Error('PDF generation failed');
      }

      // Update lease pack with PDF details
      const finalLeasePack = {
        ...leasePack,
        pdf: {
          ...leasePack.pdf,
          finalPath: pdfResult.pdf_path,
          finalSha256: pdfResult.pdf_hash,
          pageCount: pdfResult.page_count || 0
        },
        auditLog: [
          ...leasePack.auditLog,
          {
            actor: 'system' as const,
            event: 'pdf_generated',
            at: new Date().toISOString(),
            details: {
              hash: pdfResult.pdf_hash,
              path: pdfResult.pdf_path,
              url: pdfResult.pdf_url
            }
          }
        ]
      };

      // Store in existing lease_agreements table
      const { data: leaseRecord, error: dbError } = await supabase
        .from('lease_agreements')
        .insert({
          landlord_id: user?.id,
          property_id: 'temp-property-id', // TODO: Get from context/props
          lease_data: finalLeasePack,
          pdf_path: pdfResult.pdf_path,
          pdf_url: pdfResult.pdf_url,
          status: 'completed'
        })
        .select()
        .single();

      if (dbError) {
        console.error('Database error:', dbError);
        // Continue even if DB save fails - PDF was generated
      }

      // Show success and download
      toast({
        title: "Lease Pack Generated Successfully",
        description: `Professional lease agreement created with ID ${leasePack.core.leaseId}`,
      });

      // Auto-download the PDF
      if (pdfResult.pdf_url) {
        const link = document.createElement('a');
        link.href = pdfResult.pdf_url;
        link.download = `SwiftRent-Lease-${leasePack.core.leaseId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      setShowWizard(false);

    } catch (error: any) {
      console.error('Lease completion error:', error);
      toast({
        variant: "destructive",
        title: "Failed to Generate Lease",
        description: error.message || "Please try again or contact support",
      });
    } finally {
      setLoading(false);
    }
  };

  if (showWizard) {
    return (
      <LeaseWizard
        onComplete={handleLeaseComplete}
        onCancel={() => setShowWizard(false)}
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Professional Lease Agreements</h1>
          <p className="text-muted-foreground mt-2">
            Create professional residential lease agreements with embedded signatures and audit trails
          </p>
        </div>
        <Button onClick={() => setShowWizard(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Create New Lease
        </Button>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Professional Format
            </CardTitle>
            <CardDescription>
              27-section comprehensive lease with proper legal structure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Cover page with all party details</li>
              <li>• Detailed lease schedule summary</li>
              <li>• Complete terms §1-§27</li>
              <li>• Declarations and initials pages</li>
              <li>• Professional signature page</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Electronic Signatures
            </CardTitle>
            <CardDescription>
              Native embedded e-signatures with consent tracking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Draw or type signature options</li>
              <li>• Full consent documentation</li>
              <li>• Tamper-evident PDF generation</li>
              <li>• IP address and timestamp logging</li>
              <li>• POPIA compliant data handling</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-primary" />
              Audit & Verification
            </CardTitle>
            <CardDescription>
              Complete audit trail with document verification
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• SHA-256 document hashing</li>
              <li>• Complete audit log inclusion</li>
              <li>• Verification page in PDF</li>
              <li>• Secure private storage</li>
              <li>• 5-7 year retention policy</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Getting Started */}
      <Card>
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
          <CardDescription>
            Follow our 5-step wizard to create your professional lease agreement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-5 gap-4 text-sm">
            <div className="text-center">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-2 text-xs font-bold">1</div>
              <div className="font-medium">Parties</div>
              <div className="text-muted-foreground">Landlord & tenant details</div>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-2 text-xs font-bold">2</div>
              <div className="font-medium">Property & Term</div>
              <div className="text-muted-foreground">Property details & duration</div>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-2 text-xs font-bold">3</div>
              <div className="font-medium">Rent & Deposit</div>
              <div className="text-muted-foreground">Financial terms</div>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-2 text-xs font-bold">4</div>
              <div className="font-medium">Utilities</div>
              <div className="text-muted-foreground">Responsibilities & maintenance</div>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-2 text-xs font-bold">5</div>
              <div className="font-medium">Review & Sign</div>
              <div className="text-muted-foreground">Electronic signatures</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <div>
                <div className="font-medium">Generating Professional Lease</div>
                <div className="text-sm text-muted-foreground">Creating PDF with embedded signatures...</div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}