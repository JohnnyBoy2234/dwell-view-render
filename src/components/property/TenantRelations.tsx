import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Users, 
  Mail, 
  FileText, 
  MessageSquare, 
  UserPlus,
  Send,
  Eye,
  Calendar,
  ArrowRight,
  Clock
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Property } from '@/types/dashboard';

interface TenantRelationsProps {
  property: Property;
}

export function TenantRelations({ property }: TenantRelationsProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [inviteEmail, setInviteEmail] = useState('');

  const handleSendInvite = () => {
    if (!inviteEmail) return;
    
    // Mock invitation logic
    toast({
      title: "Invitation Sent",
      description: `Application invitation sent to ${inviteEmail}`,
    });
    setInviteEmail('');
  };

  const applications = [
    {
      id: '1',
      name: 'Sarah Mitchell',
      email: 's.mitchell@email.com',
      status: 'pending',
      submittedAt: '2 hours ago',
      documents: 5
    },
    {
      id: '2',
      name: 'James Wilson',
      email: 'j.wilson@email.com',
      status: 'under_review',
      submittedAt: '1 day ago',
      documents: 7
    },
    {
      id: '3',
      name: 'Emma Thompson',
      email: 'e.thompson@email.com',
      status: 'approved',
      submittedAt: '3 days ago',
      documents: 6
    }
  ];

  const inquiries = [
    {
      id: '1',
      name: 'Michael Brown',
      message: 'Hi, I\'m interested in viewing this property. When would be a good time?',
      time: '30 mins ago',
      replied: false
    },
    {
      id: '2',
      name: 'Lisa Chen',
      message: 'Is the property still available? I\'d like to schedule a viewing.',
      time: '2 hours ago',
      replied: true
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-earth-warm/10 text-earth-warm border-earth-warm/20';
      case 'under_review':
        return 'bg-ocean-blue/10 text-ocean-blue border-ocean-blue/20';
      case 'approved':
        return 'bg-success-green/10 text-success-green border-success-green/20';
      default:
        return 'bg-ios-gray/10 text-ios-gray border-ios-gray/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Invite Tenant */}
      <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-ios-sm rounded-ios-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-ios-gray-dark flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-ios-blue" />
            Invite Potential Tenant
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-ios-gray">Send a direct application link to interested tenants</p>
          <div className="flex gap-2">
            <Input
              placeholder="Enter tenant's email address"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1 border-ios-gray/20 rounded-ios"
            />
            <Button
              onClick={handleSendInvite}
              className="bg-ios-blue hover:bg-ios-blue-dark text-white rounded-ios px-6"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Applications */}
      <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-ios-sm rounded-ios-card">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold text-ios-gray-dark">
            Applications ({applications.length})
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/manage-property/${property.id}?tab=applications`)}
            className="border-ios-gray/20 hover:bg-ios-gray/5 rounded-ios"
          >
            View All
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {applications.slice(0, 3).map((application) => (
            <div
              key={application.id}
              className="flex items-center justify-between p-3 bg-ios-gray/5 rounded-ios hover:bg-ios-gray/10 transition-colors cursor-pointer"
              onClick={() => navigate(`/applications/${application.id}`)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-ios-blue to-ios-blue-light rounded-full flex items-center justify-center">
                  <Users className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-medium text-ios-gray-dark">{application.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={`${getStatusColor(application.status)} rounded-ios text-xs`}>
                      {application.status.replace('_', ' ')}
                    </Badge>
                    <span className="text-xs text-ios-gray">{application.submittedAt}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-xs text-ios-gray">
                  <FileText className="h-3 w-3" />
                  {application.documents}
                </div>
                <ArrowRight className="h-4 w-4 text-ios-gray" />
              </div>
            </div>
          ))}
          
          {applications.length === 0 && (
            <div className="text-center py-6">
              <Users className="h-8 w-8 text-ios-gray mx-auto mb-2" />
              <p className="text-ios-gray">No applications yet</p>
              <p className="text-xs text-ios-gray mt-1">Applications will appear here when tenants apply</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Inquiries */}
      <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-ios-sm rounded-ios-card">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold text-ios-gray-dark">
            Recent Inquiries ({inquiries.length})
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/messages')}
            className="border-ios-gray/20 hover:bg-ios-gray/5 rounded-ios"
          >
            View All
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {inquiries.map((inquiry) => (
            <div
              key={inquiry.id}
              className="p-3 bg-ios-gray/5 rounded-ios hover:bg-ios-gray/10 transition-colors cursor-pointer"
              onClick={() => navigate('/messages')}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-ios-gray-dark">{inquiry.name}</p>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-ios-gray" />
                    <span className="text-xs text-ios-gray">{inquiry.time}</span>
                  </div>
                </div>
                {!inquiry.replied && (
                  <Badge className="bg-earth-warm/10 text-earth-warm border-earth-warm/20 rounded-ios text-xs">
                    New
                  </Badge>
                )}
              </div>
              <p className="text-sm text-ios-gray line-clamp-2">{inquiry.message}</p>
              <div className="flex items-center justify-between mt-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-ios-blue hover:bg-ios-blue/10 rounded-ios p-1 h-auto"
                >
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Reply
                </Button>
                <ArrowRight className="h-3 w-3 text-ios-gray" />
              </div>
            </div>
          ))}
          
          {inquiries.length === 0 && (
            <div className="text-center py-6">
              <MessageSquare className="h-8 w-8 text-ios-gray mx-auto mb-2" />
              <p className="text-ios-gray">No inquiries yet</p>
              <p className="text-xs text-ios-gray mt-1">Tenant inquiries will appear here</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-ios-sm rounded-ios-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-ios-gray-dark">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={() => navigate(`/manage-property/${property.id}?tab=viewings`)}
            className="border-ios-gray/20 hover:bg-ios-gray/5 rounded-ios h-auto p-3 flex flex-col items-center gap-2"
          >
            <Calendar className="h-4 w-4 text-ios-blue" />
            <span className="text-xs">Schedule Viewing</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/messages')}
            className="border-ios-gray/20 hover:bg-ios-gray/5 rounded-ios h-auto p-3 flex flex-col items-center gap-2"
          >
            <Mail className="h-4 w-4 text-ios-green" />
            <span className="text-xs">Send Message</span>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}