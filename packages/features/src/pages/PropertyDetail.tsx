// @ts-nocheck
import { useState, useEffect } from 'react';
import { LoadingLogo } from '@mzanzihomes/ui/components/LoadingLogo';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Button } from '@mzanzihomes/ui/components/button';
import { Input } from '@mzanzihomes/ui/components/input';
import { Label } from '@mzanzihomes/ui/components/label';
import { Textarea } from '@mzanzihomes/ui/components/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import { Badge } from '@mzanzihomes/ui/components/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@mzanzihomes/ui/components/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@mzanzihomes/ui/components/tabs';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@mzanzihomes/ui/components/carousel';
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
  ParkingMeter,
  Eye,
  MessageCircle
} from 'lucide-react';
import { supabase } from '@mzanzihomes/supabase/client';
import { useAuth } from '@mzanzihomes/supabase/hooks/useAuth';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { useApplications } from '@mzanzihomes/features/application';
import { useMessaging } from '@mzanzihomes/supabase/hooks/useMessaging';
import { TenantApplicationButton } from '@mzanzihomes/features/application';
import { BookViewingDialog } from '@mzanzihomes/features/viewing';
import { useViewingBooking } from '@mzanzihomes/features/viewing';
import { format } from "date-fns";
import { StartConversation } from '@mzanzihomes/features/messaging';
import { formatPreScreeningMessage, type PreScreeningData } from '@mzanzihomes/common/types/message';
import { ViewingPreScreeningForm } from '@mzanzihomes/features/viewing';
import { GatedViewingButton } from '@mzanzihomes/features/viewing';
import { SharePropertyMenu } from '@mzanzihomes/features/property';
import { ReportPropertyModal } from '@mzanzihomes/features/property';

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
  listing_type?: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  preferred_contact_method?: string;
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
  const [contactPreScreenOpen, setContactPreScreenOpen] = useState(false);
  const [contactPreScreenLoading, setContactPreScreenLoading] = useState(false);
  // Long descriptions collapse to a preview with Read more / Show less. Expands
  // in place — no scroll jump.
  const [descExpanded, setDescExpanded] = useState(false);
  const [userProfile, setUserProfile] = useState<{display_name: string; phone: string | null} | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [landlordSubscribed, setLandlordSubscribed] = useState(false);
  const [landlordPlanLoaded, setLandlordPlanLoaded] = useState(false);
  // Direct phone/email popup — shown for landlords without a subscription, who
  // only have a listing and no in-app messaging.
  const [contactDetailsOpen, setContactDetailsOpen] = useState(false);
  
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

      // Then, fetch the landlord profile.
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('display_name, phone')
        .eq('user_id', propertyData.landlord_id)
        .maybeSingle();

      if (profileError && profileError.code !== 'PGRST116') {
        console.warn('Could not fetch landlord profile:', profileError);
      }

      // Whether the landlord has in-app messaging (paid plan) — via a
      // SECURITY DEFINER RPC, since RLS hides the landlord's plan from a
      // browsing tenant. Decides message→chat vs. contact→phone/email.
      try {
        const { data: subbed } = await supabase.rpc('property_landlord_subscribed', { p_property_id: id });
        setLandlordSubscribed(!!subbed);
      } catch {
        setLandlordSubscribed(false);
      }
      setLandlordPlanLoaded(true);

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

    if (user.id === property.landlord_id) return;

    // Landlord has no subscription → no in-app messaging. Show their phone/email
    // so the tenant can reach out directly.
    if (landlordPlanLoaded && !landlordSubscribed) {
      setContactDetailsOpen(true);
      return;
    }

    // First contact with this landlord should collect the pre-screening info
    // (the same form the "Request Viewing" button shows) instead of dropping
    // the tenant into a blank thread. Scope the check to landlord, matching
    // StartConversation, so we don't re-ask on every property.
    try {
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('tenant_id', user.id as any)
        .eq('landlord_id', property.landlord_id as any)
        .limit(1);

      if (!existing || existing.length === 0) {
        setContactPreScreenOpen(true);
        return;
      }
    } catch (error) {
      // On a lookup failure fall through to the pre-screening form rather than
      // silently opening a blank conversation.
      console.error('Error checking existing conversations:', error);
      setContactPreScreenOpen(true);
      return;
    }

    const conv = await createConversation(property.id, property.landlord_id, user.id);
    if (conv) {
      navigate(`/messages?c=${conv.id}`);
    }
  };

  const handleContactPreScreeningSubmit = async (formData: PreScreeningData) => {
    if (!user || !property) return;
    setContactPreScreenLoading(true);
    try {
      const conv = await createConversation(property.id, property.landlord_id, user.id);
      if (conv && 'id' in conv) {
        const preScreeningMessage = formatPreScreeningMessage(formData, property.title);
        await sendMessage(conv.id as string, preScreeningMessage);
        navigate(`/messages?c=${conv.id}`);
        toast({
          title: "Message sent!",
          description: "The landlord will review your information and respond soon."
        });
      } else {
        toast({ variant: "destructive", title: "Error", description: "Failed to create conversation" });
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error?.message || "Failed to send message. Please try again." });
    } finally {
      setContactPreScreenLoading(false);
      setContactPreScreenOpen(false);
    }
  };

  const handleShare = async () => {
    if (!property) return;

    const shareData = {
      title: "Check out this property on MzanziHomes",
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
        <LoadingLogo size="lg" />
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

  const propertyUrl = typeof window !== 'undefined' ? window.location.href : '';
  const ogImage = property.images?.[0] || 'https://mzanzihomes.com/apple-touch-icon.png';
  const isSale = property.listing_type === 'sale';
  const ogTitle = `R${property.price.toLocaleString()}${isSale ? '' : '/month'} - ${property.property_type} in ${property.location}`;
  const ogDescription = property.description?.slice(0, 200) || `${property.bedrooms} bed, ${property.bathrooms} bath property available for ${isSale ? 'sale' : 'rent'} in ${property.location}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-ocean-blue/5 via-background to-earth-warm/10">
      {/* Dynamic Meta Tags for Social Sharing */}
      <Helmet>
        <title>{ogTitle} | MzanziHomes</title>
        <meta name="description" content={ogDescription} />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={propertyUrl} />
        <meta property="og:title" content={ogTitle} />
        <meta property="og:description" content={ogDescription} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="MzanziHomes" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={propertyUrl} />
        <meta name="twitter:title" content={ogTitle} />
        <meta name="twitter:description" content={ogDescription} />
        <meta name="twitter:image" content={ogImage} />
      </Helmet>

      <div className="container mx-auto p-4 md:p-6 max-w-6xl pb-24 md:pb-6">

        {/* Navigation */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/properties'))}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex-1" />
          <SharePropertyMenu
            propertyUrl={propertyUrl}
            propertyTitle={property.property_type}
            propertyDescription={property.description || ''}
            propertyImage={ogImage}
            propertyPrice={property.price}
            propertyLocation={property.location}
            propertyId={property.id}
          />
        </div>

        {/* Property Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            {property.featured && <Badge variant="secondary">Featured</Badge>}
            <Badge>{property.status}</Badge>
          </div>
          <h1 className="text-3xl font-bold mb-2">R{property.price.toLocaleString()}{isSale ? '' : '/month'}</h1>
          <div className="flex items-center text-muted-foreground mb-4">
            <MapPin className="h-4 w-4 mr-1" />
            {property.property_type} in {property.location}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Gallery */}
            <Card className="shadow-elegant">
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

            {/* Specifications — directly below the price/location, above the
                description, so the key facts read first (§3.2) */}
            <Card className="shadow-elegant">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Specifications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-4">
                  <div className="flex items-center gap-2.5">
                    <Bed className="h-5 w-5 shrink-0 text-ocean-blue" />
                    <div className="leading-tight">
                      <p className="text-sm font-semibold">{property.bedrooms}</p>
                      <p className="text-xs text-muted-foreground">Bedrooms</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Droplets className="h-5 w-5 shrink-0 text-earth-warm" />
                    <div className="leading-tight">
                      <p className="text-sm font-semibold">{property.bathrooms}</p>
                      <p className="text-xs text-muted-foreground">Bathrooms</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <ParkingMeter className="h-5 w-5 shrink-0 text-success-green" />
                    <div className="leading-tight">
                      <p className="text-sm font-semibold">{property.parking_spaces}</p>
                      <p className="text-xs text-muted-foreground">Parking</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Layers className="h-5 w-5 shrink-0 text-primary" />
                    <div className="leading-tight">
                      <p className="text-sm font-semibold">{property.size_sqm || 'N/A'}{property.size_sqm ? ' m²' : ''}</p>
                      <p className="text-xs text-muted-foreground">Floor size</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Home className="h-5 w-5 shrink-0 text-ocean-blue" />
                    <div className="leading-tight">
                      <p className="text-sm font-semibold capitalize">{property.property_type}</p>
                      <p className="text-xs text-muted-foreground">Type</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle className="h-5 w-5 shrink-0 text-success-green" />
                    <div className="leading-tight">
                      <p className="text-sm font-semibold">{property.furnished ? 'Furnished' : 'Unfurnished'}</p>
                      <p className="text-xs text-muted-foreground">{property.pets_allowed ? 'Pet friendly' : 'No pets'}</p>
                    </div>
                  </div>
                </div>
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
                <Card className="shadow-elegant">
                  <CardHeader>
                    <CardTitle>Property Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="max-w-none px-2 md:px-0">
                      {(() => {
                        const desc = property.description || '';
                        const LIMIT = 280;
                        const isLong = desc.length > LIMIT;
                        const shown = !isLong || descExpanded ? desc : desc.slice(0, LIMIT).trimEnd() + '…';
                        return (
                          <>
                            <p className="text-muted-foreground leading-relaxed break-words whitespace-pre-line">{shown}</p>
                            {isLong && (
                              <button
                                type="button"
                                onClick={() => setDescExpanded(v => !v)}
                                className="mt-2 text-sm font-semibold text-ocean-blue hover:text-ocean-blue-dark active:opacity-70 transition"
                                aria-expanded={descExpanded}
                              >
                                {descExpanded ? 'Show less' : 'Read more'}
                              </button>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="features">
                <Card className="shadow-elegant">
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
                <Card className="shadow-elegant">
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
            <Card className="shadow-elegant">
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
                    {property.listing_type === 'sale' ? (
                      /* Inquire Section for Sale Properties */
                      <div className="space-y-3">
                        <Button
                          onClick={handleContactLandlord}
                          className="w-full bg-ocean-blue hover:bg-ocean-blue/90 text-white rounded-xl py-5 text-base font-semibold"
                          size="lg"
                        >
                          <MessageCircle className="h-5 w-5 mr-2" />
                          Inquire About This Property
                        </Button>
                        {(property.contact_name || property.contact_phone || property.contact_email) && (
                          <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-600 space-y-1">
                            {property.contact_name && (
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-gray-400" />
                                <span>{property.contact_name}</span>
                              </div>
                            )}
                            {property.contact_phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-gray-400" />
                                <span>{property.contact_phone}</span>
                              </div>
                            )}
                            {property.contact_email && (
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-gray-400" />
                                <span>{property.contact_email}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Original Viewing Button for Rental Properties */
                      <>
                        {/* Contact landlord — subscribed landlord opens the
                            pre-screening → in-app chat; a landlord with only a
                            listing (no subscription) shows their phone/email. */}
                        <Button
                          onClick={handleContactLandlord}
                          className="w-full bg-ocean-blue hover:bg-ocean-blue/90 text-white rounded-xl py-5 text-base font-semibold"
                          size="lg"
                        >
                          <MessageCircle className="h-5 w-5 mr-2" />
                          {landlordPlanLoaded && !landlordSubscribed ? 'Contact landlord' : 'Message landlord'}
                        </Button>

                        <GatedViewingButton
                          propertyId={property.id}
                          landlordId={property.landlord_id}
                          propertyTitle={property.title}
                          renderStartConversation={(sc) => (
                            <StartConversation
                              {...sc}
                              renderPreScreening={(ps) => <ViewingPreScreeningForm {...ps} />}
                            />
                          )}
                        />

                        {/* Application Button */}
                        <TenantApplicationButton
                          propertyId={property.id}
                          className="w-full"
                        />
                      </>
                    )}
                  </div>
                ) : !user ? (
                  <GatedViewingButton
                    propertyId={property.id}
                    landlordId={property.landlord_id}
                    propertyTitle={property.title}
                    renderStartConversation={(sc) => (
                      <StartConversation
                        {...sc}
                        renderPreScreening={(ps) => <ViewingPreScreeningForm {...ps} />}
                      />
                    )}
                  />
                ) : null}

                
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

            {/* Property Information card removed — those facts now live in the
                Specifications section. Report property kept as a clean secondary
                action (§3.4 / §3.9). */}
            <div className="pt-1">
              <ReportPropertyModal propertyId={property.id} />
            </div>
          </div>
        </div>

      </div>

      {/* Sticky mobile action bar removed (§3.6) — the same Request Viewing,
          Message and Share actions live in the in-page Contact card, so the
          detail page keeps full screen height with a clean back button. */}

      {property && (
        <BookViewingDialog
          propertyId={property.id}
          landlordId={property.landlord_id}
          open={bookingOpen}
          onOpenChange={setBookingOpen}
        />
      )}

      {property && (
        <ViewingPreScreeningForm
          open={contactPreScreenOpen}
          onOpenChange={setContactPreScreenOpen}
          onSubmit={handleContactPreScreeningSubmit}
          loading={contactPreScreenLoading}
          propertyTitle={property.title}
        />
      )}

      {/* Direct contact popup — for landlords without a subscription */}
      {property && (
        <Dialog open={contactDetailsOpen} onOpenChange={setContactDetailsOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Contact the landlord</DialogTitle>
              <DialogDescription>
                Reach out directly to enquire about this property.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2.5 pt-1">
              {(property.contact_phone || property.profiles?.phone) ? (
                <a
                  href={`tel:${property.contact_phone || property.profiles?.phone}`}
                  className="flex items-center gap-3 rounded-xl border border-black/8 bg-white p-3.5 transition-colors hover:bg-slate-50"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ocean-blue/10">
                    <Phone className="h-5 w-5 text-ocean-blue" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-slate-900">Call landlord</p>
                    <p className="truncate text-[12.5px] text-muted-foreground">{property.contact_phone || property.profiles?.phone}</p>
                  </div>
                </a>
              ) : null}
              {property.contact_email ? (
                <a
                  href={`mailto:${property.contact_email}`}
                  className="flex items-center gap-3 rounded-xl border border-black/8 bg-white p-3.5 transition-colors hover:bg-slate-50"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-success-green/10">
                    <Mail className="h-5 w-5 text-success-green" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-slate-900">Email landlord</p>
                    <p className="truncate text-[12.5px] text-muted-foreground">{property.contact_email}</p>
                  </div>
                </a>
              ) : null}
              {!property.contact_phone && !property.profiles?.phone && !property.contact_email && (
                <p className="text-[13px] text-muted-foreground">
                  This landlord hasn't shared contact details. Please check back later.
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}