import { useState, useEffect } from "react";
import { SwiftRentLeaseGenerator } from "../lease/SwiftRentLeaseGenerator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Signature, CheckCircle, Eye } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface TenancyData {
  id: string;
  property_id: string;
  tenant_id: string;
  landlord_id: string;
  monthly_rent: number;
  security_deposit: number;
  start_date: string;
  end_date: string;
  lease_status: string;
  lease_document_url?: string;
  lease_document_path?: string;
  landlord_signature_url?: string;
  tenant_signature_url?: string;
  landlord_signed_at?: string;
  tenant_signed_at?: string;
  properties?: {
    title: string;
    location: string;
  };
  tenant_profile?: {
    display_name: string;
  };
  landlord_profile?: {
    display_name: string;
  };
}

interface LeaseAgreement {
  id: string;
  property_id: string;
  landlord_id: string;
  tenant_id?: string;
  status: string;
  lease_data: any;
  pdf_url?: string;
  pdf_path?: string;
  html_content?: string;
  landlord_signed_at?: string;
  tenant_signed_at?: string;
  created_at: string;
  updated_at: string;
}

interface TenancyLeaseSectionProps {
  tenancy: TenancyData;
  onUpdate?: () => void;
}

export const TenancyLeaseSection = ({ tenancy, onUpdate }: TenancyLeaseSectionProps) => {
  const [currentLease, setCurrentLease] = useState<LeaseAgreement | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Fetch the latest lease agreement for this property and tenant
  const fetchLatestLease = async () => {
    try {
      const { data, error } = await supabase
        .from('lease_agreements')
        .select('*')
        .eq('property_id', tenancy.property_id)
        .eq('tenant_id', tenancy.tenant_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setCurrentLease(data);
    } catch (error) {
      console.error('Error fetching lease:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLatestLease();
  }, [tenancy.property_id, tenancy.tenant_id]);

  const downloadPDF = async () => {
    if (!currentLease?.pdf_url) {
      toast.error("No PDF available for download");
      return;
    }
    
    try {
      const link = document.createElement('a');
      link.href = currentLease.pdf_url;
      link.download = `SwiftRent_Lease_${tenancy.properties?.title || 'Property'}_${new Date().toISOString().split('T')[0]}.pdf`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Lease downloaded successfully!");
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error("Failed to download lease");
    }
  };

  const navigateToSigning = () => {
    if (!currentLease) return;
    window.location.href = `/swiftrent-lease/${currentLease.id}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'pending_signatures':
        return <Badge variant="outline">Awaiting Signatures</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-600">Completed & Signed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If no lease exists, show the generator
  if (!currentLease) {
    return (
      <SwiftRentLeaseGenerator
        propertyId={tenancy.property_id}
        tenantUserId={tenancy.tenant_id}
        onLeaseGenerated={(lease) => {
          setCurrentLease(lease);
          onUpdate?.();
        }}
      />
    );
  }

  // Show existing lease with download and signing options
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-sm">SR</span>
            </div>
            <div>
              <CardTitle>SwiftRent Lease Agreement</CardTitle>
              <p className="text-sm text-muted-foreground">
                Generated {new Date(currentLease.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          {getStatusBadge(currentLease.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Property and tenancy details */}
        <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded-lg">
          <div>
            <span className="font-medium">Property:</span> {tenancy.properties?.title}
          </div>
          <div>
            <span className="font-medium">Tenant:</span> {tenancy.tenant_profile?.display_name}
          </div>
          <div>
            <span className="font-medium">Monthly Rent:</span> R{tenancy.monthly_rent}
          </div>
          <div>
            <span className="font-medium">Security Deposit:</span> R{tenancy.security_deposit}
          </div>
          <div>
            <span className="font-medium">Lease Term:</span> {tenancy.start_date} to {tenancy.end_date}
          </div>
          <div>
            <span className="font-medium">Location:</span> {tenancy.properties?.location}
          </div>
        </div>

        {/* Signature status */}
        {currentLease.status !== 'draft' && (
          <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                currentLease.landlord_signed_at ? 'bg-green-500' : 'bg-gray-300'
              }`} />
              <span className="text-sm">
                Landlord: {currentLease.landlord_signed_at ? 'Signed' : 'Pending'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                currentLease.tenant_signed_at ? 'bg-green-500' : 'bg-gray-300'
              }`} />
              <span className="text-sm">
                Tenant: {currentLease.tenant_signed_at ? 'Signed' : 'Pending'}
              </span>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {/* Download button - always available if PDF exists */}
          {currentLease.pdf_url && (
            <Button 
              variant="outline" 
              onClick={downloadPDF}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          )}

          {/* Review/Preview button */}
          {currentLease.html_content && (
            <Button 
              variant="outline" 
              onClick={() => {
                // Open preview in new tab
                const previewWindow = window.open('', '_blank');
                if (previewWindow) {
                  previewWindow.document.write(currentLease.html_content || '');
                  previewWindow.document.title = 'SwiftRent Lease Preview';
                }
              }}
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              Review Document
            </Button>
          )}

          {/* Signing buttons */}
          {currentLease.status === 'pending_signatures' && (
            <>
              {user?.id === currentLease.landlord_id && !currentLease.landlord_signed_at && (
                <Button 
                  onClick={navigateToSigning}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  <Signature className="h-4 w-4" />
                  Sign as Landlord
                </Button>
              )}
              
              {user?.id === currentLease.tenant_id && !currentLease.tenant_signed_at && (
                <Button 
                  onClick={navigateToSigning}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  <Signature className="h-4 w-4" />
                  Sign as Tenant
                </Button>
              )}
            </>
          )}
        </div>

        {/* Completed status */}
        {currentLease.status === 'completed' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle className="h-5 w-5" />
              <div>
                <p className="font-medium">Lease Agreement Completed</p>
                <p className="text-sm">
                  Both parties have signed. This document is now legally binding and immutable.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};