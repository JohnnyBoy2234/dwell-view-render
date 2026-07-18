import { useEffect, useRef, useState } from 'react';
import heroHouse from '@/assets/hero-house.jpg';

interface Slide {
  title: string;
  body: string;
}

const SLIDES: Slide[] = [
  { title: 'Commission-Free Renting', body: 'Connect directly with landlords through MzanziHomes. Enjoy a simpler rental experience without paying agent commission fees.' },
  { title: 'Smart Rental Platform', body: 'Everything you need to rent with confidence, including digital lease agreements, electronic signatures and powerful rental management tools.' },
  { title: 'Rent with Confidence', body: 'Simple digital tools, secure records and friendly support help you stay organised and protected throughout your rental journey.' },
  { title: 'Built-in Invoicing', body: 'Receive professional digital rent invoices directly through the platform, making it easier to keep track of your rental payments.' },
  { title: 'Verified & Secure', body: 'Landlords and tenants are verified, with legally binding digital lease agreements helping create a safer and more trusted rental experience.' },
  { title: 'Secure In-App Messaging', body: 'Communicate securely with your landlord directly inside MzanziHomes, keeping all important rental conversations in one protected place.' },
];

/** Premium homepage carousel: one fixed home image, sliding text, dots. */
export default function HomeCarousel() {
  const [index, setIndex] = useState(0);
  const pausedRef = useRef(false);
  const startX = useRef<number | null>(null);

  // Auto-advance every 5s unless the user is interacting.
  useEffect(() => {
    const id = setInterval(() => {
      if (!pausedRef.current) setIndex((i) => (i + 1) % SLIDES.length);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  const go = (i: number) => setIndex((i + SLIDES.length) % SLIDES.length);

  const onPointerDown = (e: React.PointerEvent) => {
    pausedRef.current = true;
    startX.current = e.clientX;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (startX.current !== null) {
      const dx = e.clientX - startX.current;
      if (dx > 45) go(index - 1);
      else if (dx < -45) go(index + 1);
    }
    startX.current = null;
    pausedRef.current = false;
  };

  return (
    <div
      className="relative h-[188px] select-none overflow-hidden rounded-3xl shadow-[0_22px_46px_-24px_rgba(20,50,90,0.55)]"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={() => { startX.current = null; pausedRef.current = false; }}
    >
      {/* Fixed home image + scrim */}
      <img src={heroHouse} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(10,31,69,0.10) 0%, rgba(10,31,69,0.30) 42%, rgba(8,22,53,0.82) 100%)' }} />

      {/* Sliding text track */}
      <div
        className="absolute inset-x-0 bottom-0 flex"
        style={{ transform: `translateX(-${index * 100}%)`, transition: 'transform 620ms cubic-bezier(0.22, 1, 0.36, 1)' }}
      >
        {SLIDES.map((s) => (
          <div key={s.title} className="w-full shrink-0 px-5 pb-9 pt-4">
            <h3 className="text-[19px] font-extrabold leading-tight text-white">{s.title}</h3>
            <p className="mt-1.5 text-[12.5px] leading-snug text-white/85">{s.body}</p>
          </div>
        ))}
      </div>

      {/* Pagination dots */}
      <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-1.5">
        {SLIDES.map((s, i) => (
          <button
            key={s.title}
            onClick={() => go(i)}
            aria-label={`Go to slide ${i + 1}`}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{ width: i === index ? 18 : 6, background: i === index ? '#ffffff' : 'rgba(255,255,255,0.5)' }}
          />
        ))}
      </div>
    </div>
  );
}
