import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Users, Shield, Globe, Award, Zap } from "lucide-react";
import { Link } from "react-router-dom";

const About = () => {
  const teamMembers = [
    {
      name: "Sarah Johnson",
      role: "Founder & CEO",
      image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
      description: "10+ years in property management and tech innovation."
    },
    {
      name: "Michael Chen",
      role: "CTO",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
      description: "Former tech lead at major property platforms."
    },
    {
      name: "Amara Okafor",
      role: "Head of Operations",
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
      description: "Expert in South African rental market dynamics."
    }
  ];

  const stats = [
    { number: "50,000+", label: "Properties Listed" },
    { number: "100,000+", label: "Happy Users" },
    { number: "95%", label: "Success Rate" },
    { number: "R2.5B+", label: "Property Value" }
  ];

  return (
    <div className="min-h-screen bg-background">
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-foreground mb-4">About SwiftRent</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            We're revolutionizing the South African rental market by connecting landlords and tenants directly, 
            eliminating unnecessary fees and creating genuine connections.
          </p>
        </div>

        {/* Mission Section */}
        <section className="mb-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
              <p className="text-lg text-muted-foreground mb-6">
                At SwiftRent, we believe finding the perfect rental home shouldn't be complicated or expensive. 
                Our mission is to create a transparent, direct connection between property owners and renters 
                across South Africa.
              </p>
              <p className="text-lg text-muted-foreground mb-6">
                By eliminating the middleman, we're not just saving money – we're building trust, fostering 
                genuine relationships, and making the rental process more human again.
              </p>
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Heart className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Built with Care</h3>
                  <p className="text-muted-foreground">Every feature designed with user experience in mind</p>
                </div>
              </div>
            </div>
            <div className="relative">
              <img 
                src="https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" 
                alt="Modern South African neighborhood" 
                className="rounded-lg shadow-lg w-full"
              />
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">Our Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card>
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Trust & Transparency</h3>
                <p className="text-muted-foreground">
                  We verify all properties and maintain open communication channels between all parties.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Users className="h-8 w-8 text-accent" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Community First</h3>
                <p className="text-muted-foreground">
                  Building a supportive community where both landlords and tenants thrive together.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-success-green/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Zap className="h-8 w-8 text-success-green" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Innovation</h3>
                <p className="text-muted-foreground">
                  Continuously improving our platform with cutting-edge technology and user feedback.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Stats */}
        <section className="mb-16 bg-gradient-to-r from-primary to-accent text-white rounded-lg p-12">
          <h2 className="text-3xl font-bold text-center mb-12">Our Impact</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((stat, index) => (
              <div key={index}>
                <div className="text-4xl font-bold mb-2">{stat.number}</div>
                <div className="text-white/90">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Team */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">Meet Our Team</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {teamMembers.map((member, index) => (
              <Card key={index}>
                <CardContent className="p-8 text-center">
                  <img 
                    src={member.image} 
                    alt={member.name}
                    className="w-24 h-24 rounded-full mx-auto mb-4 object-cover"
                  />
                  <h3 className="text-xl font-semibold mb-2">{member.name}</h3>
                  <p className="text-primary font-medium mb-3">{member.role}</p>
                  <p className="text-muted-foreground text-sm">{member.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* South African Focus */}
        <section className="mb-16">
          <div className="bg-secondary/30 rounded-lg p-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="flex items-center space-x-3 mb-6">
                  <Globe className="h-8 w-8 text-primary" />
                  <h2 className="text-3xl font-bold">Proudly South African</h2>
                </div>
                <p className="text-lg text-muted-foreground mb-6">
                  As a South African company, we understand the unique challenges and opportunities 
                  in our local rental market. From Cape Town to Johannesburg, Durban to Pretoria, 
                  we're here to serve our community.
                </p>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-center">
                    <Award className="h-5 w-5 text-success-green mr-3" />
                    Licensed and regulated in South Africa
                  </li>
                  <li className="flex items-center">
                    <Award className="h-5 w-5 text-success-green mr-3" />
                    Supporting local communities and economy
                  </li>
                  <li className="flex items-center">
                    <Award className="h-5 w-5 text-success-green mr-3" />
                    Understanding of local rental laws and customs
                  </li>
                </ul>
              </div>
              <div>
                <img 
                  src="https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" 
                  alt="South African flag and landscape" 
                  className="rounded-lg shadow-lg w-full"
                />
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center">
          <h2 className="text-3xl font-bold mb-4">Join the SwiftRent Community</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Whether you're looking for a home or renting out your property, we're here to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/properties">
              <Button size="lg">
                Find Properties
              </Button>
            </Link>
            <Link to="/list-property">
              <Button size="lg" variant="outline">
                List Your Property
              </Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
};

export default About;