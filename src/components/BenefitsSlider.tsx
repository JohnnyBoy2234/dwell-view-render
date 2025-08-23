import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, EffectFade } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/effect-fade";

interface Benefit {
  icon: string;
  title: string;
  text: string;
}

const benefits: Benefit[] = [
  {
    icon: "💰",
    title: "No Agent Fees",
    text: "Save money with zero commission and full control of your rental.",
  },
  {
    icon: "🤝",
    title: "Direct Connections",
    text: "Chat directly with landlords or tenants and skip the middlemen.",
  },
  {
    icon: "⚡",
    title: "Simple & Fast Setup",
    text: "List a property or find a home in minutes with guided steps.",
  },
  {
    icon: "🔒",
    title: "Secure Online Payments",
    text: "Collect and pay rent reliably with safe, automated payments.",
  },
  {
    icon: "🛠️",
    title: "Smart Tools Included",
    text: "Enjoy built-in tenant screening, maintenance tracking, and reports.",
  },
];

export function BenefitsSlider() {
  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center mb-4">
          Why Choose SwiftRent?
        </h2>
        <p className="text-center text-lg text-gray-600 mb-12">
          The smarter, simpler way to rent — for landlords and tenants alike.
        </p>
        <Swiper
          modules={[Navigation, Pagination, EffectFade]}
          navigation
          pagination={{ clickable: true }}
          effect="fade"
          speed={600}
          loop
          className="benefits-swiper pb-12"
        >
          {benefits.map((benefit) => (
            <SwiperSlide key={benefit.title}>
              <div className="bg-white rounded-xl shadow-md p-8 flex flex-col md:flex-row items-center md:items-start gap-6">
                <div className="flex-shrink-0">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-600 to-green-600 flex items-center justify-center text-5xl md:text-6xl">
                    <span role="img" aria-label={benefit.title}>
                      {benefit.icon}
                    </span>
                  </div>
                </div>
                <div className="text-center md:text-left">
                  <h3 className="text-2xl font-bold mb-2 text-blue-600">
                    {benefit.title}
                  </h3>
                  <p className="text-gray-600">{benefit.text}</p>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
}

export default BenefitsSlider;
