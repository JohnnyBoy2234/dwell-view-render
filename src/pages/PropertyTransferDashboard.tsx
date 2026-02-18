import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Home, 
  User, 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Upload,
  Download,
  MessageSquare,
  Calendar,
  DollarSign,
  Shield,
  Building,
  Scale,
  Bell
} from 'lucide-react';

// Types
interface PropertyTransfer {
  id: string;
  propertyAddress: string;
  salePrice: number;
  sellerName: string;
  buyerName: string;
  conveyancerFirm: string;
  currentStage: string;
  estimatedRegistrationDate: string;
  status: 'pending' | 'in_progress' | 'completed' | 'delayed';
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'not_started' | 'uploaded' | 'verified' | 'awaiting_attorney' | 'complete';
  dueDate?: string;
  category: 'contract' | 'legal' | 'financial';
}

interface Document {
  id: string;
  name: string;
  type: string;
  uploadedBy: string;
  uploadedDate: string;
  verifiedBy: string;
  verified: boolean;
  url: string;
}

interface Stage {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'complete' | 'delayed';
  responsibleParty: string;
  dateCompleted?: string;
  expectedTimeline: string;
}

const PropertyTransferDashboard: React.FC = () => {
  const [userRole, setUserRole] = useState<'seller' | 'buyer' | 'conveyancer'>('seller');
  const [transfer, setTransfer] = useState<PropertyTransfer | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);

  // Sample data - in real app, this would come from API
  useEffect(() => {
    // Mock transfer data
    setTransfer({
      id: '1',
      propertyAddress: '42 Oak Avenue, Sandton, Johannesburg',
      salePrice: 2850000,
      sellerName: 'John Smith',
      buyerName: 'Sarah Johnson',
      conveyancerFirm: 'Van der Merwe Attorneys',
      currentStage: 'Compliance',
      estimatedRegistrationDate: '2024-03-15',
      status: 'in_progress'
    });

    // Mock stages
    setStages([
      { id: '1', name: 'Negotiation', status: 'complete', responsibleParty: 'Both Parties', dateCompleted: '2024-01-15', expectedTimeline: '1-2 weeks' },
      { id: '2', name: 'Bond Approval', status: 'complete', responsibleParty: 'Buyer', dateCompleted: '2024-01-28', expectedTimeline: '2-4 weeks' },
      { id: '3', name: 'Compliance', status: 'in_progress', responsibleParty: 'Seller', expectedTimeline: '1-2 weeks' },
      { id: '4', name: 'Lodgement', status: 'pending', responsibleParty: 'Conveyancer', expectedTimeline: '1 week' },
      { id: '5', name: 'Registration', status: 'pending', responsibleParty: 'Deeds Office', expectedTimeline: '2-3 weeks' }
    ]);

    // Mock tasks for seller
    setTasks([
      { id: '1', title: 'Sign Deed of Sale', description: 'Sign and return the deed of sale', status: 'complete', category: 'contract' },
      { id: '2', title: 'Upload ID (FICA)', description: 'Upload certified copy of ID', status: 'verified', category: 'legal' },
      { id: '3', title: 'Electrical Compliance Certificate', description: 'Upload valid electrical compliance certificate', status: 'awaiting_attorney', category: 'legal' },
      { id: '4', title: 'Bond Cancellation', description: 'Initiate bond cancellation with current bank', status: 'not_started', category: 'financial' }
    ]);

    // Mock documents
    setDocuments([
      { id: '1', name: 'Deed of Sale.pdf', type: 'contract', uploadedBy: 'Seller', uploadedDate: '2024-01-15', verifiedBy: 'Van der Merwe Attorneys', verified: true, url: '#' },
      { id: '2', name: 'ID Document.pdf', type: 'fica', uploadedBy: 'Seller', uploadedDate: '2024-01-16', verifiedBy: 'Van der Merwe Attorneys', verified: true, url: '#' },
      { id: '3', name: 'Electrical Certificate.pdf', type: 'compliance', uploadedBy: 'Seller', uploadedDate: '2024-01-20', verifiedBy: 'Pending', verified: false, url: '#' }
    ]);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete': return 'text-green-600 bg-green-50';
      case 'in_progress': return 'text-blue-600 bg-blue-50';
      case 'pending': return 'text-gray-600 bg-gray-50';
      case 'delayed': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete': return <CheckCircle className="h-4 w-4" />;
      case 'in_progress': return <Clock className="h-4 w-4" />;
      case 'delayed': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getProgressPercentage = () => {
    const completedStages = stages.filter(s => s.status === 'complete').length;
    return (completedStages / stages.length) * 100;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Building className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-semibold text-gray-900">PropertyTransfer SA</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </Button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-blue-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">John Smith</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Role Selector */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Tabs value={userRole} onValueChange={(value) => setUserRole(value as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-transparent border-0">
              <TabsTrigger value="seller" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600">
                <Building className="h-4 w-4 mr-2" />
                Seller Dashboard
              </TabsTrigger>
              <TabsTrigger value="buyer" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600">
                <Home className="h-4 w-4 mr-2" />
                Buyer Dashboard
              </TabsTrigger>
              <TabsTrigger value="conveyancer" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600">
                <Scale className="h-4 w-4 mr-2" />
                Legal Tracker
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {userRole === 'seller' && <SellerDashboard transfer={transfer} tasks={tasks} documents={documents} stages={stages} />}
        {userRole === 'buyer' && <BuyerDashboard transfer={transfer} tasks={tasks} documents={documents} stages={stages} />}
        {userRole === 'conveyancer' && <LegalTracker transfer={transfer} stages={stages} documents={documents} />}
      </div>
    </div>
  );
};

// Seller Dashboard Component
const SellerDashboard: React.FC<{ transfer: PropertyTransfer | null; tasks: Task[]; documents: Document[]; stages: Stage[] }> = ({ transfer, tasks, documents, stages }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete': return 'text-green-600 bg-green-50';
      case 'in_progress': return 'text-blue-600 bg-blue-50';
      case 'pending': return 'text-gray-600 bg-gray-50';
      case 'delayed': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getProgressPercentage = () => {
    const completedStages = stages.filter(s => s.status === 'complete').length;
    return (completedStages / stages.length) * 100;
  };

  return (
    <div className="space-y-6">
      {/* Overview Section */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Property Transfer Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-500">Property Address</label>
              <p className="mt-1 text-sm font-semibold text-gray-900">{transfer?.propertyAddress}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Sale Price</label>
              <p className="mt-1 text-sm font-semibold text-gray-900">R {transfer?.salePrice.toLocaleString()}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Buyer Name</label>
              <p className="mt-1 text-sm font-semibold text-gray-900">{transfer?.buyerName}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Conveyancer</label>
              <p className="mt-1 text-sm font-semibold text-gray-900">{transfer?.conveyancerFirm}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Est. Registration</label>
              <p className="mt-1 text-sm font-semibold text-gray-900">{transfer?.estimatedRegistrationDate}</p>
            </div>
          </div>

          {/* Progress Tracker */}
          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Current Stage: {transfer?.currentStage}</span>
              <span className="text-sm text-gray-500">{Math.round(getProgressPercentage())}% Complete</span>
            </div>
            <Progress value={getProgressPercentage()} className="h-2" />
            <div className="flex justify-between mt-2">
              {stages.map((stage, index) => (
                <div key={stage.id} className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(stage.status)} border-2 border-white`}></div>
                  <span className="text-xs text-gray-600 mt-1 text-center max-w-20">{stage.name}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task List */}
        <Card className="border-gray-200 shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Seller Task List</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(task.status)}`}></div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{task.title}</h4>
                        <p className="text-xs text-gray-500">{task.description}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(task.status)}>
                      {task.status.replace('_', ' ')}
                    </Badge>
                    {task.status === 'not_started' && (
                      <Button size="sm" variant="outline">
                        <Upload className="h-4 w-4 mr-1" />
                        Upload
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Financial Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Sale Price</span>
                <span className="text-sm font-semibold">R {transfer?.salePrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Transfer Costs</span>
                <span className="text-sm font-semibold">R 45,000</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Bond Cancellation</span>
                <span className="text-sm font-semibold">R 2,000</span>
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-900">Net Proceeds (Est.)</span>
                  <span className="text-sm font-bold text-green-600">R 2,803,000</span>
                </div>
              </div>
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-800">
                  <DollarSign className="h-3 w-3 inline mr-1" />
                  Amount payable on registration: R 2,803,000
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Communication Panel */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Communication</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-start">
              <MessageSquare className="h-4 w-4 mr-2" />
              Message Buyer
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Scale className="h-4 w-4 mr-2" />
              Contact Conveyancer
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Bell className="h-4 w-4 mr-2" />
              View Notifications
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Buyer Dashboard Component
const BuyerDashboard: React.FC<{ transfer: PropertyTransfer | null; tasks: Task[]; documents: Document[]; stages: Stage[] }> = ({ transfer, tasks, documents, stages }) => {
  return (
    <div className="space-y-6">
      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Buyer Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-500">Property Address</label>
              <p className="mt-1 text-sm font-semibold text-gray-900">{transfer?.propertyAddress}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Offer Amount</label>
              <p className="mt-1 text-sm font-semibold text-gray-900">R {transfer?.salePrice.toLocaleString()}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Seller Name</label>
              <p className="mt-1 text-sm font-semibold text-gray-900">{transfer?.sellerName}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Conveyancer</label>
              <p className="mt-1 text-sm font-semibold text-gray-900">{transfer?.conveyancerFirm}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Bond Bank</label>
              <p className="mt-1 text-sm font-semibold text-gray-900">Standard Bank</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Buyer Task List */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Buyer Task List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Apply for Home Loan</h4>
                    <p className="text-xs text-gray-500">Submit bond application to your bank</p>
                  </div>
                </div>
              </div>
              <Badge className="text-green-600 bg-green-50">Complete</Badge>
            </div>
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Upload Bond Approval</h4>
                    <p className="text-xs text-gray-500">Upload bond approval letter</p>
                  </div>
                </div>
              </div>
              <Badge className="text-blue-600 bg-blue-50">In Progress</Badge>
            </div>
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Pay Transfer Duty</h4>
                    <p className="text-xs text-gray-500">R 85,500 due by 2024-02-15</p>
                  </div>
                </div>
              </div>
              <Button size="sm">Pay Now</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Summary */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Payment Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Purchase Price</span>
              <span className="text-sm font-semibold">R 2,850,000</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Deposit Paid</span>
              <span className="text-sm font-semibold text-green-600">R 285,000</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Transfer Duty</span>
              <span className="text-sm font-semibold">R 85,500</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Conveyancing Fees</span>
              <span className="text-sm font-semibold">R 25,000</span>
            </div>
            <div className="border-t pt-4">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-900">Total Outstanding</span>
                <span className="text-sm font-bold text-red-600">R 2,590,500</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Legal Tracker Component
const LegalTracker: React.FC<{ transfer: PropertyTransfer | null; stages: Stage[]; documents: Document[] }> = ({ transfer, stages, documents }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete': return 'text-green-600 bg-green-50 border-green-200';
      case 'in_progress': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'pending': return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'delayed': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Legal Process Tracker</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stages.map((stage, index) => (
              <div key={stage.id} className={`flex items-center justify-between p-4 border rounded-lg ${getStatusColor(stage.status)}`}>
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getStatusColor(stage.status)}`}>
                      {stage.status === 'complete' ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <Clock className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{stage.name}</h4>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-xs text-gray-500">Responsible: {stage.responsibleParty}</span>
                      {stage.dateCompleted && (
                        <span className="text-xs text-gray-500">Completed: {stage.dateCompleted}</span>
                      )}
                      <span className="text-xs text-gray-500">Timeline: {stage.expectedTimeline}</span>
                    </div>
                  </div>
                </div>
                <Badge className={getStatusColor(stage.status)}>
                  {stage.status.replace('_', ' ')}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Document Management */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Document Vault</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => (
              <div key={doc.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <div>
                      <h5 className="text-sm font-medium text-gray-900">{doc.name}</h5>
                      <p className="text-xs text-gray-500">Type: {doc.type}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline">
                    <Download className="h-3 w-3" />
                  </Button>
                </div>
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Uploaded by:</span>
                    <span className="text-gray-700">{doc.uploadedBy}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Date:</span>
                    <span className="text-gray-700">{doc.uploadedDate}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Verified by:</span>
                    <span className={doc.verified ? 'text-green-600' : 'text-orange-600'}>
                      {doc.verifiedBy}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PropertyTransferDashboard;
