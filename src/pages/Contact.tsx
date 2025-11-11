import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, MapPin, Clock, MessageSquare, Users, Wrench, Briefcase } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission logic here
    toast({
      title: "Message sent!",
      description: "We'll get back to you within 24 hours.",
    });
    setFormData({ name: '', email: '', subject: '', message: '' });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const contactMethods = [
    {
      icon: Mail,
      title: "Email Us",
      description: "Send us a message anytime",
      value: "hello@RentLekker.co.za",
      href: "mailto:hello@RentLekker.co.za"
    },
    {
      icon: Phone,
      title: "Call Us",
      description: "Mon-Fri, 8AM-6PM SAST",
      value: "+27 (0) 21 123 4567",
      href: "tel:+27211234567"
    },
    {
      icon: MapPin,
      title: "Visit Us",
      description: "Our head office",
      value: "Cape Town, South Africa",
      href: null
    },
    {
      icon: Clock,
      title: "Response Time",
      description: "We typically respond within",
      value: "24 hours",
      href: null
    }
  ];

  const supportTypes = [
    {
      icon: MessageSquare,
      title: "General Inquiries",
      description: "Questions about RentLekker services",
      color: "text-primary"
    },
    {
      icon: Users,
      title: "Landlord Support",
      description: "Help with property listings and management",
      color: "text-accent"
    },
    {
      icon: Users,
      title: "Tenant Support", 
      description: "Assistance with applications and rentals",
      color: "text-success-green"
    },
    {
      icon: Wrench,
      title: "Technical Support",
      description: "Platform issues and technical help",
      color: "text-orange-500"
    },
    {
      icon: Briefcase,
      title: "Business Partnerships",
      description: "Collaboration and partnership opportunities",
      color: "text-purple-500"
    },
    {
      icon: Mail,
      title: "Media Inquiries",
      description: "Press and media related questions",
      color: "text-pink-500"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <SectionHeader 
          title="Get in Touch"
          subtitle="We're here to help you with any questions about RentLekker. Reach out and let's make renting better together."
        />

        {/* Contact Methods */}
        <section className="mb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {contactMethods.map((method, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <method.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{method.title}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{method.description}</p>
                  {method.href ? (
                    <a 
                      href={method.href}
                      className="text-primary hover:underline font-medium"
                    >
                      {method.value}
                    </a>
                  ) : (
                    <p className="font-medium">{method.value}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Support Types */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">How Can We Help?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {supportTypes.map((type, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className={`w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center`}>
                      <type.icon className={`h-5 w-5 ${type.color}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">{type.title}</h3>
                      <p className="text-sm text-muted-foreground">{type.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Contact Form */}
        <section className="mb-16">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl text-center">Send Us a Message</CardTitle>
                <p className="text-center text-muted-foreground">
                  Fill out the form below and we'll get back to you as soon as possible.
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium mb-2">
                        Full Name *
                      </label>
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Your full name"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium mb-2">
                        Email Address *
                      </label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="your.email@example.com"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium mb-2">
                      Subject *
                    </label>
                    <Input
                      id="subject"
                      name="subject"
                      type="text"
                      required
                      value={formData.subject}
                      onChange={handleChange}
                      placeholder="What is this regarding?"
                    />
                  </div>
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium mb-2">
                      Message *
                    </label>
                    <Textarea
                      id="message"
                      name="message"
                      required
                      rows={6}
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Tell us more about how we can help..."
                    />
                  </div>
                  <Button type="submit" className="w-full" size="lg">
                    Send Message
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Additional Info */}
        <section className="text-center">
          <div className="bg-secondary/30 rounded-lg p-8">
            <h2 className="text-2xl font-bold mb-4">Need Immediate Help?</h2>
            <p className="text-muted-foreground mb-6">
              For urgent matters, you can reach out to us directly or check our support documentation.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="outline" size="lg">
                <Phone className="h-4 w-4 mr-2" />
                Call Now
              </Button>
              <Button variant="outline" size="lg">
                <MessageSquare className="h-4 w-4 mr-2" />
                Live Chat
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Contact;