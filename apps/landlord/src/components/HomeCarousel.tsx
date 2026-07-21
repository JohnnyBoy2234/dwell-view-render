import { useEffect, useRef, useState } from 'react';
import { GlossyIcon, GLOSSY_TONES } from '@mzanzihomes/ui/components/GlossyIcon';
import { ShieldCheck, Wallet, BadgeCheck, FileText, Receipt, Wrench, MessageCircle } from 'lucide-react';
import heroHouse from '@/assets/hero-house.jpg';

interface Slide {
  title: string;
  body: string;
  icon: React.ComponentType<{ size?: number | string; strokeWidth?: number; className?: string; color?: string }>;
  tone: keyof typeof GLOSSY_TONES;
  tint: string;
}

// Landlord-oriented feature slides — glossy icon left, text middle, home image
// bleeding in on the right.
const SLIDES: Slide[] = [
  { title: 'Why Use MzanziHomes?',       body: 'Run your entire rental portfolio in one trusted place — listings, applications, leases, payments and maintenance.', icon: ShieldCheck,   tone: 'violet',  tint: '#f1ecfe' },
  { title: 'Commission-Free Listings',   body: 'List your properties and connect directly with tenants, without paying agent commission fees.',                        icon: Wallet,        tone: 'lime',    tint: '#f3fbe6' },
  { title: 'Screen Tenants with Confidence', body: 'Review verified applicants with credit reports, references and complete application details before you decide.',       icon: BadgeCheck,    tone: 'spring',  tint: '#e9fbf3' },
  { title: 'Digital Leases & Signatures', body: 'Create and sign legally binding lease agreements online — no printing, no scanning, fully stored for you.',               icon: FileText,      tone: 'amber',   tint: '#fff6e6' },
  { title: 'Rent Collection & Invoicing', body: 'Track rent, send professional digital invoices and keep every payment on record automatically.',                          icon: Receipt,       tone: 'coral',   tint: '#fef0ee' },
  { title: 'Maintenance Made Simple',    body: 'Receive, track and resolve tenant maintenance requests all in one place, with a full history kept for you.',              icon: Wrench,        tone: 'gold',    tint: '#fff6e6' },
  { title: 'Secure In-App Messaging',    body: 'Communicate securely with your tenants inside MzanziHomes, keeping every conversation in one protected place.',           icon: MessageCircle, tone: 'fuchsia', tint: '#fdeefe' },
];

/** Landlord home carousel — glossy icon on the left, feature text in the middle,
 * home photo bleeding in on the right. Auto-rotates; swipe or tap dots. */
export default function HomeCarousel() {
  const [index, setIndex] = useState(0);
  const pausedRef = useRef(false);
  const startX = useRef<number | null>(null);
  const active = SLIDES[index];

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
      className="relative select-none overflow-hidden rounded-3xl shadow-[0_22px_46px_-26px_rgba(20,50,90,0.5)]"
      style={{ background: active.tint, transition: 'background 500ms ease' }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={() => { startX.current = null; pausedRef.current = false; }}
    >
      {/* Home photo bleeding in on the right, fading into the card */}
      <div className="pointer-events-none absolute right-0 top-0 h-full w-[42%] overflow-hidden">
        <img
          src={heroHouse}
          alt=""
          className="h-full w-full object-cover object-left"
          style={{
            WebkitMaskImage: 'linear-gradient(to left, black 40%, transparent 96%)',
            maskImage: 'linear-gradient(to left, black 40%, transparent 96%)',
          }}
        />
      </div>

      {/* Sliding track — glossy icon + text per slide */}
      <div
        className="relative flex"
        style={{ transform: `translateX(-${index * 100}%)`, transition: 'transform 600ms cubic-bezier(0.22, 1, 0.36, 1)' }}
      >
        {SLIDES.map((s) => (
          <div key={s.title} className="flex w-full shrink-0 items-start gap-3.5 px-4 pb-11 pt-5">
            <GlossyIcon tone={GLOSSY_TONES[s.tone]} icon={s.icon} size={50} />
            <div className="min-w-0 max-w-[62%]">
              <h3 className="text-[15.5px] font-extrabold leading-tight tracking-tight text-slate-900">{s.title}</h3>
              <p className="mt-1.5 text-[11.5px] leading-snug text-slate-600">{s.body}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination dots */}
      <div className="absolute inset-x-0 bottom-3.5 flex items-center justify-center gap-1.5">
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
