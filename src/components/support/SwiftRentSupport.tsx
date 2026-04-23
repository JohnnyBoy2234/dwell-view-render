import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, Clock, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { useSupportMessages, SupportMessage, CreateSupportMessage } from '@/hooks/useSupportMessages';
import { useToast } from '@/hooks/use-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const categoryOptions = [
  { value: 'general', label: 'General Inquiry', icon: '💬' },
  { value: 'technical', label: 'Technical Issue', icon: '🔧' },
  { value: 'billing', label: 'Billing Question', icon: '💳' },
  { value: 'property', label: 'Property Related', icon: '🏠' },
  { value: 'other', label: 'Other', icon: '❓' }
];

const priorityOptions = [
  { value: 'low', label: 'Low', color: 'bg-gray-500' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-500' }
];

const statusConfig = {
  open: { icon: Clock, color: 'text-orange-500', bg: 'bg-orange-100', label: 'Open' },
  in_progress: { icon: AlertCircle, color: 'text-blue-500', bg: 'bg-blue-100', label: 'In Progress' },
  resolved: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-100', label: 'Resolved' },
  closed: { icon: CheckCircle, color: 'text-gray-500', bg: 'bg-gray-100', label: 'Closed' }
};

export function MzanziHomesSupport() {
  const { messages, loading, submitting, createMessage } = useSupportMessages();
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<CreateSupportMessage>({
    subject: '',
    message: '',
    category: 'general',
    priority: 'medium'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subject.trim() || !formData.message.trim()) {
      toast({
        title: "Please fill in all fields",
        description: "Subject and message are required.",
        variant: "destructive"
      });
      return;
    }

    try {
      await createMessage(formData);
      toast({
        title: "Message sent successfully!",
        description: "We'll get back to you as soon as possible."
      });
      setFormData({ subject: '', message: '', category: 'general', priority: 'medium' });
      setShowForm(false);
    } catch (error) {
      toast({
        title: "Failed to send message",
        description: "Please try again later.",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (message: SupportMessage) => {
    const config = statusConfig[message.status];
    const Icon = config.icon;
    
    return (
      <Badge variant="secondary" className={`${config.bg} ${config.color} border-0`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getCategoryIcon = (category: string) => {
    const option = categoryOptions.find(opt => opt.value === category);
    return option?.icon || '❓';
  };

  const isLandlord = user?.user_metadata?.role === 'landlord';
  const propertyId = searchParams.get('property');

  const handleBackToDashboard = () => {
    if (isLandlord) {
      navigate('/landlord/dashboard');
    } else {
      navigate(`/enhancedlandlorddashboard${propertyId ? '?property=' + propertyId : ''}`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Back Button for Landlords */}
      {isLandlord && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBackToDashboard}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </Button>
      )}
      
      <Card className="w-full">
        <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">MzanziHomes Support</CardTitle>
              <CardDescription>Send us your concerns or queries</CardDescription>
            </div>
          </div>
          <Button 
            onClick={() => setShowForm(!showForm)}
            size="sm"
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            {showForm ? 'Cancel' : 'New Message'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-gray-50 rounded-lg border">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Subject</label>
                <Input
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Brief description of your concern"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Category</label>
                <Select
                  value={formData.category}
                  onValueChange={(value: any) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <span className="flex items-center gap-2">
                          <span>{option.icon}</span>
                          {option.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Priority</label>
              <Select
                value={formData.priority}
                onValueChange={(value: any) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${option.color}`} />
                        {option.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Message</label>
              <Textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Please provide details about your concern or query..."
                rows={4}
                required
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                <Send className="h-4 w-4 mr-2" />
                {submitting ? 'Sending...' : 'Send Message'}
              </Button>
            </div>
          </form>
        )}

        {/* Messages List */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-gray-700">Your Messages</h4>
          {loading ? (
            <div className="text-center py-4 text-gray-500">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                <p>Loading messages...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className="p-3 bg-white border rounded-lg hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getCategoryIcon(message.category)}</span>
                      <h5 className="font-medium text-sm">{message.subject}</h5>
                    </div>
                    {getStatusBadge(message)}
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                    {message.message}
                  </p>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{new Date(message.created_at).toLocaleDateString()}</span>
                    <Badge variant="outline" className="text-xs">
                      {message.priority}
                    </Badge>
                  </div>

                  {message.admin_response && (
                    <div className="mt-3 p-2 bg-blue-50 border-l-2 border-blue-200 rounded">
                      <p className="text-xs font-medium text-blue-800 mb-1">Admin Response:</p>
                      <p className="text-xs text-blue-700">{message.admin_response}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
    </div>
  );
}
