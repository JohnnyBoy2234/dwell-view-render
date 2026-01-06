import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Share2, Facebook, Twitter, Copy, Check, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SharePropertyMenuProps {
  propertyUrl: string;
  propertyTitle: string;
  propertyDescription: string;
  propertyImage?: string;
  propertyPrice: number;
  propertyLocation: string;
  propertyId?: string;
}

export function SharePropertyMenu({
  propertyUrl,
  propertyTitle,
  propertyDescription,
  propertyImage,
  propertyPrice,
  propertyLocation,
  propertyId,
}: SharePropertyMenuProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  // Use OG-friendly URL for social media sharing (crawlers will hit the edge function)
  const ogFriendlyUrl = propertyId 
    ? `https://rsfrvjaqxhoqavvscvwf.supabase.co/functions/v1/og-property/property/${propertyId}`
    : propertyUrl;

  const shareText = `🏠 R${propertyPrice.toLocaleString()}/month - ${propertyTitle} in ${propertyLocation}\n\n${propertyDescription?.slice(0, 100)}${propertyDescription?.length > 100 ? '...' : ''}`;
  const shortShareText = `R${propertyPrice.toLocaleString()}/month - ${propertyTitle} in ${propertyLocation}`;

  const shareToFacebook = () => {
    // Use OG-friendly URL so Facebook crawler gets proper meta tags
    const fbShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(ogFriendlyUrl)}&quote=${encodeURIComponent(shortShareText)}`;
    window.open(fbShareUrl, 'facebook-share', 'width=600,height=400,scrollbars=yes');
  };

  const shareToTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shortShareText)}&url=${encodeURIComponent(ogFriendlyUrl)}`;
    window.open(twitterUrl, 'twitter-share', 'width=600,height=400,scrollbars=yes');
  };

  const shareToWhatsApp = () => {
    const whatsAppUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n\n${propertyUrl}`)}`;
    window.open(whatsAppUrl, '_blank');
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(propertyUrl);
      setCopied(true);
      toast({
        title: "Link copied!",
        description: "Property link has been copied to your clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to copy",
        description: "Please copy the URL manually from the address bar.",
      });
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shortShareText,
          text: shareText,
          url: propertyUrl,
        });
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Error sharing:', error);
        }
      }
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-background border shadow-lg z-50">
        <DropdownMenuItem onClick={shareToFacebook} className="cursor-pointer">
          <Facebook className="h-4 w-4 mr-2 text-[#1877F2]" />
          Share on Facebook
        </DropdownMenuItem>
        <DropdownMenuItem onClick={shareToTwitter} className="cursor-pointer">
          <Twitter className="h-4 w-4 mr-2 text-[#1DA1F2]" />
          Share on X
        </DropdownMenuItem>
        <DropdownMenuItem onClick={shareToWhatsApp} className="cursor-pointer">
          <MessageCircle className="h-4 w-4 mr-2 text-[#25D366]" />
          Share on WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem onClick={copyToClipboard} className="cursor-pointer">
          {copied ? (
            <Check className="h-4 w-4 mr-2 text-green-500" />
          ) : (
            <Copy className="h-4 w-4 mr-2" />
          )}
          Copy Link
        </DropdownMenuItem>
        {navigator.share && (
          <DropdownMenuItem onClick={handleNativeShare} className="cursor-pointer">
            <Share2 className="h-4 w-4 mr-2" />
            More Options
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
