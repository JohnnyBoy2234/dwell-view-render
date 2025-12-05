// @ts-nocheck
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { 
  ArrowLeft, 
  MapPin, 
  Bed, 
  Bath, 
  Car, 
  Home, 
  Heart,
  Share2,
  Calendar,
  User,
  Phone,
  Mail,
  FileText,
  CheckCircle,
  Ruler,
  Layers,
  Droplets,
  ParkingMeter
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/useSubscription';
import { useForm } from 'react-hook-form';
import { useApplications } from '@/hooks/useApplications';
import { useMessaging } from '@/hooks/useMessaging';
import { TenantApplicationButton } from '@/components/tenant/TenantApplicationButton';
import { BookViewingDialog } from "@/components/viewing/BookViewingDialog";
import { useViewingBooking } from "@/hooks/useViewingBooking";
import { format } from "date-fns";
import StartConversation from '@/components/StartConversation';
import { GatedViewingButton } from '@/components/viewing/GatedViewingButton';

interface Property {
  id: string;
  title: string;
  description: string;
  location: string;
  price: number;
  property_type: string;
  bedrooms: number;
  bathrooms: number;
  parking_spaces: number;
  size_sqm: number | null;
  furnished: boolean;
  pets_allowed: boolean;
  available_from: string | null;
  images: string[];
  amenities: string[];
  status: string;
  featured: boolean;
  created_at: string;
  landlord_id: string;
  profiles: {
    display_name: string;
    phone: string | null;
  } | null;
}

interface MessageFormData {
  name: string;
  email: string;
  phone?: string;
  message: string;
}

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { plan, loading: subscriptionLoading } = useSubscription();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [messageLoading, setMessageLoading] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<{display_name: string; phone: string | null} | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  
  const { activeBooking } = useViewingBooking(property?.id || '', property?.landlord_id || '');
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<MessageFormData>();
  const { hasAppliedToProperty, submitApplication, loading: applicationLoading } = useApplications();
  const { createConversation, sendMessage } = useMessaging();

  useEffect(() => {
    if (id) {
      fetchProperty();
    }
  }, [id]);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, phone')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setUserProfile(data);
    } catch (error: any) {
      console.error('Error fetching user profile:', error);
    }
  };


  const fetchProperty = async () => {
    if (!id) return;

    try {
      // First, fetch the property
      const { data: propertyData, error: propertyError } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .single();

      if (propertyError) throw propertyError;

      // Then, fetch the landlord profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('display_name, phone')
        .eq('user_id', propertyData.landlord_id)
        .single();

      if (profileError) {
        console.warn('Could not fetch landlord profile:', profileError);
      }

      // Combine the data
      const combinedData = {
        ...propertyData,
        profiles: profileData || null
      };

      setProperty(combinedData as unknown as Property);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading property",
        description: error.message
      });
      navigate('/properties');
    } finally {
      setLoading(false);
    }
  };

  const onSubmitMessage = async (data: MessageFormData) => {
    if (!property || !user) return;
    
    setMessageLoading(true);
    
    try {
      // First, check if a conversation already exists between this tenant and landlord for this property
      const { data: existingConversation, error: conversationCheckError } = await supabase
        .from('conversations')
        .select('id')
        .eq('property_id', property.id)
        .eq('tenant_id', user.id)
        .eq('landlord_id', property.landlord_id)
        .single();

      let conversationId: string;

      if (existingConversation) {
        // Use existing conversation
        conversationId = existingConversation.id;
      } else {
        // Create a new conversation
        const { data: newConversation, error: conversationError } = await supabase
          .from('conversations')
          .insert({
            property_id: property.id,
            tenant_id: user.id,
            landlord_id: property.landlord_id,
            status: 'active'
          })
          .select('id')
          .single();

        if (conversationError) throw conversationError;
        conversationId = newConversation.id;
      }

      // Create the message
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: data.message,
          message_type: 'text'
        });

      if (messageError) throw messageError;

      // Also create an inquiry record for backward compatibility
      const { error: inquiryError } = await supabase
        .from('inquiries')
        .insert({
          property_id: property.id,
          tenant_id: user.id,
          name: data.name,
          email: data.email,
          phone: data.phone,
          message: data.message
        });

      if (inquiryError) {
        console.warn('Could not create inquiry record:', inquiryError);
      }

      toast({
        title: "Message sent successfully!",
        description: "The landlord will receive your message and can respond in their Messages section."
      });

      setMessageOpen(false);
      reset();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error sending message",
        description: error.message
      });
    } finally {
      setMessageLoading(false);
    }
  };


  const loadLandlordPlan = async (landlordId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('plan, plan_status, phone')
        .eq('user_id', landlordId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to load landlord plan details', error);
      return null;
    }
  };

  const handleContactLandlord = async () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Sign in required",
        description: "Please sign in to message the landlord."
      });
      navigate('/auth');
      return;
    }

    if (!property) return;

    const planInfo = await loadLandlordPlan(property.landlord_id);
    const landlordPlan = planInfo?.plan?.toLowerCase?.() ?? 'free';
    const planStatus = planInfo?.plan_status?.toLowerCase?.() ?? 'inactive';

    if (landlordPlan === 'free' || planStatus !== 'active') {
      if (planInfo?.phone) {
        toast({
          title: "Contact landlord directly",
          description: `This landlord uses the free plan. Please reach them at ${planInfo.phone}.`
        });
      } else {
        toast({
          variant: "destructive",
          title: "Direct contact required",
          description: "This landlord uses the free plan. Their phone number is not available."
        });
      }
      return;
    }

    const conv = await createConversation(property.id, property.landlord_id, user.id);
    if (conv) {
      navigate(`/messages?c=${conv.id}`);
    }
  };

  const handleRequestViewing = async () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Sign in required",
        description: "Please sign in to request a viewing."
      });
      navigate('/auth');
      return;
    }

    if (!property) return;

    const planInfo = await loadLandlordPlan(property.landlord_id);
    const landlordPlan = planInfo?.plan?.toLowerCase?.() ?? 'free';
    const planStatus = planInfo?.plan_status?.toLowerCase?.() ?? 'inactive';

    if (landlordPlan === 'free' || planStatus !== 'active') {
      if (planInfo?.phone) {
        toast({
          title: "Contact landlord directly",
          description: `Viewing requests are handled outside the app for free listings. Please call ${planInfo.phone}.`
        });
      } else {
        toast({
          variant: "destructive",
          title: "Direct contact required",
          description: "Viewing requests are not available for this listing."
        });
      }
      return;
    }

    const conv = await createConversation(property.id, property.landlord_id, user.id);
    if (conv) {
      const viewingMessage = `Hi! I'm interested in viewing this property (${property.title}). Could we schedule a viewing? Please let me know what times work best for you.`;
      navigate(`/messages?c=${conv.id}&message=${encodeURIComponent(viewingMessage)}`);
    }
  };

  const handleShare = async () => {
    if (!property) return;

    const shareData = {
      title: "Check out this property on RentLekker",
      text: `${property.location} - R${property.price.toLocaleString()} per month. See more details here:`,
      url: window.location.href
    };

    // Check if Web Share API is supported (mobile/modern browsers)
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error: any) {
        // User cancelled the share or an error occurred
        if (error.name !== 'AbortError') {
          console.error('Error sharing:', error);
          // Fall back to clipboard
          fallbackToClipboard();
        }
      }
    } else {
      // Fall back to clipboard for desktop browsers
      fallbackToClipboard();
    }
  };

  const fallbackToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied to clipboard!",
        description: "The property link has been copied to your clipboard."
      });
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast({
        variant: "destructive",
        title: "Share failed",
        description: "Unable to share or copy the link. Please copy the URL manually."
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <Home className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">Property not found</h2>
          <p className="text-muted-foreground mb-4">The property you're looking for doesn't exist.</p>
          <Button asChild>
            <Link to="/properties">Browse Properties</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-ocean-blue/5 via-background to-earth-warm/10">
      <div className="container mx-auto p-4 md:p-6 max-w-6xl pb-24 md:pb-6">

        {/* Navigation */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={() => navigate('/properties')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Properties
          </Button>
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>

        {/* Property Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            {property.featured && <Badge variant="secondary">Featured</Badge>}
            <Badge>{property.status}</Badge>
          </div>
          <h1 className="text-3xl font-bold mb-2">R{property.price.toLocaleString()}/month</h1>
          <div className="flex items-center text-muted-foreground mb-4">
            <MapPin className="h-4 w-4 mr-1" />
            {property.property_type} in {property.location}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Gallery */}
            <Card className="bg-gradient-to-br from-card/80 via-card to-ocean-blue/5 border-ocean-blue/20 shadow-elegant">
              <CardContent className="p-0">
                {property.images && property.images.length > 0 ? (
                  <Carousel className="w-full" opts={{ loop: true }}>
                    <CarouselContent>
                      {property.images.map((image, index) => (
                        <CarouselItem key={index}>
                          <div className="relative h-96 rounded-lg overflow-hidden">
                            <img
                              src={image}
                              alt={`${property.title} - Image ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    <CarouselPrevious className="left-4" />
                    <CarouselNext className="right-4" />
                  </Carousel>
                ) : (
                  <div className="h-96 bg-muted rounded-lg flex items-center justify-center">
                    <Home className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Property Details */}
            <Tabs defaultValue="overview" className="w-full">
              <div className="border-b border-brand-gray-200">
                <TabsList className="bg-transparent p-0 h-auto">
                  <div className="flex gap-2">
                    <TabsTrigger
                      value="overview"
                      className="px-3 py-2 text-sm font-medium text-brand-gray-700 hover:text-brand-blue rounded-none border-b-2 border-transparent data-[state=active]:border-brand-blue data-[state=active]:text-brand-blue"
                      aria-selected
                    >
                      Overview
                    </TabsTrigger>
                    <TabsTrigger
                      value="features"
                      className="px-3 py-2 text-sm font-medium text-brand-gray-700 hover:text-brand-blue rounded-none border-b-2 border-transparent data-[state=active]:border-brand-blue data-[state=active]:text-brand-blue"
                    >
                      Features
                    </TabsTrigger>
                  </div>
                </TabsList>
              </div>
              
              <TabsContent value="overview">
                <Card className="bg-gradient-to-br from-card/80 via-card to-earth-warm/5 border-earth-warm/20 shadow-elegant">
                  <CardHeader>
                    <CardTitle>Property Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="max-w-none px-2 md:px-0">
                      <p className="text-muted-foreground leading-relaxed break-words">{property.description}</p>
                    </div>
                    
                    <div className="flex flex-wrap gap-6 mt-6">
                      <div className="flex items-center gap-2">
                        <Bed className="h-5 w-5 text-ocean-blue" />
                        <span className="font-medium">{property.bedrooms} Bedrooms</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Droplets className="h-5 w-5 text-earth-warm" />
                        <span className="font-medium">{property.bathrooms} Bathrooms</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ParkingMeter className="h-5 w-5 text-success-green" />
                        <span className="font-medium">{property.parking_spaces} Parking</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Layers className="h-5 w-5 text-primary" />
                        <span className="font-medium">{property.size_sqm || 'N/A'} m²</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="features">
                <Card className="bg-gradient-to-br from-card/80 via-card to-success-green/5 border-success-green/20 shadow-elegant">
                  <CardHeader>
                    <CardTitle>Property Features</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <Badge variant={property.furnished ? "default" : "outline"}>
                          {property.furnished ? "Furnished" : "Unfurnished"}
                        </Badge>
                        <Badge variant={property.pets_allowed ? "default" : "outline"}>
                          {property.pets_allowed ? "Pet Friendly" : "No Pets"}
                        </Badge>
                      </div>
                      
                      {property.amenities && property.amenities.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-3">Amenities</h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {property.amenities.map((amenity, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span className="text-sm">{amenity}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {property.available_from && (
                        <div>
                          <h4 className="font-semibold mb-2">Available From</h4>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-primary" />
                            <span>{new Date(property.available_from).toLocaleDateString()}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="location">
                <Card className="bg-gradient-to-br from-card/80 via-card to-ocean-blue/5 border-ocean-blue/20 shadow-elegant">
                  <CardHeader>
                    <CardTitle>Location</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 mb-4">
                      <MapPin className="h-5 w-5 text-primary" />
                      <span className="text-lg">{property.location}</span>
                    </div>
                    <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
                      <p className="text-muted-foreground">Interactive map coming soon</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Landlord */}
            <Card className="bg-gradient-to-br from-ocean-blue/5 via-card to-earth-warm/5 border-ocean-blue/30 shadow-elegant">
              <CardHeader>
                <CardTitle>Contact</CardTitle>
                <CardDescription>Message the landlord or book a viewing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {property.profiles && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-ocean-blue to-ocean-blue-dark rounded-full flex items-center justify-center shadow-md">
                        <User className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold">{property.profiles.display_name}</div>
                        {property.profiles.phone && (
                          <div className="text-sm text-muted-foreground">{property.profiles.phone}</div>
                        )}
                      </div>
                    </div>
                    
                    {plan === 'free' && user?.id !== property.landlord_id && (
                      <div className="space-y-2">
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <p className="text-sm text-amber-800 flex items-start gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            <span>This landlord is on the Free plan. Contact them directly using the information above.</span>
                          </p>
                        </div>
                        
                        {property.profiles.phone && (
                          <Button variant="outline" className="w-full" asChild>
                            <a href={`tel:${property.profiles.phone.replace(/\D/g, '')}`} className="flex items-center justify-center gap-2">
                              <Phone className="h-4 w-4" />
                              Call {property.profiles.display_name?.split(' ')[0] || 'Landlord'}
                            </a>
                          </Button>
                        )}
                        
                        <Button variant="outline" className="w-full" asChild>
                          <a href={`mailto:${property.landlord_id}@example.com`} className="flex items-center justify-center gap-2">
                            <Mail className="h-4 w-4" />
                            Email {property.profiles.display_name?.split(' ')[0] || 'Landlord'}
                          </a>
                        </Button>
                        
                        <div className="pt-2 text-center">
                          <p className="text-xs text-muted-foreground">
                            Upgrade to Pro for in-app messaging and more features
                          </p>
                          <Button variant="link" size="sm" className="h-auto p-0 text-sm font-medium" onClick={() => navigate('/pricing')}>
                            View Plans →
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {user && property.landlord_id === user.id ? (
                  <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <CheckCircle className="h-4 w-4 inline mr-1" />
                      This is your property listing
                    </p>
                  </div>
                ) : user && property.landlord_id !== user.id && plan !== 'free' ? (
                  <div className="space-y-2">
                    <GatedViewingButton
                      propertyId={property.id}
                      landlordId={property.landlord_id}
                      propertyTitle={property.title}
                    />
                    
                    {/* Application Button */}
                    <TenantApplicationButton 
                      propertyId={property.id}
                      className="w-full"
                    />
                  </div>
                ) : !user ? (
                  <GatedViewingButton
                    propertyId={property.id}
                    landlordId={property.landlord_id}
                    propertyTitle={property.title}
                  />
                ) : (
                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-lg text-center">
                    <p className="text-sm text-amber-800">
                      Upgrade to Pro to message landlords and access premium features
                    </p>
                    <Button variant="default" size="sm" className="mt-2" onClick={() => navigate('/pricing')}>
                      View Plans
                    </Button>
                  </div>
                )}

                
              </CardContent>
            </Card>

            {/* Sign In Prompt for Non-Authenticated Users */}
            {!user && (
              <Card className="bg-gradient-to-br from-earth-warm/5 via-card to-ocean-blue/5 border-earth-warm/30 shadow-elegant">
                <CardHeader>
                  <CardTitle>Get Started</CardTitle>
                <CardDescription>Sign in to message the landlord or book a viewing</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-center space-y-3">
                    <p className="text-muted-foreground">Sign in to contact the landlord or book a viewing for this property</p>
                    <Button 
                      className="w-full" 
                      onClick={() => navigate('/auth')}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Sign In to Get Started
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Property Owner Notice */}
            {user && property.landlord_id === user.id && (
              <Card className="bg-gradient-to-br from-success-green/5 via-card to-success-green/10 border-success-green/30 shadow-elegant">
                <CardHeader>
                  <CardTitle>Property Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <CheckCircle className="h-4 w-4 inline mr-1" />
                      This is your property listing. Manage applications from your dashboard.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Current Viewing Status */}
            {user && property.landlord_id !== user.id && activeBooking && (
              <Card className="bg-gradient-to-br from-ocean-blue/5 via-card to-ocean-blue/10 border-ocean-blue/30 shadow-elegant">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-ocean-blue" />
                    Your Scheduled Viewing
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-2">
                    <div className="font-medium">
                      {format(new Date(activeBooking.start_time), "EEEE, MMMM d, yyyy")}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(activeBooking.start_time), "h:mm a")} - {format(new Date(activeBooking.end_time), "h:mm a")}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => setBookingOpen(true)}
                    >
                      Manage Booking
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Property Info */}
              <Card className="bg-gradient-to-br from-earth-warm/5 via-card to-earth-warm/10 border-earth-warm/30 shadow-elegant">
                <CardHeader>
                  <CardTitle>Property Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Property Type</span>
                    <span className="font-medium">{property.property_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Listed</span>
                    <span className="font-medium">{new Date(property.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="pt-2 border-t border-white/20">
                    <button
                      onClick={() => setReportModalOpen(true)}
                      className="text-xs font-semibold text-ios-red hover:text-ios-red/80 transition-colors"
                    >
                      Report Property
                    </button>
                  </div>
                </CardContent>
              </Card>
          </div>
        </div>

      </div>

      {/* Mobile glass sticky action bar */}
      {property && (
        <div className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-white/20 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md px-3 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
          <div className="mx-auto max-w-3xl flex items-center justify-center gap-2">
            <button
              onClick={handleRequestViewing}
              className="rounded-xl bg-brand.blue text-white px-3 py-2 text-sm hover:bg-brand.blue/90 focus:outline-none focus:ring-2 focus:ring-brand.blue/40"
            >
              Request Viewing
            </button>
            <button
              onClick={handleContactLandlord}
              className="rounded-xl bg-white/70 dark:bg-slate-800/60 border border-white/20 text-brand.blue px-3 py-2 text-sm hover:bg-white focus:outline-none focus:ring-2 focus:ring-brand.blue/30"
            >
              Message
            </button>
            <button
              onClick={handleShare}
              className="rounded-xl bg-brand.green text-white px-3 py-2 text-sm hover:bg-brand.green/90 focus:outline-none focus:ring-2 focus:ring-brand.green/40"
            >
              Share
            </button>
          </div>
        </div>
      )}

      {property && (
        <BookViewingDialog
          propertyId={property.id}
          landlordId={property.landlord_id}
          open={bookingOpen}
          onOpenChange={setBookingOpen}
        />
      )}
    </div>
  );
}