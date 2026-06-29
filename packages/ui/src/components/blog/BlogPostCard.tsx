import { Link } from "react-router-dom";
import GlassCard from "@mzanzihomes/ui/components/GlassCard";
import { Calendar, Clock, ArrowRight } from "lucide-react";
import { formatPublishedDate } from "@mzanzihomes/common/lib/date";
import { Badge } from "@mzanzihomes/ui/components/badge";

interface BlogPostCardProps {
  id: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  readTime: number;
  category: string;
  featured?: boolean;
}

export function BlogPostCard({
  id,
  title,
  excerpt,
  publishedAt,
  readTime,
  category,
  featured,
}: BlogPostCardProps) {
  return (
    <Link to={`/blog/${id}`} className="block h-full">
      <GlassCard className="h-full flex flex-col transition-all duration-300 hover:scale-[1.02]">
        <div className="p-6 flex flex-col h-full">
          {/* Category Badge */}
          <div className="flex items-center gap-2 mb-4">
            <Badge 
              variant="secondary" 
              className="bg-primary/10 text-primary hover:bg-primary/20"
            >
              {category}
            </Badge>
            {featured && (
              <Badge 
                variant="secondary" 
                className="bg-accent/10 text-accent hover:bg-accent/20"
              >
                Featured
              </Badge>
            )}
          </div>

          {/* Title */}
          <h2 className="text-2xl md:text-3xl font-bold mb-3 line-clamp-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {title}
          </h2>

          {/* Meta Info */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>{formatPublishedDate(publishedAt)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span>{readTime} min read</span>
            </div>
          </div>

          {/* Excerpt */}
          <p className="text-muted-foreground mb-6 line-clamp-3 flex-grow">
            {excerpt}
          </p>

          {/* Read More Link */}
          <div className="flex items-center gap-2 text-primary font-medium group">
            <span>Read Full Article</span>
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </div>
        </div>
      </GlassCard>
    </Link>
  );
}
