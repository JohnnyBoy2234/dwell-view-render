import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import { Button } from '@mzanzihomes/ui/components/button';
import { Textarea } from '@mzanzihomes/ui/components/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@mzanzihomes/ui/components/select';
import { Badge } from '@mzanzihomes/ui/components/badge';
import { Input } from '@mzanzihomes/ui/components/input';
import { 
  MessageSquare, 
  Send, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Search,
  Filter,
  User,
  Mail,
  Calendar
} from 'lucide-react';
import { useAdminSupportMessages } from '@mzanzihomes/features/support'; // ponytail: admin support view; retire when admin sliced;
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';

const statusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' }
];

const priorityOptions = [
  { value: 'all', label: 'All Priority' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' }
];

const statusConfig = {
  open: { icon: Clock, color: 'text-orange-500', bg: 'bg-orange-100', label: 'Open' },
  in_progress: { icon: AlertCircle, color: 'text-blue-500', bg: 'bg-blue-100', label: 'In Progress' },
  resolved: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-100', label: 'Resolved' },
  closed: { icon: CheckCircle, color: 'text-gray-500', bg: 'bg-gray-100', label: 'Closed' }
};

const priorityConfig = {
  low: { color: 'bg-gray-500', label: 'Low' },
  medium: { color: 'bg-blue-500', label: 'Medium' },
  high: { color: 'bg-orange-500', label: 'High' },
  urgent: { color: 'bg-red-500', label: 'Urgent' }
};

export function SupportMessagesAdmin() {
  const { user } = useAuth();
  const { messages, loading, submitting, respondToMessage, updateMessageStatus } = useAdminSupportMessages();
  const { toast } = useToast();
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [response, setResponse] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const filteredMessages = messages.filter(message => {
    const matchesSearch = message.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         message.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         message.user_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || message.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || message.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const handleRespond = async () => {
    if (!selectedMessage || !response.trim()) {
      toast({
        title: "Please enter a response",
        description: "Response cannot be empty.",
        variant: "destructive"
      });
      return;
    }

    try {
      await respondToMessage(selectedMessage.id, response, user?.id || '');
      toast({
        title: "Response sent successfully!",
        description: "The user will be notified of your response."
      });
      setResponse('');
      setSelectedMessage(null);
    } catch (error) {
      toast({
        title: "Failed to send response",
        description: "Please try again later.",
        variant: "destructive"
      });
    }
  };

  const handleStatusChange = async (messageId: string, newStatus: string) => {
    try {
      await updateMessageStatus(messageId, newStatus as any);
      toast({
        title: "Status updated successfully!",
        description: `Message status changed to ${newStatus}.`
      });
    } catch (error) {
      toast({
        title: "Failed to update status",
        description: "Please try again later.",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (message: any) => {
    const config = statusConfig[message.status as keyof typeof statusConfig];
    const Icon = config.icon;
    
    return (
      <Badge variant="secondary" className={`${config.bg} ${config.color} border-0`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const config = priorityConfig[priority as keyof typeof priorityConfig];
    
    return (
      <Badge variant="outline" className="text-xs">
        <div className={`w-2 h-2 rounded-full ${config.color} mr-1`} />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle>Support Messages</CardTitle>
                <CardDescription>Manage user concerns and queries</CardDescription>
              </div>
            </div>
            <Badge variant="secondary" className="text-sm">
              {filteredMessages.length} messages
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search messages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                {priorityOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setPriorityFilter('all');
              }}
            >
              <Filter className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          </div>

          {/* Messages List */}
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading messages...</div>
          ) : filteredMessages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No support messages found.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {filteredMessages.map((message) => (
                <div
                  key={message.id}
                  className={`p-4 border rounded-lg hover:shadow-sm transition-all cursor-pointer ${
                    selectedMessage?.id === message.id ? 'ring-2 ring-blue-500 bg-blue-50' : 'bg-white'
                  }`}
                  onClick={() => setSelectedMessage(message)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm">{message.subject}</h4>
                        {getStatusBadge(message)}
                        {getPriorityBadge(message.priority)}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          User: {message.user_id.slice(0, 8)}...
                        </div>
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {message.user_id || 'No user ID'}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(message.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {message.message}
                  </p>

                  {message.admin_response && (
                    <div className="mt-3 p-3 bg-blue-50 border-l-2 border-blue-200 rounded">
                      <p className="text-xs font-medium text-blue-800 mb-1">Admin Response:</p>
                      <p className="text-xs text-blue-700">{message.admin_response}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex gap-2">
                      <div onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={message.status}
                          onValueChange={(value) => handleStatusChange(message.id, value)}
                        >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.slice(1).map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Response Panel */}
      {selectedMessage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Respond to Message</CardTitle>
            <CardDescription>
              Responding to: <strong>{selectedMessage.subject}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Your Response</label>
                <Textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder="Type your response here..."
                  rows={4}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedMessage(null);
                    setResponse('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRespond}
                  disabled={submitting || !response.trim()}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {submitting ? 'Sending...' : 'Send Response'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
