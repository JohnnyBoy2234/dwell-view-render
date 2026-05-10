import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, EffectFade } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/effect-fade";
import { BenefitCard } from './landing/BenefitCard';
import { BENEFITS_DATA, BENEFITS_SECTION, SWIPER_CONFIG } from '@/constants/benefitsConstants';

/**
 * Benefits slider component showcasing MzanziHomes's key advantages
 * Uses Swiper for smooth carousel functionality
 */
export function BenefitsSlider() {
  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center mb-4">
          {BENEFITS_SECTION.TITLE}
        </h2>
        <p className="text-center text-lg text-gray-600 mb-12">
          {BENEFITS_SECTION.SUBTITLE}
        </p>
        <Swiper
          modules={[Navigation, Pagination, EffectFade]}
          slidesPerView={SWIPER_CONFIG.SLIDES_PER_VIEW}
          navigation
          pagination={{ clickable: true }}
          effect="fade"
          speed={SWIPER_CONFIG.SPEED}
          loop={SWIPER_CONFIG.LOOP}
          className={SWIPER_CONFIG.CLASS_NAME}
          aria-label="Benefits carousel"
        >
          {BENEFITS_DATA.map((benefit) => (
            <SwiperSlide key={benefit.title}>
              <BenefitCard benefit={benefit} />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
}

export default BenefitsSlider;
