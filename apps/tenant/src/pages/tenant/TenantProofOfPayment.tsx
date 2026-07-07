// @ts-nocheck
import { Upload, FileText, Download, Trash2, CheckCircle, Star } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import { Button } from '@mzanzihomes/ui/components/button';
import { Badge } from '@mzanzihomes/ui/components/badge';
import { Input } from '@mzanzihomes/ui/components/input';
import { Label } from '@mzanzihomes/ui/components/label';
import { useProofOfPayment } from '@mzanzihomes/features/payments';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@mzanzihomes/ui/components/tabs';
import { PaymentVerificationUpload } from '@mzanzihomes/features/payments';
import { BillDetailSheet } from '@mzanzihomes/features/billing';
import { supabase } from '@mzanzihomes/supabase/client';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

export default function TenantProofOfPayment() {
  const {
    documents,
    loading,
    uploading,
    uploadDocument,
    deleteDocument,
    downloadDocument
  } = useProofOfPayment();

  const [activeTenancy, setActiveTenancy] = useState<any>(null);
  const [loadingTenancy, setLoadingTenancy] = useState(true);
  const [openBillId, setOpenBillId] = useState<string | null>(null);

  const { data: bills = [] } = useQuery({
    queryKey: ['tenant-bills'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monthly_bills')
        .select('*, properties(title, location), bill_line_items(*)');
      if (error) throw error;
      return data;
    },
  });

  const receiptUrl = (path: string) =>
    supabase.storage.from('rent-receipts').getPublicUrl(path).data.publicUrl;

  useEffect(() => {
    loadActiveTenancy();
  }, []);

  const loadActiveTenancy = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: tenancy } = await supabase
      .from('tenancies')
      .select('*, properties(*)')
      .eq('tenant_id', user.id)
      .eq('status', 'active')
      .single();

    setActiveTenancy(tenancy);
    setLoadingTenancy(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    await uploadDocument(file);
    
    // Clear the input
    event.target.value = '';
  };

  const handleDeleteDocument = (id: string, filePath: string) => {
    deleteDocument(id, filePath);
  };

  const handleDownloadDocument = (id: string, filePath: string, fileName: string) => {
    downloadDocument(id, filePath, fileName);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="h-4 w-4 text-success-green" />;
      case 'processing':
        return <div className="h-4 w-4 border-2 border-ocean-blue border-t-transparent rounded-full animate-spin" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-success-green text-white">Verified</Badge>;
      case 'processing':
        return <Badge variant="secondary">Processing</Badge>;
      default:
        return <Badge variant="outline">Uploaded</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Proof of Payment</h1>
          <p className="text-muted-foreground">Loading your documents...</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 border-2 border-ocean-blue border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (loading || loadingTenancy) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Proof of Payment</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Proof of Payment</h1>
        <p className="text-muted-foreground">
          Upload and manage your payment statements and transfer receipts for your records
        </p>
      </div>

      <Tabs defaultValue="bills" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="bills">Bills & receipts</TabsTrigger>
          <TabsTrigger value="ai-verification">AI Payment Verification</TabsTrigger>
          <TabsTrigger value="documents">Upload proof</TabsTrigger>
        </TabsList>

        <TabsContent value="bills" className="space-y-6">
          {bills.filter(b => b.status === 'sent').length === 0 && bills.filter(b => b.status === 'paid').length === 0 ? (
            <p className="text-sm text-muted-foreground">No bills yet.</p>
          ) : (
            <>
              {bills.filter(b => b.status === 'sent').map(bill => (
                <Card key={bill.id} className="border-red-300 mb-3">
                  <CardHeader>
                    <CardTitle className="text-base">Current bill — {bill.period}</CardTitle>
                    <CardDescription>
                      {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' })
                        .format(Number(bill.total_amount))} outstanding
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      className="w-full"
                      onClick={() => setOpenBillId(bill.id)}
                    >
                      View & pay
                    </Button>
                  </CardContent>
                  <BillDetailSheet
                    bill={bill}
                    open={openBillId === bill.id}
                    onOpenChange={(v) => setOpenBillId(v ? bill.id : null)}
                  />
                </Card>
              ))}
              {bills.filter(b => b.status === 'paid').map(bill => (
                <div key={bill.id} className="flex items-center justify-between rounded-lg border px-4 py-3 mb-2">
                  <div>
                    <p className="text-sm font-medium">{bill.period} — {bill.properties?.title || bill.properties?.location}</p>
                    <p className="text-xs text-muted-foreground">
                      Paid {bill.paid_at ? new Date(bill.paid_at).toLocaleDateString('en-ZA') : ''}
                    </p>
                  </div>
                  {bill.receipt_pdf_path ? (
                    <Button variant="outline" size="sm" asChild>
                      <a href={receiptUrl(bill.receipt_pdf_path)} target="_blank" rel="noreferrer">Receipt</a>
                    </Button>
                  ) : null}
                </div>
              ))}
            </>
          )}
        </TabsContent>

        <TabsContent value="ai-verification" className="space-y-6">
          {activeTenancy ? (
            <PaymentVerificationUpload
              tenancyId={activeTenancy.id}
              expectedAmount={activeTenancy.monthly_rent}
            />
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No active tenancy found. You need an active lease to submit payments.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          {/* Upload Section */}
          <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Upload className="h-5 w-5" />
                Upload Document Archive
              </CardTitle>
              <CardDescription>
                Store historical documents for your records (not processed by AI)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid w-full max-w-sm items-center gap-1.5">
                  <Label htmlFor="document">Choose file</Label>
                  <Input 
                    id="document" 
                    type="file" 
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>Supported formats: PDF, JPG, PNG (Max 10MB)</p>
                  <p>For archival purposes only - use AI Verification tab for payment processing</p>
                </div>
                {uploading && (
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Uploading document...
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Documents List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Archived Documents</h2>
              <Badge variant="secondary">{documents.length} documents</Badge>
            </div>

            {documents.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No archived documents</h3>
                  <p className="text-muted-foreground">
                    Upload documents for your records
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {documents.map((document) => (
                  <Card key={document.id} className="hover:shadow-md transition-all duration-200">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                            {getStatusIcon(document.status)}
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{document.fileName}</h3>
                            <p className="text-muted-foreground">{document.description}</p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                              <span>{document.fileSize}</span>
                              <span>Uploaded: {new Date(document.uploadDate).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {getStatusBadge(document.status)}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadDocument(document.id, document.filePath, document.fileName)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteDocument(document.id, document.filePath)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Help Section */}
          <Card className="bg-muted/30">
            <CardHeader>
              <CardTitle className="text-lg">Document Guidelines</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div>
                  <h4 className="font-semibold mb-1">AI Verification Tab:</h4>
                  <ul className="list-disc ml-5 space-y-1 text-muted-foreground">
                    <li>Upload current month's payment proof for instant verification</li>
                    <li>Earn golden stars ⭐ for on-time or early payments</li>
                    <li>Unlock annual "Reliable Tenant" badges (12 stars = 1 badge)</li>
                    <li>AI verifies amount, date, and reference automatically</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Document Archive Tab:</h4>
                  <ul className="list-disc ml-5 space-y-1 text-muted-foreground">
                    <li>Store historical statements for your records</li>
                    <li>Not processed by AI - for archival purposes only</li>
                    <li>Keep organized records of all your payment documentation</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}