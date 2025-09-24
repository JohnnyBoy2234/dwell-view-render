import { Card, CardContent } from "@/components/ui/card";
import { Star, Quote } from "lucide-react";
import { useState, useEffect } from "react";

const testimonials = [
  {
    name: "Sarah Johnson",
    role: "Tenant",
    location: "Cape Town",
    rating: 5,
    content: "SwiftRent made finding my perfect apartment so easy. The verification process gave me confidence, and I saved thousands in agent fees!"
  },
  {
    name: "Michael van der Merwe", 
    role: "Landlord",
    location: "Johannesburg",
    rating: 5,
    content: "As a landlord, I love how SwiftRent handles everything - from tenant screening to lease agreements. It's professional and secure."
  },
  {
    name: "Priya Patel",
    role: "Tenant", 
    location: "Durban",
    rating: 5,
    content: "The maintenance manager feature is fantastic! I can report issues directly and track progress. Makes renting stress-free."
  },
  {
    name: "David Thompson",
    role: "Landlord",
    location: "Pretoria", 
    rating: 5,
    content: "Finally, a rental platform that puts safety first. All tenants are verified and the digital contracts are legally sound."
  }
];

export function TestimonialsCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  return (
    <section className="py-16 md:py-24 bg-gradient-to-br from-ocean-blue/5 to-success-green/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header removed per request */}

        <div className="relative max-w-4xl mx-auto">
          <div className="overflow-hidden">
            <div 
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {testimonials.map((testimonial, index) => (
                <div key={index} className="w-full flex-shrink-0">
                  <Card className="mx-4 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                    <CardContent className="p-8 text-center">
                      <Quote className="h-8 w-8 text-ocean-blue mx-auto mb-4" />
                      <p className="text-lg text-foreground mb-6 italic">
                        "{testimonial.content}"
                      </p>
                      <div className="flex justify-center mb-4">
                        {Array.from({ length: testimonial.rating }).map((_, i) => (
                          <Star key={i} className="h-5 w-5 text-earth-warm fill-current" />
                        ))}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">
                          {testimonial.name}
                        </p>
                        <p className="text-muted-foreground">
                          {testimonial.role} • {testimonial.location}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>

          {/* Dots indicator */}
          <div className="flex justify-center mt-8 gap-2">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-3 h-3 rounded-full transition-colors duration-300 ${
                  index === currentIndex 
                    ? 'bg-ocean-blue' 
                    : 'bg-muted border border-border'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}