import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  FileText, 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  Download,
  Shield,
  Home,
  User,
  Building
} from 'lucide-react';

interface SaleProperty {
  id: string;
  title: string;
  price: number;
  location: string;
  property_type: string;
  status: string;
  buyer_name?: string;
  sale_date?: string;
}

interface DeedOfSaleData {
  seller_name: string;
  buyer_name: string;
  property_address: string;
  sale_price: number;
  occupation_date: string;
  terms: string;
}

interface ComplianceDocument {
  id: string;
  type: string;
  name: string;
  status: 'not_uploaded' | 'uploaded' | 'verified' | 'rejected';
  upload_date?: string;
  verified_by?: string;
  url?: string;
  required: boolean;
}

interface SalePropertyOverviewProps {
  property: SaleProperty;
}

export const SalePropertyOverview: React.FC<SalePropertyOverviewProps> = ({ property }) => {
  const [deedData, setDeedData] = useState<DeedOfSaleData>({
    seller_name: '',
    buyer_name: property.buyer_name || '',
    property_address: property.location,
    sale_price: property.price,
    occupation_date: '',
    terms: ''
  });

  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateDeed = async () => {
    setIsGenerating(true);
    try {
      // Simulate API call to generate deed of sale
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('Deed of Sale generated:', deedData);
      // Show success message
    } catch (error) {
      console.error('Error generating deed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Property Summary */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Property Sale Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <Label className="text-sm font-medium text-gray-500">Property Address</Label>
              <div className="mt-1 flex items-center gap-2">
                <Home className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-semibold text-gray-900">{property.location}</span>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">Sale Price</Label>
              <div className="mt-1 text-sm font-bold text-green-600">R {property.price.toLocaleString()}</div>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">Property Type</Label>
              <div className="mt-1 text-sm font-semibold text-gray-900">{property.property_type}</div>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">Status</Label>
              <div className="mt-1">
                <Badge className={
                  property.status === 'sold' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-blue-100 text-blue-800'
                }>
                  {property.status.charAt(0).toUpperCase() + property.status.slice(1)}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sale Information */}
      {property.buyer_name && (
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Sale Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-sm font-medium text-gray-500">Buyer Name</Label>
                <div className="mt-1 flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-semibold text-gray-900">{property.buyer_name}</span>
                </div>
              </div>
              {property.sale_date && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Sale Date</Label>
                  <div className="mt-1 text-sm font-semibold text-gray-900">{property.sale_date}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deed of Sale Generator */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Deed of Sale Generator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="seller_name">Seller Name</Label>
              <Input
                id="seller_name"
                value={deedData.seller_name}
                onChange={(e) => setDeedData({...deedData, seller_name: e.target.value})}
                placeholder="Enter seller full name"
              />
            </div>
            <div>
              <Label htmlFor="buyer_name">Buyer Name</Label>
              <Input
                id="buyer_name"
                value={deedData.buyer_name}
                onChange={(e) => setDeedData({...deedData, buyer_name: e.target.value})}
                placeholder="Enter buyer full name"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="occupation_date">Occupation Date</Label>
            <Input
              id="occupation_date"
              type="date"
              value={deedData.occupation_date}
              onChange={(e) => setDeedData({...deedData, occupation_date: e.target.value})}
            />
          </div>
          
          <div>
            <Label htmlFor="terms">Special Terms</Label>
            <Textarea
              id="terms"
              value={deedData.terms}
              onChange={(e) => setDeedData({...deedData, terms: e.target.value})}
              placeholder="Enter any special terms or conditions..."
              rows={3}
            />
          </div>
          
          <Button 
            onClick={handleGenerateDeed}
            disabled={isGenerating || !deedData.seller_name || !deedData.buyer_name}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Generating Deed...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Generate Deed of Sale
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

interface SaleComplianceProps {
  property: SaleProperty;
}

export const SaleCompliance: React.FC<SaleComplianceProps> = ({ property }) => {
  const [documents, setDocuments] = useState<ComplianceDocument[]>([
    {
      id: '1',
      type: 'id',
      name: 'ID Document (FICA)',
      status: 'not_uploaded',
      required: true
    },
    {
      id: '2',
      type: 'address_proof',
      name: 'Proof of Address',
      status: 'not_uploaded',
      required: true
    },
    {
      id: '3',
      type: 'electrical',
      name: 'Electrical Compliance Certificate',
      status: 'not_uploaded',
      required: true
    },
    {
      id: '4',
      type: 'gas',
      name: 'Gas Certificate',
      status: 'not_uploaded',
      required: false
    },
    {
      id: '5',
      type: 'electric_fence',
      name: 'Electric Fence Certificate',
      status: 'not_uploaded',
      required: false
    },
    {
      id: '6',
      type: 'beetle',
      name: 'Beetle Certificate',
      status: 'not_uploaded',
      required: false
    }
  ]);

  const handleFileUpload = (docId: string, file: File) => {
    // Simulate file upload
    setDocuments(prev => prev.map(doc => 
      doc.id === docId 
        ? { ...doc, status: 'uploaded', upload_date: new Date().toISOString(), url: '#' }
        : doc
    ));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected': return <AlertCircle className="h-4 w-4 text-red-600" />;
      default: return <Upload className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'text-green-600 bg-green-50 border-green-200';
      case 'rejected': return 'text-red-600 bg-red-50 border-red-200';
      case 'uploaded': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Legal & Compliance</CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            Upload required documents for the property transfer process
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {documents.map((doc) => (
              <div key={doc.id} className={`border rounded-lg p-4 ${getStatusColor(doc.status)}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {getStatusIcon(doc.status)}
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">{doc.name}</h4>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-xs text-gray-500">
                          {doc.required ? 'Required' : 'Optional'}
                        </span>
                        {doc.upload_date && (
                          <span className="text-xs text-gray-500">
                            Uploaded: {new Date(doc.upload_date).toLocaleDateString()}
                          </span>
                        )}
                        {doc.verified_by && (
                          <span className="text-xs text-green-600">
                            Verified by: {doc.verified_by}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {doc.status === 'verified' && doc.url && (
                      <Button size="sm" variant="outline">
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                    )}
                    {doc.status !== 'verified' && (
                      <div className="relative">
                        <input
                          type="file"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(doc.id, file);
                          }}
                        />
                        <Button size="sm">
                          <Upload className="h-3 w-3 mr-1" />
                          {doc.status === 'not_uploaded' ? 'Upload' : 'Re-upload'}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h5 className="text-sm font-medium text-blue-900">Document Security</h5>
                <p className="text-xs text-blue-700 mt-1">
                  All documents are encrypted and securely stored. Only authorized parties (conveyancers, buyers, and sellers) have access to these documents.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
