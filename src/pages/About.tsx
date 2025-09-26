import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Users, Shield, Globe, Award, Zap } from "lucide-react";
import { Link } from "react-router-dom";

const About = () => {

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
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">We're Transforming Renting in South Africa</h1>
          <p className="text-xl text-muted-foreground max-w-4xl mx-auto">
            SwiftRent is more than a rental platform — it's a movement. We're revolutionizing the South African rental market by connecting landlords and tenants directly, eliminating unnecessary fees, and creating genuine, trustworthy connections.
          </p>
        </div>

        {/* Mission Section */}
        <section className="mb-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
              <p className="text-lg text-muted-foreground mb-6">
                At SwiftRent, we believe finding the perfect rental home shouldn't be complicated, risky, or expensive. Our mission is simple: to make renting fair, transparent, and human again.
              </p>
              <p className="text-lg text-muted-foreground mb-6">
                By eliminating middlemen and outdated processes, we're not just helping landlords save money — we're building trust, fostering real relationships, and creating a rental ecosystem where both landlords and tenants thrive.
              </p>
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Heart className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Built with Care</h3>
                  <p className="text-muted-foreground">Every feature designed to make renting effortless for modern South Africans</p>
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
                  Verified landlords, credit-checked tenants, and clear communication at every step.
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
                  Renting should uplift people. SwiftRent builds stronger communities where everyone benefits.
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
                  We're constantly improving, guided by user feedback and powered by cutting-edge technology.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Stats */}
        <section className="mb-16 bg-gradient-to-r from-primary to-accent text-white rounded-lg p-12">
          <h2 className="text-3xl font-bold text-center mb-8">Our Impact</h2>
          <p className="text-center text-white/90 mb-12 text-lg">
            Every listing is a step toward transforming how South Africans rent, one home at a time.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((stat, index) => (
              <div key={index}>
                <div className="text-4xl font-bold mb-2">{stat.number}</div>
                <div className="text-white/90">{stat.label}</div>
              </div>
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
                  We're not just another tech startup — we're rooted here. From Cape Town to Johannesburg, Durban to Pretoria, we know the unique challenges of the South African rental market, and we're committed to being part of the solution.
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

        {/* Vision for the Future */}
        <section className="mb-16 text-center">
          <h2 className="text-3xl font-bold mb-6">A Vision for the Future</h2>
          <p className="text-lg text-muted-foreground max-w-4xl mx-auto mb-8">
            SwiftRent is not only about saving money today — it's about reshaping the future of housing in South Africa. By creating a trusted, transparent, and commission-free system, we believe we can ease financial pressure on families, encourage investment in housing, and spark long-term growth in communities nationwide.
          </p>
        </section>

        {/* CTA */}
        <section className="text-center">
          <h2 className="text-3xl font-bold mb-4">Join the SwiftRent Community</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Whether you're searching for your dream home or renting out your property, SwiftRent is here to make the process safe, simple, and rewarding.
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