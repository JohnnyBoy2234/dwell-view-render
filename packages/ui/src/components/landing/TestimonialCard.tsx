import { Card, CardContent } from "@/components/ui/card";
import { Star, Quote } from "lucide-react";
import { TESTIMONIALS_STYLES } from '@mzanzihomes/common/constants/testimonialsConstants';
import type { Testimonial } from '@mzanzihomes/common/constants/testimonialsConstants';

interface TestimonialCardProps {
  testimonial: Testimonial;
}

/**
 * Individual testimonial card component
 * Displays a single testimonial with rating, content, and user info
 */
export function TestimonialCard({ testimonial }: TestimonialCardProps) {
  return (
    <div className={TESTIMONIALS_STYLES.SLIDE}>
      <Card className={TESTIMONIALS_STYLES.CARD}>
        <CardContent className={TESTIMONIALS_STYLES.CARD_CONTENT}>
          <Quote className={TESTIMONIALS_STYLES.QUOTE_ICON} />
          <p className={TESTIMONIALS_STYLES.TESTIMONIAL_TEXT}>
            "{testimonial.content}"
          </p>
          <div className={TESTIMONIALS_STYLES.STARS_CONTAINER}>
            {Array.from({ length: testimonial.rating }).map((_, i) => (
              <Star 
                key={i} 
                className={TESTIMONIALS_STYLES.STAR}
                aria-label={`${i + 1} of ${testimonial.rating} stars`}
              />
            ))}
          </div>
          <div>
            <p className={TESTIMONIALS_STYLES.USER_NAME}>
              {testimonial.name}
            </p>
            <p className={TESTIMONIALS_STYLES.USER_INFO}>
              {testimonial.role} • {testimonial.location}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}