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
  CheckCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { useApplications } from '@/hooks/useApplications';
import { useMessaging } from '@/hooks/useMessaging';
import { TenantApplicationButton } from '@/components/tenant/TenantApplicationButton';
import { BookViewingDialog } from "@/components/viewing/BookViewingDialog";
import { useViewingBooking } from "@/hooks/useViewingBooking";
import { format } from "date-fns";

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
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [messageLoading, setMessageLoading] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<{display_name: string; phone: string | null} | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  
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
        description: "Please sign in to book a viewing."
      });
      navigate('/auth');
      return;
    }

    setBookingOpen(true);
  };

  const handleCallLandlord = () => {
    if (!user) {
      toast({
        variant: "destructive", 
        title: "Sign in required",
        description: "Please sign in to call the landlord."
      });
      navigate('/auth');
      return;
    }

    if (property?.profiles?.phone) {
      window.open(`tel:${property.profiles.phone}`, '_self');
    } else {
      toast({
        variant: "destructive",
        title: "Phone number not available",
        description: "The landlord's phone number is not available."
      });
    }
  };



  const toggleLike = () => {
    setIsLiked(!isLiked);
    toast({
      title: isLiked ? "Removed from favorites" : "Added to favorites",
      description: isLiked ? "Property removed from your favorites" : "Property saved to your favorites"
    });
  };

  const handleShare = async () => {
    if (!property) return;

    const shareData = {
      title: "Check out this property on EasyRent",
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
      <div className="container mx-auto p-6 max-w-6xl">
        {/* Navigation */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={() => navigate('/properties')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Properties
          </Button>
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={toggleLike}>
            <Heart className={`h-4 w-4 mr-2 ${isLiked ? 'fill-current text-red-500' : ''}`} />
            {isLiked ? 'Saved' : 'Save'}
          </Button>
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
          <h1 className="text-3xl font-bold mb-2">{property.title}</h1>
          <div className="flex items-center text-muted-foreground mb-4">
            <MapPin className="h-4 w-4 mr-1" />
            {property.location}
          </div>
          <div className="text-3xl font-bold">R{property.price.toLocaleString()}/month</div>
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
              <TabsList className="grid w-full grid-cols-3 bg-gradient-to-r from-ocean-blue/10 to-earth-warm/10 border border-ocean-blue/20">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="features">Features</TabsTrigger>
                <TabsTrigger value="location">Location</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview">
                <Card className="bg-gradient-to-br from-card/80 via-card to-earth-warm/5 border-earth-warm/20 shadow-elegant">
                  <CardHeader>
                    <CardTitle>Property Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">{property.description}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                      <div className="text-center p-4 bg-gradient-to-br from-ocean-blue/10 to-ocean-blue/5 border border-ocean-blue/20 rounded-lg shadow-sm">
                        <Bed className="h-8 w-8 mx-auto mb-2 text-ocean-blue" />
                        <div className="font-semibold">{property.bedrooms}</div>
                        <div className="text-sm text-muted-foreground">Bedrooms</div>
                      </div>
                      <div className="text-center p-4 bg-gradient-to-br from-earth-warm/10 to-earth-warm/5 border border-earth-warm/20 rounded-lg shadow-sm">
                        <Bath className="h-8 w-8 mx-auto mb-2 text-earth-warm" />
                        <div className="font-semibold">{property.bathrooms}</div>
                        <div className="text-sm text-muted-foreground">Bathrooms</div>
                      </div>
                      <div className="text-center p-4 bg-gradient-to-br from-success-green/10 to-success-green/5 border border-success-green/20 rounded-lg shadow-sm">
                        <Car className="h-8 w-8 mx-auto mb-2 text-success-green" />
                        <div className="font-semibold">{property.parking_spaces}</div>
                        <div className="text-sm text-muted-foreground">Parking</div>
                      </div>
                      <div className="text-center p-4 bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-lg shadow-sm">
                        <Home className="h-8 w-8 mx-auto mb-2 text-primary" />
                        <div className="font-semibold">{property.size_sqm || 'N/A'}</div>
                        <div className="text-sm text-muted-foreground">Size (sqm)</div>
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
                )}
                
                {user && property.landlord_id === user.id ? (
                  <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <CheckCircle className="h-4 w-4 inline mr-1" />
                      This is your property listing
                    </p>
                  </div>
                ) : user && property.landlord_id !== user.id ? (
                  <div className="space-y-2">
                     <Button 
                       className="w-full" 
                       onClick={handleContactLandlord}
                     >
                       <Mail className="h-4 w-4 mr-2" />
                       Message Landlord
                     </Button>
                     {activeBooking ? (
                        <Button 
                          variant="outline"
                          className="w-full"
                          onClick={() => setBookingOpen(true)}
                        >
                          <Calendar className="h-4 w-4 mr-2" />
                          Manage Your Viewing
                        </Button>
                      ) : (
                        <Button 
                          variant="outline"
                          className="w-full"
                          onClick={handleRequestViewing}
                        >
                          <Calendar className="h-4 w-4 mr-2" />
                          Book a Viewing
                        </Button>
                      )}
                      
                      {/* Application Button */}
                      <TenantApplicationButton 
                        propertyId={property.id}
                        className="w-full"
                      />
                    </div>
                ) : (
                  <Button 
                    className="w-full"
                    onClick={() => navigate('/auth')}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Sign In to Message Landlord
                  </Button>
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
              </CardContent>
            </Card>
          </div>
        </div>

      </div>

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