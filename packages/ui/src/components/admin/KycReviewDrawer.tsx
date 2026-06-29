import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle,
  SheetTrigger 
} from '@/components/ui/sheet';
import { 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  User, 
  Calendar,
  FileText,
  Camera,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@mzanzihomes/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { KycStatusPill } from '@/components/kyc/KycStatusPill';
import type { AdminKycListItem } from '@mzanzihomes/common/types/kyc';

interface KycReviewDrawerProps {
  kycProfile: AdminKycListItem;
  onReview: () => void;
  children: React.ReactNode;
}

export function KycReviewDrawer({ kycProfile, onReview, children }: KycReviewDrawerProps) {
  const [open, setOpen] = useState(false);
  const [idDocUrl, setIdDocUrl] = useState<string>('');
  const [idBackUrl, setIdBackUrl] = useState<string>('');
  const [selfieUrl, setSelfieUrl] = useState<string>('');
  const [declineReason, setDeclineReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadPreviewUrls = async () => {
    if (!kycProfile.id_front_path && !kycProfile.selfie_path) return;
    
    setLoading(true);
    try {
      // Generate signed URLs for preview
      if (kycProfile.id_front_path) {
        const { data } = await supabase.storage
          .from('kyc-uploads')
          .createSignedUrl(kycProfile.id_front_path, 60); // 60 second expiry
        
        if (data?.signedUrl) {
          setIdDocUrl(data.signedUrl);
        }
      }

      if (kycProfile.selfie_path) {
        const { data } = await supabase.storage
          .from('kyc-uploads')
          .createSignedUrl(kycProfile.selfie_path, 60);
        
        if (data?.signedUrl) {
          setSelfieUrl(data.signedUrl);
        }
      }
    } catch (error) {
      console.error('Error loading preview URLs:', error);
      toast({
        variant: "destructive",
        title: "Preview Error",
        description: "Unable to load document previews",
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshUrls = () => {
    setIdDocUrl('');
    setIdBackUrl('');
    setSelfieUrl('');
    loadPreviewUrls();
  };

  const handleApprove = async () => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('kyc-admin-approve', {
        body: { user_id: kycProfile.user_id }
      });

      if (error) {
        throw new Error(error.message || 'Approval failed');
      }

      toast({
        title: "KYC Approved",
        description: "Identity verification has been approved and user notified.",
      });

      onReview();
      setOpen(false);
    } catch (error: any) {
      console.error('Approval error:', error);
      toast({
        variant: "destructive",
        title: "Approval Failed",
        description: error.message || 'Failed to approve KYC verification',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!declineReason.trim()) {
      toast({
        variant: "destructive",
        title: "Reason Required",
        description: "Please provide a reason for declining",
      });
      return;
    }

    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('kyc-admin-decline', {
        body: { 
          user_id: kycProfile.user_id,
          reason: declineReason 
        }
      });

      if (error) {
        throw new Error(error.message || 'Decline failed');
      }

      toast({
        title: "KYC Declined",
        description: "Identity verification has been declined and user notified.",
      });

      onReview();
      setOpen(false);
      setDeclineReason('');
    } catch (error: any) {
      console.error('Decline error:', error);
      toast({
        variant: "destructive",
        title: "Decline Failed",
        description: error.message || 'Failed to decline KYC verification',
      });
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadPreviewUrls();
    }
  }, [open]);

  const isSubmitted = kycProfile.status === 'submitted';

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            KYC Review - {kycProfile.user_display_name}
          </SheetTitle>
          <SheetDescription>
            Review identity verification documents
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* User Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">User Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Email:</span>
                <span className="font-medium">{kycProfile.user_email}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Status:</span>
                <KycStatusPill status={kycProfile.status} />
              </div>
              
              {kycProfile.submitted_at && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Submitted:</span>
                  <span className="text-sm">
                    {new Date(kycProfile.submitted_at).toLocaleString()}
                  </span>
                </div>
              )}

              {kycProfile.reviewed_at && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Reviewed:</span>
                  <span className="text-sm">
                    {new Date(kycProfile.reviewed_at).toLocaleString()}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Document Previews */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Documents</CardTitle>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={refreshUrls}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh URLs
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-sm text-muted-foreground mt-2">Loading previews...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* ID Document */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <h3 className="font-medium">ID Document</h3>
                    </div>
                    {idDocUrl ? (
                      <div className="relative">
                        <img 
                          src={idDocUrl} 
                          alt="ID Document" 
                          className="w-full h-48 object-cover rounded-lg border"
                          onError={() => {
                            toast({
                              variant: "destructive",
                              title: "Preview Error",
                              description: "ID document preview failed to load",
                            });
                          }}
                        />
                        <Badge className="absolute top-2 left-2 bg-black/70 text-white">
                          ID Document
                        </Badge>
                      </div>
                    ) : (
                      <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">
                            {kycProfile.id_front_path ? 'Preview unavailable' : 'No document uploaded'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Selfie */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Camera className="h-4 w-4 text-primary" />
                      <h3 className="font-medium">Selfie with ID</h3>
                    </div>
                    {selfieUrl ? (
                      <div className="relative">
                        <img 
                          src={selfieUrl} 
                          alt="Selfie with ID" 
                          className="w-full h-48 object-cover rounded-lg border"
                          onError={() => {
                            toast({
                              variant: "destructive",
                              title: "Preview Error",
                              description: "Selfie preview failed to load",
                            });
                          }}
                        />
                        <Badge className="absolute top-2 left-2 bg-black/70 text-white">
                          Selfie with ID
                        </Badge>
                      </div>
                    ) : (
                      <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <Camera className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">
                            {kycProfile.selfie_path ? 'Preview unavailable' : 'No selfie uploaded'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Previous Decision */}
          {kycProfile.notes && kycProfile.status === 'declined' && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Previous decline reason:</strong> {kycProfile.notes}
              </AlertDescription>
            </Alert>
          )}

          {/* Review Actions */}
          {isSubmitted && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Review Decision</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Decline Reason (required if declining)
                  </label>
                  <Textarea
                    placeholder="Provide a clear reason for declining this verification..."
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Important:</strong> Approving will delete the original documents 
                    from storage for privacy. Only metadata will be retained.
                  </AlertDescription>
                </Alert>

                <div className="flex gap-3">
                  <Button
                    onClick={handleApprove}
                    disabled={processing}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    {processing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Approving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </>
                    )}
                  </Button>
                  
                  <Button
                    variant="destructive"
                    onClick={handleDecline}
                    disabled={processing || !declineReason.trim()}
                    className="flex-1"
                  >
                    {processing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Declining...
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 mr-2" />
                        Decline
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}