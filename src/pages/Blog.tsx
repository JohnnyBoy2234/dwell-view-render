import { SectionHeader } from "@/components/ui/SectionHeader";
import { BlogPostCard } from "@/components/blog/BlogPostCard";

type BlogPost = {
  id: string;
  title: string;
  publishedAt: string;
  category: string;
  readTime: number;
  excerpt: string;
  featured?: boolean;
};

export default function Blog() {
  const posts: BlogPost[] = [
    {
      id: 'safe-transparent-new-way',
      title: 'Safe, Simple, and Transparent - The New Way to Rent in South Africa',
      publishedAt: '2024-12-19',
      category: 'Safety & Trust',
      readTime: 4,
      excerpt: 'Renting shouldn\'t feel risky or confusing. Discover how SwiftRent combines verified safety, data protection, and complete transparency to create a new standard for renting in South Africa.',
      featured: true,
    },
    {
      id: 'why-commission-is-wrong',
      title: 'Why Paying Commission on Rentals Is Wrong',
      publishedAt: '2024-10-10',
      category: 'Industry Insights',
      readTime: 5,
      excerpt: 'The commission model punishes success, hurts landlords and tenants alike, and belongs in the past. Learn why technology has made middlemen unnecessary.',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary/10 via-background to-accent/10 py-16 md:py-20">
        <div className="container mx-auto px-4">
          <SectionHeader
            title="SwiftRent Blog"
            subtitle="Insights, tips, and perspectives on the rental market"
            showTagline={true}
          />
        </div>
      </div>

      {/* Blog Posts Grid */}
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
          {posts.map((post) => (
            <BlogPostCard
              key={post.id}
              id={post.id}
              title={post.title}
              excerpt={post.excerpt}
              publishedAt={post.publishedAt}
              readTime={post.readTime}
              category={post.category}
              featured={post.featured}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
