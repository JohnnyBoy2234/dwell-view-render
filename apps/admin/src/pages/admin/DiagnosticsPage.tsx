import { useState } from 'react';
import { Button } from '@mzanzihomes/ui/components/button';
import { Input } from '@mzanzihomes/ui/components/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import { Badge } from '@mzanzihomes/ui/components/badge';
import { Alert, AlertDescription } from '@mzanzihomes/ui/components/alert';
import { 
  Search, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  User,
  Mail,
  Shield
} from 'lucide-react';
import { supabase } from '@mzanzihomes/supabase/client';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';
import { AdminLayout } from '@/components/admin/AdminLayout';

interface DiagnosticsResponse {
  userId: string;
  emailVerified: boolean;
  kycStatus: string;
  canRequestViewing: boolean;
  notes: string[];
}

function DiagnosticsPageContent() {
  const { toast } = useToast();
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnosticsResponse | null>(null);

  const handleDiagnostics = async () => {
    if (!userId.trim()) {
      toast({
        variant: "destructive",
        title: "User ID Required",
        description: "Please enter a valid user ID",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await supabase.functions.invoke('diagnostics-gates', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        body: new URLSearchParams({ userId: userId.trim() })
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setResult(response.data);
      
      toast({
        title: "Diagnostics Complete",
        description: `Gate status checked for user ${userId.slice(0, 8)}...`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Diagnostics Failed",
        description: error.message,
      });
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-success text-success-foreground">Approved</Badge>;
      case 'submitted':
        return <Badge variant="secondary">Submitted</Badge>;
      case 'declined':
        return <Badge variant="destructive">Declined</Badge>;
      case 'not_started':
      default:
        return <Badge variant="outline">Not Started</Badge>;
    }
  };

  return (
    <div className="container mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">System Diagnostics</h1>
        <p className="text-muted-foreground">
          Check user gate status for email verification and KYC approval
        </p>
      </div>

      {/* Diagnostics Form */}
      <Card>
        <CardHeader>
          <CardTitle>Gate Status Checker</CardTitle>
          <CardDescription>
            Enter a user ID to check their email verification and KYC status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Enter user ID (UUID format)"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full"
              />
            </div>
            
            <Button onClick={handleDiagnostics} disabled={loading}>
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Checking...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Check Status
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Gate Status Results
            </CardTitle>
            <CardDescription>
              Results for user: {result.userId}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-card/80 via-card to-blue-50/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Mail className="h-5 w-5 text-blue-600" />
                    Email Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    {result.emailVerified ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-success" />
                        <span className="text-success font-medium">Verified</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5 text-destructive" />
                        <span className="text-destructive font-medium">Not Verified</span>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-card/80 via-card to-purple-50/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="h-5 w-5 text-purple-600" />
                    KYC Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {getStatusBadge(result.kycStatus)}
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-card/80 via-card to-green-50/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Can Request Viewing</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    {result.canRequestViewing ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-success" />
                        <span className="text-success font-medium">Yes</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5 text-destructive" />
                        <span className="text-destructive font-medium">No</span>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Notes */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Detailed Analysis</h3>
              <div className="space-y-2">
                {result.notes.map((note, index) => (
                  <Alert key={index} className="border-l-4 border-l-primary">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{note}</AlertDescription>
                  </Alert>
                ))}
              </div>
            </div>

            {/* Raw Data (for debugging) */}
            <details className="bg-muted p-4 rounded-lg">
              <summary className="cursor-pointer font-medium text-sm">
                Raw Response Data (for debugging)
              </summary>
              <pre className="mt-2 text-xs overflow-x-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function DiagnosticsPage() {
  return (
    <AdminLayout>
      <DiagnosticsPageContent />
    </AdminLayout>
  );
}