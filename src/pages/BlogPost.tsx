import { useParams, Navigate } from "react-router-dom";
import { BlogPostHero } from "@/components/blog/BlogPostHero";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

// Import content components
const CommissionPostContent = () => (
  <>
    <p className="text-lg text-muted-foreground mb-6">
      When it comes to renting a home, most landlords and tenants in South Africa have been conditioned to believe that paying commission to middlemen is "just the way it's done." But let's pause and ask a simple question: Why should anyone pay thousands of rands in commission for something they can manage directly and securely online?
    </p>
    <p className="mb-6">
      The truth is, paying commission is outdated, unfair, and unnecessary in today's digital world. Here's why.
    </p>
    <div className="border-l-4 border-primary pl-4 my-8">
      <div className="w-16 h-0.5 bg-muted-foreground mb-4"></div>
    </div>
    <div className="space-y-8">
      <section>
        <h3 className="text-xl font-semibold mb-4">1. Commission Punishes Success</h3>
        <p>
          Think about it: the more your property is worth, the higher the agent's cut. A landlord renting out a R15,000/month apartment pays a lot more than someone renting out at R7,000/month — even though the effort to list and show the property is essentially the same.
        </p>
        <p className="mt-4">
          Commission isn't linked to the actual work done; it's simply a penalty for having a valuable property. That doesn't sit right.
        </p>
      </section>
      <div className="border-l-4 border-primary pl-4 my-8">
        <div className="w-16 h-0.5 bg-muted-foreground"></div>
      </div>
      <section>
        <h3 className="text-xl font-semibold mb-4">2. Landlords Lose Hard-Earned Income</h3>
        <p>
          Every rand you hand over in commission is money you could be using to pay your bond, cover maintenance, or reinvest in your property portfolio. For many landlords, those "small" commission percentages add up to tens of thousands of rands lost every year.
        </p>
        <p className="mt-4">
          Why should you, the property owner, take on all the financial risk while someone else reaps the ongoing reward?
        </p>
      </section>
      <div className="border-l-4 border-primary pl-4 my-8">
        <div className="w-16 h-0.5 bg-muted-foreground"></div>
      </div>
      <section>
        <h3 className="text-xl font-semibold mb-4">3. Tenants End Up Paying More Too</h3>
        <p>
          Commission doesn't just hurt landlords — it filters down to tenants as well. Landlords often raise rental prices to cover agent fees, meaning tenants pay inflated rates. The very system that's supposed to "help" both parties ends up hurting both sides.
        </p>
        <p className="mt-4">
          A no-commission model means fairer rentals and more affordable housing.
        </p>
      </section>
      <div className="border-l-4 border-primary pl-4 my-8">
        <div className="w-16 h-0.5 bg-muted-foreground"></div>
      </div>
      <section>
        <h3 className="text-xl font-semibold mb-4">4. Technology Has Replaced the Middleman</h3>
        <p>
          Years ago, landlords may have needed agents to advertise properties, handle paperwork, and do credit checks. But today, platforms like SwiftRent provide all of this — instantly, securely, and without hidden costs.
        </p>
        <p className="mt-4">
          From ID verification and free credit checks to digital lease signing and automated maintenance requests, everything agents used to do can now be handled online at a fraction of the cost.
        </p>
      </section>
      <div className="border-l-4 border-primary pl-4 my-8">
        <div className="w-16 h-0.5 bg-muted-foreground"></div>
      </div>
      <section>
        <h3 className="text-xl font-semibold mb-4">5. Transparency Builds Trust</h3>
        <p>
          Commission creates a conflict of interest: agents are incentivized to push higher rentals, faster turnovers, and quick deals — not necessarily what's best for you.
        </p>
        <p className="mt-4">
          With a no-commission platform, there's no hidden agenda. Landlords and tenants connect directly, with full transparency, safety, and accountability.
        </p>
      </section>
      <div className="border-l-4 border-primary pl-4 my-8">
        <div className="w-16 h-0.5 bg-muted-foreground"></div>
      </div>
      <section className="bg-muted/50 p-6 rounded-lg">
        <h3 className="text-xl font-semibold mb-4">The Bottom Line</h3>
        <p>
          Paying commission on rentals belongs in the past. The future is direct, digital, and commission-free.
        </p>
        <p className="mt-4">
          Landlords deserve to keep their income. Tenants deserve fair rental prices. And both deserve a system that prioritizes safety, trust, and efficiency.
        </p>
        <p className="mt-4 font-medium">
          That's why SwiftRent exists — to make renting simple, secure, and commission-free.
        </p>
      </section>
    </div>
  </>
);

const SafetyPostContent = () => (
  <>
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
  </>
);

type BlogPostData = {
  id: string;
  title: string;
  publishedAt: string;
  shareText: string;
  category: string;
  readTime: number;
  excerpt: string;
  content: React.ReactNode;
  featured?: boolean;
};

const blogPosts: BlogPostData[] = [
  {
    id: 'safe-transparent-new-way',
    title: 'Safe, Simple, and Transparent - The New Way to Rent in South Africa',
    publishedAt: '2024-12-19',
    shareText: 'Discover how SwiftRent is making renting secure, simple, and transparent across South Africa.',
    category: 'Safety & Trust',
    readTime: 4,
    excerpt: 'Renting shouldn\'t feel risky or confusing. Discover how SwiftRent combines verified safety, data protection, and complete transparency to create a new standard for renting in South Africa.',
    content: <SafetyPostContent />,
    featured: true,
  },
  {
    id: 'why-commission-is-wrong',
    title: 'Why Paying Commission on Rentals Is Wrong',
    publishedAt: '2024-10-10',
    shareText: 'Why the traditional commission model in rentals is outdated and unfair — and how to do better.',
    category: 'Industry Insights',
    readTime: 5,
    excerpt: 'The commission model punishes success, hurts landlords and tenants alike, and belongs in the past. Learn why technology has made middlemen unnecessary.',
    content: <CommissionPostContent />,
  },
];

export default function BlogPost() {
  const { postId } = useParams<{ postId: string }>();
  const { toast } = useToast();

  const post = blogPosts.find(p => p.id === postId);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [postId]);

  const fallbackToClipboard = async (title: string) => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied to clipboard!",
        description: title,
      });
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast({
        variant: "destructive",
        title: "Share failed",
        description: "Unable to share or copy the link. Please copy the URL manually.",
      });
    }
  };

  const handleShare = async () => {
    if (!post) return;
    
    const shareData = { 
      title: post.title + ' - SwiftRent Blog', 
      text: post.shareText, 
      url: window.location.href 
    };
    
    if ((navigator as any).share) {
      try {
        await (navigator as any).share(shareData);
      } catch (error: any) {
        if (error?.name !== 'AbortError') {
          console.error('Error sharing:', error);
          await fallbackToClipboard(post.title);
        }
      }
    } else {
      await fallbackToClipboard(post.title);
    }
  };

  if (!post) {
    return <Navigate to="/blog" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <BlogPostHero
        title={post.title}
        publishedAt={post.publishedAt}
        readTime={post.readTime}
        category={post.category}
        onShare={handleShare}
      />

      <div className="container mx-auto px-4 py-12">
        <article className="max-w-3xl mx-auto">
          <div className="prose prose-lg prose-gray max-w-none
            prose-headings:font-bold prose-headings:text-foreground
            prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-4
            prose-p:text-muted-foreground prose-p:leading-relaxed
            prose-strong:text-foreground prose-strong:font-semibold
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline">
            {post.content}
          </div>
        </article>
      </div>
    </div>
  );
}
