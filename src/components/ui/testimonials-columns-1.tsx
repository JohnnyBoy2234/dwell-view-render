import React from "react";
import { motion } from "motion/react";

export type Testimonial = {
  text: string;
  image: string;
  name: string;
  role: string;
};

export const TestimonialsColumn = (props: {
  className?: string;
  testimonials: Testimonial[];
  duration?: number;
}) => {
  return (
    <div className={props.className}>
      <motion.div
        animate={{ translateY: "-50%" }}
        transition={{
          duration: props.duration || 10,
          repeat: Infinity,
          ease: "linear",
          repeatType: "loop",
        }}
        className="flex flex-col gap-6 pb-6"
      >
        {[...new Array(2).fill(0).map((_, index) => (
          <React.Fragment key={index}>
            {props.testimonials.map(({ text, image, name, role }, i) => (
              <div
                key={i}
                className="p-7 rounded-2xl border border-ocean-blue/10 shadow-[0_4px_24px_rgba(37,99,235,0.07)] max-w-xs w-full bg-white"
              >
                <p className="text-gray-600 text-sm leading-relaxed">{text}</p>
                <div className="flex items-center gap-3 mt-5">
                  <img
                    width={40}
                    height={40}
                    src={image}
                    alt={name}
                    className="h-10 w-10 rounded-full object-cover ring-2 ring-ocean-blue/10"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face";
                    }}
                  />
                  <div className="flex flex-col">
                    <div className="font-semibold text-gray-900 text-sm leading-5">{name}</div>
                    <div className="text-ocean-blue text-xs leading-5 opacity-80">{role}</div>
                  </div>
                </div>
              </div>
            ))}
          </React.Fragment>
        ))]}
      </motion.div>
    </div>
  );
};

// RentLekker-specific testimonials data
export const rentLekkerTestimonials: Testimonial[] = [
  {
    text: "Found my flat in Cape Town in just 3 days. Zero agent fees saved me over R9,000. RentLekker is exactly what South Africa needed.",
    image: "https://randomuser.me/api/portraits/women/11.jpg",
    name: "Thandi M.",
    role: "Tenant, Cape Town",
  },
  {
    text: "My property has stayed occupied with quality tenants. The screening process is thorough and the digital lease system is so much better than paper.",
    image: "https://randomuser.me/api/portraits/men/22.jpg",
    name: "Johan van der Berg",
    role: "Landlord, Johannesburg",
  },
  {
    text: "As a first-time renter I was nervous, but RentLekker made it simple. Verified listings, no hidden fees, and direct chat with my landlord.",
    image: "https://randomuser.me/api/portraits/women/33.jpg",
    name: "Amahle Dube",
    role: "Tenant, Durban",
  },
  {
    text: "I manage 6 properties and RentLekker's dashboard handles everything — rent tracking, maintenance, invoices. One app, zero chaos.",
    image: "https://randomuser.me/api/portraits/men/44.jpg",
    name: "Pieter Steyn",
    role: "Landlord, Pretoria",
  },
  {
    text: "The credit check feature gave me peace of mind before signing my lease. I knew my landlord was legitimate and the property was real.",
    image: "https://randomuser.me/api/portraits/women/55.jpg",
    name: "Nomvula K.",
    role: "Tenant, Sandton",
  },
  {
    text: "Switching to RentLekker saved me R24,000 per year in agent fees across my two rentals. The platform pays for itself instantly.",
    image: "https://randomuser.me/api/portraits/men/66.jpg",
    name: "Mark Jacobs",
    role: "Landlord, Cape Town",
  },
  {
    text: "The e-signature lease process was so smooth. Had everything signed legally in under an hour from my phone. No printing, no fax.",
    image: "https://randomuser.me/api/portraits/women/77.jpg",
    name: "Lerato Molefe",
    role: "Tenant, East Rand",
  },
  {
    text: "I love getting the automatic invoices each month. Rent tracking and proof of payment all in one place. Makes tax season a breeze.",
    image: "https://randomuser.me/api/portraits/men/88.jpg",
    name: "Riaan Botha",
    role: "Landlord, Stellenbosch",
  },
  {
    text: "After a bad experience with a dodgy agent, RentLekker's verified listings gave me the confidence to rent again. Completely transparent.",
    image: "https://randomuser.me/api/portraits/women/99.jpg",
    name: "Zanele Nkosi",
    role: "Tenant, Soweto",
  },
];
