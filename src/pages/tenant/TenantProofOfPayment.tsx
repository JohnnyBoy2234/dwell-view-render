import { useState } from 'react';
import { Upload, FileText, Download, Trash2, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface ProofDocument {
  id: string;
  fileName: string;
  fileSize: string;
  uploadDate: string;
  description: string;
  type: 'bank_statement' | 'transfer_receipt' | 'other';
  status: 'uploaded' | 'processing' | 'verified';
}

export default function TenantProofOfPayment() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState<ProofDocument[]>([
    {
      id: '1',
      fileName: 'Bank_Statement_Jan_2024.pdf',
      fileSize: '2.4 MB',
      uploadDate: '2024-01-15',
      description: 'January 2024 Bank Statement',
      type: 'bank_statement',
      status: 'verified'
    },
    {
      id: '2', 
      fileName: 'Rent_Transfer_Receipt_Dec.pdf',
      fileSize: '0.8 MB',
      uploadDate: '2024-01-02',
      description: 'December Rent Payment Receipt',
      type: 'transfer_receipt',
      status: 'uploaded'
    }
  ]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Validate file type
    if (!file.type.includes('pdf') && !file.type.includes('image')) {
      toast({
        variant: 'destructive',
        title: 'Invalid file type',
        description: 'Please upload PDF or image files only.'
      });
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: 'Please upload files smaller than 10MB.'
      });
      return;
    }

    setUploading(true);
    
    try {
      // Simulate upload process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newDocument: ProofDocument = {
        id: Date.now().toString(),
        fileName: file.name,
        fileSize: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
        uploadDate: new Date().toISOString().split('T')[0],
        description: file.name.replace(/\.[^/.]+$/, ''),
        type: file.name.toLowerCase().includes('statement') ? 'bank_statement' : 
              file.name.toLowerCase().includes('receipt') ? 'transfer_receipt' : 'other',
        status: 'uploaded'
      };
      
      setDocuments(prev => [newDocument, ...prev]);
      
      toast({
        title: 'Upload successful',
        description: 'Your proof of payment has been uploaded successfully.'
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: 'Please try again or contact support if the problem persists.'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = (id: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id));
    toast({
      title: 'Document deleted',
      description: 'The document has been removed from your records.'
    });
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Proof of Payment</h1>
        <p className="text-muted-foreground">
          Upload and manage your payment statements and transfer receipts for your records
        </p>
      </div>

      {/* Upload Section */}
      <Card className="bg-gradient-to-r from-ocean-blue/5 to-success-green/5 border-ocean-blue/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-ocean-blue">
            <Upload className="h-5 w-5" />
            Upload New Document
          </CardTitle>
          <CardDescription>
            Upload bank statements, transfer receipts, or other payment proof documents
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
              <p>Recommended: Bank statements, transfer receipts, payment confirmations</p>
            </div>
            {uploading && (
              <div className="flex items-center gap-2 text-sm text-ocean-blue">
                <div className="h-4 w-4 border-2 border-ocean-blue border-t-transparent rounded-full animate-spin" />
                Uploading document...
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Your Documents</h2>
          <Badge variant="secondary">{documents.length} documents</Badge>
        </div>

        {documents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No documents uploaded yet</h3>
              <p className="text-muted-foreground">
                Upload your first proof of payment document to get started
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {documents.map((document) => (
              <Card key={document.id} className="hover:shadow-medium transition-all duration-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-ocean-blue/10 rounded-lg flex items-center justify-center">
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
                        onClick={() => {
                          // In real app, this would download the file
                          toast({ title: 'Download started', description: `Downloading ${document.fileName}` });
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteDocument(document.id)}
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
              <h4 className="font-semibold mb-1">What to upload:</h4>
              <ul className="list-disc ml-5 space-y-1 text-muted-foreground">
                <li>Monthly bank statements showing rent payments</li>
                <li>Transfer receipts from rent payments</li>
                <li>Payment confirmations from your bank</li>
                <li>Any other proof of payment documents</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-1">Tips:</h4>
              <ul className="list-disc ml-5 space-y-1 text-muted-foreground">
                <li>Upload documents regularly to maintain good records</li>
                <li>Ensure documents are clear and readable</li>
                <li>Use descriptive file names for easy identification</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}