import { Button } from "@mzanzihomes/ui/components/button";
import { ArrowLeft, Share2, Calendar, Clock } from "lucide-react";
import { formatPublishedDate } from "@mzanzihomes/common/lib/date";
import { useNavigate } from "react-router-dom";

interface BlogPostHeroProps {
  title: string;
  publishedAt: string;
  readTime: number;
  category: string;
  onShare: () => void;
}

export function BlogPostHero({
  title,
  publishedAt,
  readTime,
  category,
  onShare,
}: BlogPostHeroProps) {
  const navigate = useNavigate();

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-accent py-16 md:py-24">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }} />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/blog')}
          className="mb-8 text-white/90 hover:text-white hover:bg-white/10"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Blog
        </Button>

        {/* Category */}
        <div className="inline-block px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-white text-sm font-medium mb-6">
          {category}
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 max-w-4xl animate-fade-in">
          {title}
        </h1>

        {/* Meta Info */}
        <div className="flex flex-wrap items-center gap-6 text-white/90 mb-8">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            <span>{formatPublishedDate(publishedAt)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            <span>{readTime} min read</span>
          </div>
        </div>

        {/* Share Button */}
        <Button
          onClick={onShare}
          className="bg-white text-primary hover:bg-white/90"
        >
          <Share2 className="h-4 w-4 mr-2" />
          Share Article
        </Button>
      </div>
    </div>
  );
}
