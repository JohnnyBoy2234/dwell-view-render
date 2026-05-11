import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Users, Shield, Globe, Award, Zap, Building2, Home, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const About = () => {


  return (
    <div className="min-h-screen bg-background">
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">We're Transforming Renting in South Africa</h1>
          <p className="text-xl text-muted-foreground max-w-4xl mx-auto">
            MzanziHomes is more than a rental platform it's a movement. We're revolutionizing the South African rental market by connecting landlords and tenants directly, eliminating unnecessary fees, and creating genuine, trustworthy connections.
          </p>
        </div>

        {/* Mission Section */}
        <section className="mb-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
              <p className="text-lg text-muted-foreground mb-6">
                At MzanziHomes, we believe finding the perfect rental home shouldn't be complicated, risky, or expensive. Our mission is simple: to make renting fair, transparent, and human again.
              </p>
              <p className="text-lg text-muted-foreground mb-6">
                By eliminating middlemen and outdated processes, we're not just helping landlords save money we're building trust, fostering real relationships, and creating a rental ecosystem where both landlords and tenants thrive.
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
                src="/about 2.jpg"
                alt="Modern South African neighborhood" 
                className="rounded-lg shadow-lg w-full"
              />
            </div>
          </div>
        </section>

        {/* Vision for the Future */}
        <section className="mb-16 text-center">
          <h2 className="text-3xl font-bold mb-6">A Vision for the Future</h2>
          <p className="text-lg text-muted-foreground max-w-4xl mx-auto mb-8">
            MzanziHomes is not only about saving money today it's about reshaping the future of housing in South Africa. By creating a trusted, transparent, and commission-free system, we believe we can ease financial pressure on families, encourage investment in housing, and spark long-term growth in communities nationwide.
          </p>
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
                  Renting should uplift people. MzanziHomes builds stronger communities where everyone benefits.
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


        {/* South African Focus */}
        <section className="mb-16">
          <div className="bg-secondary/30 rounded-lg p-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <img 
                  src="/about 1.jpg"
                  alt="South African flag and landscape" 
                  className="rounded-lg shadow-lg w-full h-96 object-cover"
                />
              </div>
              <div>
                <div className="flex items-center space-x-3 mb-6">
                  <Globe className="h-8 w-8 text-primary" />
                  <h2 className="text-3xl font-bold">Proudly South African</h2>
                </div>
                <p className="text-lg text-muted-foreground mb-6">
                  We're not just another tech startup we're rooted here. From Cape Town to Johannesburg, Durban to Pretoria, we know the unique challenges of the South African rental market, and we're committed to being part of the solution.
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
            </div>
          </div>
        </section>

        {/* Learn More Sections */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">Learn More</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-ocean-blue rounded-lg flex items-center justify-center mb-6">
                  <Building2 className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4">For Landlords</h3>
                <p className="text-muted-foreground mb-6">
                  Everything you need to know about renting your property on MzanziHomes. Learn how to list properties, connect with quality tenants, and manage everything from one dashboard.
                </p>
                <Link to="/about/landlord">
                  <Button className="w-full">
                    Learn More for Landlords
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-ocean-blue rounded-lg flex items-center justify-center mb-6">
                  <Home className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4">For Tenants</h3>
                <p className="text-muted-foreground mb-6">
                  Everything you need to know about finding and renting your perfect home on MzanziHomes. Learn how to search properties, apply easily, and manage your rental.
                </p>
                <Link to="/about/tenant">
                  <Button className="w-full">
                    Learn More for Tenants
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center">
          <h2 className="text-3xl font-bold mb-4">Join the MzanziHomes Community</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Whether you're searching for your dream home or renting out your property, MzanziHomes is here to make the process safe, simple, and rewarding.
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