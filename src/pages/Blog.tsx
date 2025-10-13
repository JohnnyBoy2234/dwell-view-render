import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatPublishedDate } from "@/utils/date";

export default function Blog() {
  const { toast } = useToast();

  const handleShare = async () => {
    const shareData = {
      title: "Safe, Simple, and Transparent - The New Way to Rent in South Africa - SwiftRent Blog",
      text: "Discover how SwiftRent is revolutionizing rental safety and transparency in South Africa with verified users, POPIA compliance, and commission-free renting.",
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
        description: "The blog post link has been copied to your clipboard."
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
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <SectionHeader
          title="SwiftRent Blog"
          subtitle="Insights, tips, and perspectives on the rental market"
          showTagline={true}
        />
        
        <div className="space-y-8">
          <Card className="border shadow-sm">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <CardTitle className="text-2xl md:text-3xl font-bold">
                    Safe, Simple, and Transparent - The New Way to Rent in South Africa
                  </CardTitle>
                  <p className="text-muted-foreground text-sm mt-2">
                    Published on {formatPublishedDate("2024-12-19")}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleShare} className="shrink-0">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="prose prose-gray max-w-none">
              <p className="text-lg text-muted-foreground mb-6">
                Renting shouldn't feel risky or confusing. Yet for too long, South Africans have had to navigate a system full of hidden fees, empty promises, and unnecessary middlemen. SwiftRent was built to change that — to make renting secure, straightforward, and fair for everyone.
              </p>
              
              <div className="border-l-4 border-primary pl-4 my-8">
                <div className="w-16 h-0.5 bg-muted-foreground mb-4"></div>
              </div>

              <div className="space-y-8">
                <section>
                  <h3 className="text-xl font-semibold mb-4">Verified Safety from Day One</h3>
                  <p>
                    Every landlord and tenant who joins the platform is verified through ID and email. It's a quick but powerful safeguard that keeps things real — real names, real people, real accountability. Behind the scenes, our Safe Renting System quietly filters out scams, fake listings, and suspicious activity long before it reaches you.
                  </p>
                </section>

                <div className="border-l-4 border-primary pl-4 my-8">
                  <div className="w-16 h-0.5 bg-muted-foreground"></div>
                </div>

                <section>
                  <h3 className="text-xl font-semibold mb-4">Your Data, Protected</h3>
                  <p>
                    Your data is protected under full POPIA compliance, meaning your personal details stay private and are used only for what they should be: safe, transparent renting. All uploads, payments, and messages are encrypted and traceable, giving you peace of mind that what happens on SwiftRent stays secure.
                  </p>
                </section>

                <div className="border-l-4 border-primary pl-4 my-8">
                  <div className="w-16 h-0.5 bg-muted-foreground"></div>
                </div>

                <section>
                  <h3 className="text-xl font-semibold mb-4">Complete Transparency</h3>
                  <p>
                    We also believe trust grows through honesty. That's why we've removed every hidden fee that used to chip away at your income — no placement costs, no renewal charges, no admin or inspection "surprises." The price you see is the price you pay. Landlords and tenants communicate directly, without agents adding noise or markup in between.
                  </p>
                </section>

                <div className="border-l-4 border-primary pl-4 my-8">
                  <div className="w-16 h-0.5 bg-muted-foreground"></div>
                </div>

                <section>
                  <h3 className="text-xl font-semibold mb-4">Community Protection</h3>
                  <p>
                    But technology isn't the only line of defence. South Africans have always protected their neighbourhoods, and SwiftRent carries that same spirit online. Our members help keep the platform clean by reporting anything that doesn't feel right. The result is a self-policing community built on respect and accountability.
                  </p>
                </section>

                <div className="border-l-4 border-primary pl-4 my-8">
                  <div className="w-16 h-0.5 bg-muted-foreground"></div>
                </div>

                <section className="bg-muted/50 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold mb-4">The New Standard</h3>
                  <p>
                    Safety isn't a luxury here. It's a must. Transparency isn't optional. It's the baseline. SwiftRent combines both — creating a trusted space where people can rent, list, and live without fear or friction.
                  </p>
                  <p className="mt-4 font-medium">
                    SwiftRent — Safe, Simple, Commission-Free Renting.
                  </p>
                </section>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}