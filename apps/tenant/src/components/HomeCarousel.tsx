import { useEffect, useRef, useState } from 'react';
import heroHouse from '@/assets/hero-house.jpg';

interface Slide {
  title: string;
  body: string;
}

// "Why Use MzanziHomes?" leads, then the feature stories.
const SLIDES: Slide[] = [
  { title: 'Why Use MzanziHomes?', body: 'MzanziHomes was created to give tenants a safer, simpler and more secure rental experience. Every important conversation, document, inspection and record is kept together in one trusted place, helping protect your rights from move-in to move-out.' },
  { title: 'Commission-Free Renting', body: 'Connect directly with landlords through MzanziHomes. Enjoy a simpler rental experience without paying agent commission fees.' },
  { title: 'Smart Rental Platform', body: 'Everything you need to rent with confidence, including digital lease agreements, electronic signatures and powerful rental management tools.' },
  { title: 'Rent with Confidence', body: 'Simple digital tools, secure records and friendly support help you stay organised and protected throughout your rental journey.' },
  { title: 'Built-in Invoicing', body: 'Receive professional digital rent invoices directly through the platform, making it easier to keep track of your rental payments.' },
  { title: 'Verified & Secure', body: 'Landlords and tenants are verified, with legally binding digital lease agreements helping create a safer and more trusted rental experience.' },
  { title: 'Secure In-App Messaging', body: 'Communicate securely with your landlord directly inside MzanziHomes, keeping all important rental conversations in one protected place.' },
];

/**
 * Homepage carousel — same premium language as the hero: white card, text on
 * the left, home image bleeding in from the right and fading to white.
 * Auto-rotates; swipe or tap dots to navigate.
 */
export default function HomeCarousel() {
  const [index, setIndex] = useState(0);
  const pausedRef = useRef(false);
  const startX = useRef<number | null>(null);

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
      className="relative select-none overflow-hidden rounded-3xl bg-white shadow-[0_22px_46px_-26px_rgba(20,50,90,0.5)]"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={() => { startX.current = null; pausedRef.current = false; }}
    >
      {/* Home image bleeding in from the right, fading to white */}
      <div className="pointer-events-none absolute -right-2 top-0 h-full w-[52%] overflow-hidden">
        <img
          src={heroHouse}
          alt=""
          className="h-full w-full object-cover object-center"
          style={{
            WebkitMaskImage: 'linear-gradient(to left, black 46%, transparent 96%)',
            maskImage: 'linear-gradient(to left, black 46%, transparent 96%)',
          }}
        />
      </div>

      {/* Sliding text track */}
      <div
        className="relative flex"
        style={{ transform: `translateX(-${index * 100}%)`, transition: 'transform 620ms cubic-bezier(0.22, 1, 0.36, 1)' }}
      >
        {SLIDES.map((s) => (
          <div key={s.title} className="w-full shrink-0 px-5 pb-11 pt-6">
            <div className="max-w-[58%]">
              <h3 className="text-[18px] font-extrabold leading-tight tracking-tight text-slate-900">{s.title}</h3>
              <p className="mt-2 text-[12px] leading-snug text-slate-500">{s.body}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination dots */}
      <div className="absolute inset-x-0 bottom-3.5 flex items-center justify-start gap-1.5 px-5">
        {SLIDES.map((s, i) => (
          <button
            key={s.title}
            onClick={() => go(i)}
            aria-label={`Go to slide ${i + 1}`}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{ width: i === index ? 18 : 6, background: i === index ? '#2563EB' : '#cbd5e1' }}
          />
        ))}
      </div>
    </div>
  );
}
