import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Heart, 
  Share2, 
  MapPin, 
  Bed, 
  Bath, 
  Car, 
  Wifi, 
  AirVent, 
  Zap,
  Shield,
  MessageCircle,
  Calendar,
  Eye,
  Phone,
  Mail,
  User,
  Home,
  Star,
  CheckCircle,
  Send
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { BookViewingDialog } from "@/components/viewing/BookViewingDialog";

interface Property {
  id: string;
  title: string;
  description: string;
  price: number;
  location: string;
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
  profiles?: {
    display_name: string;
    phone: string | null;
  } | null;
}

interface MessageFormData {
  message: string;
  viewing_date?: string;
  viewing_time?: string;
}

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [messageFormData, setMessageFormData] = useState<MessageFormData>({
    message: ""
  });

  useEffect(() => {
    if (id) {
      fetchProperty();
    }
  }, [id]);

  const fetchProperty = async () => {
    if (!id) return;
    
    setLoading(true);
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

      setProperty(combinedData as Property);
    } catch (error: any) {
      console.error("Error fetching property:", error);
      toast({
        title: "Error",
        description: "Property not found",
        variant: "destructive",
      });
      navigate("/properties");
      return;
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!user) {
      navigate("/auth?redirect=" + window.location.pathname);
      return;
    }

    if (!property || !messageFormData.message.trim()) {
      toast({
        title: "Error",
        description: "Please enter a message",
        variant: "destructive",
      });
      return;
    }

    setSendingMessage(true);
    try {
      // Create or get existing conversation
      const { data: existingConversation } = await supabase
        .from("conversations")
        .select("id")
        .eq("property_id", property.id)
        .eq("tenant_id", user.id)
        .eq("landlord_id", property.landlord_id)
        .single();

      let conversationId = existingConversation?.id;

      if (!conversationId) {
        const { data: newConversation, error: conversationError } = await supabase
          .from("conversations")
          .insert({
            property_id: property.id,
            tenant_id: user.id,
            landlord_id: property.landlord_id,
          })
          .select("id")
          .single();

        if (conversationError) {
          throw conversationError;
        }
        conversationId = newConversation.id;
      }

      // Send message
      const { error: messageError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: messageFormData.message,
        });

      if (messageError) {
        throw messageError;
      }

      toast({
        title: "Message Sent",
        description: "Your message has been sent to the landlord",
      });

      setMessageFormData({ message: "" });
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: property?.title,
          text: `Check out this property: ${property?.title}`,
          url: window.location.href,
        });
      } catch (error) {
        console.log("Error sharing:", error);
      }
    } else {
      // Fallback to copying to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link Copied",
        description: "Property link copied to clipboard",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-ios-gray-light via-white to-ios-gray-light">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-96 bg-gray-200 rounded-2xl"></div>
            <div className="space-y-4">
              <div className="h-6 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-ios-gray-light via-white to-ios-gray-light flex items-center justify-center">
        <Card className="p-8 text-center">
          <CardContent>
            <h1 className="text-2xl font-bold mb-4">Property Not Found</h1>
            <p className="mb-4">The property you're looking for doesn't exist.</p>
            <Button onClick={() => navigate("/properties")}>
              Browse Properties
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isOwner = user?.id === property.landlord_id;
  const featuredAmenities = property.amenities?.slice(0, 6) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-ios-gray-light via-white to-ios-gray-light">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Heart className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Property Header */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                {property.featured && <Badge variant="secondary">Featured</Badge>}
                <Badge>{property.status}</Badge>
              </div>
              <h1 className="text-3xl font-bold mb-2">
                {property.title}
              </h1>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center text-muted-foreground">
                  <MapPin className="h-4 w-4 mr-1" />
                  {property.location}
                </div>
                <div className="text-2xl font-bold text-ocean-blue">
                  R{property.price.toLocaleString()}/month
                </div>
              </div>
            </div>

            {/* Image Gallery */}
            <div className="relative">
              <div className="aspect-video bg-gray-200 rounded-2xl overflow-hidden shadow-ios-lg">
                {property.images && property.images.length > 0 ? (
                  <img
                    src={property.images[currentImageIndex]}
                    alt={property.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <Home className="h-16 w-16 text-gray-400" />
                  </div>
                )}
              </div>
              
              {property.images && property.images.length > 1 && (
                <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                  {property.images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                        index === currentImageIndex 
                          ? 'border-ocean-blue shadow-md' 
                          : 'border-transparent'
                      }`}
                    >
                      <img
                        src={image}
                        alt={`${property.title} ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Property Info */}
            <Card className="shadow-ios-md">
              <CardContent className="p-6">
                {/* Property Features */}
                <div className="flex gap-6 mb-6 pb-6 border-b">
                  <div className="flex items-center gap-2">
                    <Bed className="h-5 w-5 text-ocean-blue" />
                    <span className="font-medium">{property.bedrooms}</span>
                    <span className="text-muted-foreground">beds</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bath className="h-5 w-5 text-ocean-blue" />
                    <span className="font-medium">{property.bathrooms}</span>
                    <span className="text-muted-foreground">baths</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Car className="h-5 w-5 text-ocean-blue" />
                    <span className="font-medium">{property.parking_spaces}</span>
                    <span className="text-muted-foreground">parking</span>
                  </div>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="amenities">Amenities</TabsTrigger>
                    <TabsTrigger value="location">Location</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="overview" className="mt-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold mb-2">Description</h3>
                        <p className="text-muted-foreground leading-relaxed">
                          {property.description || "No description available."}
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <div className="text-sm text-muted-foreground">Property Type</div>
                          <div className="font-medium">{property.property_type}</div>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <div className="text-sm text-muted-foreground">Size</div>
                          <div className="font-medium">{property.size_sqm ? `${property.size_sqm} sqm` : 'N/A'}</div>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <div className="text-sm text-muted-foreground">Furnished</div>
                          <div className="font-medium">{property.furnished ? 'Yes' : 'No'}</div>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <div className="text-sm text-muted-foreground">Pets Allowed</div>
                          <div className="font-medium">{property.pets_allowed ? 'Yes' : 'No'}</div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="amenities" className="mt-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {featuredAmenities.length > 0 ? (
                        featuredAmenities.map((amenity, index) => (
                          <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                            <CheckCircle className="h-4 w-4 text-success-green" />
                            <span className="text-sm">{amenity}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-muted-foreground col-span-full">No amenities listed.</p>
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="location" className="mt-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-ocean-blue" />
                        <span className="font-medium">{property.location}</span>
                      </div>
                      <div className="bg-gray-100 rounded-lg p-4 text-center">
                        <p className="text-muted-foreground">Interactive map coming soon</p>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Landlord Info */}
            <Card className="shadow-ios-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Property Owner</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-ocean-blue to-success-green rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold">
                      {property.profiles?.display_name || "Property Owner"}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-success-green" />
                      Verified Owner
                    </div>
                  </div>
                </div>

                {!isOwner && (
                  <div className="space-y-3">
                    <Button 
                      onClick={() => setShowBooking(true)} 
                      className="w-full bg-gradient-to-r from-ocean-blue to-ocean-blue-light hover:from-ocean-blue-dark hover:to-ocean-blue"
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Request Viewing
                    </Button>
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full">
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Message Owner
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Send Message</DialogTitle>
                          <DialogDescription>
                            Send a message to the property owner
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="message">Message</Label>
                            <Textarea
                              id="message"
                              placeholder="Hi, I'm interested in this property..."
                              value={messageFormData.message}
                              onChange={(e) => setMessageFormData({ ...messageFormData, message: e.target.value })}
                              rows={4}
                            />
                          </div>
                          <Button 
                            onClick={handleSendMessage} 
                            disabled={sendingMessage || !messageFormData.message.trim()}
                            className="w-full"
                          >
                            <Send className="h-4 w-4 mr-2" />
                            {sendingMessage ? "Sending..." : "Send Message"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Safety Badge */}
            <Card className="shadow-ios-md border-success-green/20 bg-success-green/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-success-green rounded-full flex items-center justify-center">
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-success-green-dark">Safe Renting</div>
                    <div className="text-sm text-muted-foreground">Verified property & owner</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Mobile Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200/50 p-4 lg:hidden z-30">
        <div className="flex gap-3">
          {!isOwner && (
            <>
              <Button 
                onClick={() => setShowBooking(true)} 
                className="flex-1 bg-gradient-to-r from-ocean-blue to-ocean-blue-light hover:from-ocean-blue-dark hover:to-ocean-blue"
              >
                <Calendar className="h-4 w-4 mr-2" />
                View
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex-1">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Message
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Send Message</DialogTitle>
                    <DialogDescription>
                      Send a message to the property owner
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="mobile-message">Message</Label>
                      <Textarea
                        id="mobile-message"
                        placeholder="Hi, I'm interested in this property..."
                        value={messageFormData.message}
                        onChange={(e) => setMessageFormData({ ...messageFormData, message: e.target.value })}
                        rows={4}
                      />
                    </div>
                    <Button 
                      onClick={handleSendMessage} 
                      disabled={sendingMessage || !messageFormData.message.trim()}
                      className="w-full"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {sendingMessage ? "Sending..." : "Send Message"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {/* Booking Dialog */}
      {showBooking && property && (
        <BookViewingDialog
          open={showBooking}
          onOpenChange={setShowBooking}
          property={property}
        />
      )}
    </div>
  );
}