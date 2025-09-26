import { TestimonialCard } from './landing/TestimonialCard';
import { useTestimonialCarousel } from '@/hooks/useTestimonialCarousel';
import { 
  TESTIMONIALS_DATA, 
  TESTIMONIALS_STYLES,
  TESTIMONIALS_CONFIG 
} from '@/constants/testimonialsConstants';

/**
 * Testimonials carousel component displaying customer reviews
 * Auto-rotates through testimonials with manual navigation
 */
export function TestimonialsCarousel() {
  const { currentIndex, goToSlide, getTransformStyle } = useTestimonialCarousel({
    totalSlides: TESTIMONIALS_DATA.length,
  });

  return (
    <section className={TESTIMONIALS_STYLES.SECTION}>
      <div className={TESTIMONIALS_STYLES.CONTAINER}>
        <div className={TESTIMONIALS_STYLES.CAROUSEL_CONTAINER}>
          <div className={TESTIMONIALS_STYLES.SLIDE_CONTAINER}>
            <div 
              className={TESTIMONIALS_STYLES.SLIDES_WRAPPER}
              style={getTransformStyle()}
            >
              {TESTIMONIALS_DATA.map((testimonial, index) => (
                <TestimonialCard 
                  key={`${testimonial.name}-${index}`} 
                  testimonial={testimonial} 
                />
              ))}
            </div>
          </div>

          {/* Dots indicator */}
          <div className={TESTIMONIALS_STYLES.DOTS_CONTAINER}>
            {TESTIMONIALS_DATA.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`${TESTIMONIALS_STYLES.DOT_BASE} ${
                  index === currentIndex 
                    ? TESTIMONIALS_STYLES.DOT_ACTIVE
                    : TESTIMONIALS_STYLES.DOT_INACTIVE
                }`}
                aria-label={`Go to testimonial ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}