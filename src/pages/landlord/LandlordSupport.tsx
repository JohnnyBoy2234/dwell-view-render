import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, MessageSquare, Send } from 'lucide-react';
import { useSupportMessages } from '@/hooks/useSupportMessages';

export function LandlordSupport() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createMessage, messages, loading } = useSupportMessages();
  
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    category: 'general',
    priority: 'medium'
  });

  const categories = [
    { value: 'general', label: 'General Inquiry' },
    { value: 'technical', label: 'Technical Issue' },
    { value: 'billing', label: 'Billing Question' },
    { value: 'property', label: 'Property Related' },
    { value: 'other', label: 'Other' }
  ];

  const priorities = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' }
  ];

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
      await createMessage({
        subject: formData.subject,
        message: formData.message,
        category: formData.category as any,
        priority: formData.priority as any
      });
      
      toast({
        title: "Message sent!",
        description: "Our support team will get back to you soon."
      });
      
      setFormData({
        subject: '',
        message: '',
        category: 'general',
        priority: 'medium'
      });
    } catch (error) {
      console.error('Error submitting support request:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate(-1)}
          className="rounded-full"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Support Center</h1>
          <p className="text-muted-foreground">Get help with your account and properties</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Contact Support
              </CardTitle>
              <CardDescription>
                Send us a message and we'll get back to you as soon as possible.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Subject</label>
                  <Input
                    placeholder="Brief description of your issue"
                    value={formData.subject}
                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Category</label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({...formData, category: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Priority</label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value) => setFormData({...formData, priority: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        {priorities.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Message</label>
                  <Textarea
                    placeholder="Please describe your issue in detail..."
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                  />
                </div>
                
                <div className="flex justify-end">
                  <Button type="submit" className="gap-2">
                    <Send className="h-4 w-4" />
                    Send Message
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
          
          {messages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Previous Messages</CardTitle>
                <CardDescription>Your recent support requests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div key={msg.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium">{msg.subject}</h4>
                        <span className="text-xs text-muted-foreground">
                          {new Date(msg.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{msg.message}</p>
                      {msg.admin_response && (
                        <div className="mt-3 p-3 bg-muted/20 rounded-md">
                          <p className="text-sm font-medium mb-1">Admin Response:</p>
                          <p className="text-sm">{msg.admin_response}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Support Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Working Hours</h4>
                <p className="text-sm text-muted-foreground">
                  Monday - Friday: 8:00 AM - 8:00 PM SAST<br />
                  Saturday: 9:00 AM - 5:00 PM SAST<br />
                  Sunday: Closed
                </p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Contact</h4>
                <p className="text-sm text-muted-foreground">
                  Email: support@RentLekker.co.za<br />
                  Phone: +27 12 345 6789
                </p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Emergency Support</h4>
                <p className="text-sm text-muted-foreground">
                  For urgent matters outside business hours, please call our emergency line:
                  <span className="block font-medium mt-1">+27 87 654 3210</span>
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium">How long does it take to get a response?</h4>
                <p className="text-sm text-muted-foreground">
                  We aim to respond to all inquiries within 24 hours during business days.
                </p>
              </div>
              
              <div>
                <h4 className="font-medium">What information should I include in my message?</h4>
                <p className="text-sm text-muted-foreground">
                  Please include your property address, issue details, and any relevant documents or screenshots.
                </p>
              </div>
              
              <div>
                <h4 className="font-medium">Can I track my support ticket?</h4>
                <p className="text-sm text-muted-foreground">
                  Yes, all your support requests are saved in your account under "Previous Messages".
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
