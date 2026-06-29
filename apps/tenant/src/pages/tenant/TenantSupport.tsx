import { useState } from 'react';
import { HelpCircle, MessageSquare, Phone, Mail, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import { Button } from '@mzanzihomes/ui/components/button';
import { Input } from '@mzanzihomes/ui/components/input';
import { Textarea } from '@mzanzihomes/ui/components/textarea';
import { Label } from '@mzanzihomes/ui/components/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@mzanzihomes/ui/components/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@mzanzihomes/ui/components/select';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';

const faqItems = [
  {
    id: '1',
    question: 'How do I pay my rent?',
    answer: 'You can pay your rent through several methods: Electronic Funds Transfer (EFT), credit/debit card, or by setting up automatic payments. Visit the Payments & Rent section in your dashboard to make a payment or set up recurring payments.',
  },
  {
    id: '2',
    question: 'How do I submit a maintenance request?',
    answer: 'Go to the Maintenance section in your dashboard and click "New Request". Fill out the form with details about the issue, select the priority level, and include any relevant photos. You\'ll receive updates on the status of your request.',
  },
  {
    id: '3',
    question: 'Where can I find my lease agreement?',
    answer: 'All your lease documents are available in the Lease Documents section. You can view and download your signed lease agreement, move-in inspection report, and other related documents.',
  },
  {
    id: '4',
    question: 'How do I contact my landlord?',
    answer: 'You can message your landlord directly through the Messages section in your dashboard. This provides a secure way to communicate and keeps a record of all conversations.',
  },
  {
    id: '5',
    question: 'What should I do in case of an emergency?',
    answer: 'For emergencies that pose immediate danger (fire, gas leak, flooding), call emergency services first. Then contact your landlord immediately. For urgent but non-emergency issues, submit a high-priority maintenance request.',
  },
  {
    id: '6',
    question: 'Can I make changes to my rental property?',
    answer: 'Any modifications to the property must be approved by your landlord in writing before making changes. This includes painting, installing fixtures, or making structural changes. Contact your landlord through the Messages section to request permission.',
  },
];

export default function TenantSupport() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaqItems, setOpenFaqItems] = useState<string[]>([]);
  const [supportForm, setSupportForm] = useState({
    subject: '',
    category: '',
    message: '',
    priority: 'medium',
  });

  const filteredFaq = faqItems.filter(item =>
    item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleFaqItem = (id: string) => {
    setOpenFaqItems(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSubmitSupport = async () => {
    if (!supportForm.subject || !supportForm.message || !supportForm.category) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast({
      title: "Support Request Submitted",
      description: "We've received your request and will respond within 24 hours.",
    });
    
    setSupportForm({ subject: '', category: '', message: '', priority: 'medium' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Support & Help</h1>
        <p className="text-muted-foreground">
          Find answers to common questions or get in touch with our support team
        </p>
      </div>

      {/* Quick Contact Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-medium transition-all duration-200 cursor-pointer">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-ocean-blue/10 rounded-full flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-ocean-blue" />
              </div>
              <div>
                <p className="font-semibold">Live Chat</p>
                <p className="text-sm text-muted-foreground">Get instant help</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-medium transition-all duration-200 cursor-pointer">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-success-green/10 rounded-full flex items-center justify-center">
                <Phone className="h-5 w-5 text-success-green" />
              </div>
              <div>
                <p className="font-semibold">Call Support</p>
                <p className="text-sm text-muted-foreground">+27 11 123 4567</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-medium transition-all duration-200 cursor-pointer">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-earth-warm/10 rounded-full flex items-center justify-center">
                <Mail className="h-5 w-5 text-earth-warm" />
              </div>
              <div>
                <p className="font-semibold">Email Support</p>
                <p className="text-sm text-muted-foreground">support@mzanzihomes.com</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FAQ Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-ocean-blue" />
            Frequently Asked Questions
          </CardTitle>
          <CardDescription>
            Search through our most common questions and answers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search FAQ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* FAQ Items */}
          <div className="space-y-2">
            {filteredFaq.map((item) => (
              <Collapsible
                key={item.id}
                open={openFaqItems.includes(item.id)}
                onOpenChange={() => toggleFaqItem(item.id)}
              >
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <p className="font-medium text-left">{item.question}</p>
                    {openFaqItems.includes(item.id) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="p-4 pt-0">
                    <p className="text-muted-foreground leading-relaxed">{item.answer}</p>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>

          {filteredFaq.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No FAQ items match your search.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact Support Form */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Support</CardTitle>
          <CardDescription>
            Can't find the answer you're looking for? Send us a message
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                placeholder="Brief description of your issue"
                value={supportForm.subject}
                onChange={(e) => setSupportForm(prev => ({ ...prev, subject: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="category">Category *</Label>
              <Select 
                value={supportForm.category} 
                onValueChange={(value) => setSupportForm(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="payments">Payments & Billing</SelectItem>
                  <SelectItem value="maintenance">Maintenance Issues</SelectItem>
                  <SelectItem value="lease">Lease Questions</SelectItem>
                  <SelectItem value="account">Account & Login</SelectItem>
                  <SelectItem value="general">General Inquiry</SelectItem>
                  <SelectItem value="technical">Technical Issues</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="priority">Priority</Label>
            <Select 
              value={supportForm.priority} 
              onValueChange={(value) => setSupportForm(prev => ({ ...prev, priority: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low - General question</SelectItem>
                <SelectItem value="medium">Medium - Need assistance</SelectItem>
                <SelectItem value="high">High - Urgent issue</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="message">Message *</Label>
            <Textarea
              id="message"
              placeholder="Please describe your issue or question in detail..."
              value={supportForm.message}
              onChange={(e) => setSupportForm(prev => ({ ...prev, message: e.target.value }))}
              rows={5}
            />
          </div>

          <div className="flex items-center justify-between pt-4">
            <p className="text-sm text-muted-foreground">
              We typically respond within 24 hours
            </p>
            <Button 
              onClick={handleSubmitSupport}
              className="bg-ocean-blue hover:bg-ocean-blue-dark"
            >
              Send Message
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}