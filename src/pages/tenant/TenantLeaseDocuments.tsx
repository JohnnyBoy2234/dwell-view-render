import { useState } from 'react';
import { FileText, Download, Eye, Calendar, MapPin } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useTenantDashboard } from '@/hooks/useTenantDashboard';

export default function TenantLeaseDocuments() {
  const { tenantProperty, loading } = useTenantDashboard();
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (documentType: string) => {
    setDownloading(documentType);
    // Simulate download process
    await new Promise(resolve => setTimeout(resolve, 2000));
    setDownloading(null);
  };

  const handleViewDocument = (documentType: string) => {
    // In a real app, this would open a PDF viewer or navigate to a document viewer page
    console.log('Viewing document:', documentType);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted animate-pulse rounded"></div>
        <div className="grid gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 bg-muted animate-pulse rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  const documents = [
    {
      id: 'lease-agreement',
      title: 'Lease Agreement',
      description: 'Your signed rental lease agreement',
      type: 'PDF',
      size: '2.4 MB',
      lastModified: '2024-01-15',
      status: 'signed',
      icon: FileText,
    },
    {
      id: 'property-inspection',
      title: 'Move-in Inspection Report',
      description: 'Property condition report from move-in date',
      type: 'PDF',
      size: '1.8 MB',
      lastModified: '2024-01-10',
      status: 'completed',
      icon: Eye,
    },
    {
      id: 'insurance-docs',
      title: 'Rental Insurance Information',
      description: 'Required insurance documentation and guidelines',
      type: 'PDF',
      size: '0.9 MB',
      lastModified: '2024-01-08',
      status: 'active',
      icon: FileText,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Lease Documents</h1>
        <p className="text-muted-foreground">
          Access and download your lease agreement and related documents
        </p>
      </div>

      {/* Property Information Card */}
      {tenantProperty && (
        <Card className="bg-gradient-to-r from-ocean-blue/5 to-success-green/5 border-ocean-blue/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-ocean-blue">
              <MapPin className="h-5 w-5" />
              Current Property
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Address</p>
                <p className="font-semibold">{tenantProperty.title}</p>
                <p className="text-sm text-muted-foreground">{tenantProperty.location}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Rent</p>
                <p className="font-semibold text-lg">R{tenantProperty.monthlyRent.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Lease End Date</p>
                <p className="font-semibold flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(tenantProperty.leaseEndDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents Grid */}
      <div className="grid gap-6">
        {documents.map((document) => {
          const Icon = document.icon;
          const isDownloading = downloading === document.id;
          
          return (
            <Card key={document.id} className="hover:shadow-medium transition-all duration-200">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-ocean-blue/10 rounded-lg flex items-center justify-center">
                      <Icon className="h-6 w-6 text-ocean-blue" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{document.title}</CardTitle>
                      <CardDescription>{document.description}</CardDescription>
                    </div>
                  </div>
                  <Badge 
                    variant={document.status === 'signed' ? 'default' : 'secondary'}
                    className={document.status === 'signed' ? 'bg-success-green text-white' : ''}
                  >
                    {document.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <span>{document.type} • {document.size}</span>
                    <span>Updated: {new Date(document.lastModified).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDocument(document.id)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleDownload(document.id)}
                      disabled={isDownloading}
                      className="bg-ocean-blue hover:bg-ocean-blue-dark"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {isDownloading ? 'Downloading...' : 'Download'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Help Section */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-lg">Need Help?</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            If you can't find a document or need help accessing your lease information, our support team is here to help.
          </p>
          <Button variant="outline">
            Contact Support
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}