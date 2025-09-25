import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, EffectFade } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { SectionHeader } from "@/components/ui/SectionHeader";

interface Benefit {
  icon: string;
  title: string;
  text: string;
  highlight?: boolean;
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
    icon: "💙",
    title: "Zero Commission",
    text: "Keep 100% of your rental income with no hidden fees or agent costs.",
    highlight: true,
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
  {
    icon: "📱",
    title: "Mobile First",
    text: "Manage your properties and applications from anywhere, anytime.",
  },
  {
    icon: "💙",
    title: "Zero Commission",
    text: "Keep 100% of your rental income with no hidden fees or agent costs.",
    highlight: true,
  },
];

export function BenefitsSlider() {
  return (
    <section className="py-16 bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="Why Choose SwiftRent?"
          subtitle="The smarter, simpler way to rent — for landlords and tenants alike."
          showTagline={true}
          taglineVariant="eyebrow"
        />
        <Swiper
          modules={[Navigation, Pagination, EffectFade]}
          slidesPerView={3}
          navigation
          pagination={{ clickable: true }}
          effect="fade"
          speed={600}
          loop
          className="benefits-swiper pb-12"
        >
          {benefits.map((benefit, index) => (
            <SwiperSlide key={`${benefit.title}-${index}`}>
              <div className={`bg-white rounded-xl shadow-md p-8 flex flex-col md:flex-row items-center md:items-start gap-6 ${
                benefit.highlight ? 'ring-2 ring-ocean-blue shadow-lg' : ''
              }`}>
                <div className="flex-shrink-0">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-ocean-blue to-success-green flex items-center justify-center text-5xl md:text-6xl">
                    <span role="img" aria-label={benefit.title}>
                      {benefit.icon}
                    </span>
                  </div>
                </div>
                <div className="text-center md:text-left">
                  <h3 className={`text-2xl font-bold mb-2 ${
                    benefit.highlight ? 'text-ocean-blue font-extrabold' : 'text-ocean-blue'
                  }`}>
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
