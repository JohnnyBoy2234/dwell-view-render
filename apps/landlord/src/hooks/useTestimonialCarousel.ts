import { useState, useEffect } from 'react';
import { TESTIMONIALS_CONFIG } from '@mzanzihomes/common/constants/testimonialsConstants';

interface UseTestimonialCarouselProps {
  totalSlides: number;
}

/**
 * Custom hook for managing testimonial carousel state and auto-rotation
 */
export function useTestimonialCarousel({ totalSlides }: UseTestimonialCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (totalSlides <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % totalSlides);
    }, TESTIMONIALS_CONFIG.AUTO_SLIDE_INTERVAL);

    return () => clearInterval(timer);
  }, [totalSlides]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const getTransformStyle = () => ({
    transform: `translateX(-${currentIndex * 100}%)`,
  });

  return {
    currentIndex,
    goToSlide,
    getTransformStyle,
  };
}