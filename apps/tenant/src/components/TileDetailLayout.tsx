import type { ComponentType, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { UserMenu } from '@mzanzihomes/ui/components/dashboard/UserMenu';
import pattern from '@/assets/mzanzi-pattern.svg';

const NAVY = 'linear-gradient(180deg, #12315f 0%, #0a1f45 100%)';

interface TileDetailLayoutProps {
  title: string;
  subtitle?: string;
  icon: ComponentType<{ className?: string }>;
  /** Icon-badge colour (defaults to brand blue). */
  accent?: string;
  children: ReactNode;
}

/**
 * Shell for pages opened from a dashboard/home tile: navy header (back button,
 * blue icon badge, title/subtitle, avatar) curving into a light sheet with the
 * branded "Mzanzi" watermark texture in the open spaces.
 */
export default function TileDetailLayout({ title, subtitle, icon: Icon, accent = '#2563EB', children }: TileDetailLayoutProps) {
  const navigate = useNavigate();
  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/');
  };

  return (
    <div className="min-h-screen" style={{ minHeight: '100dvh', background: '#0a1f45' }}>
      {/* Navy header */}
      <div className="px-4 pb-12 pt-3.5" style={{ background: NAVY }}>
        <div className="flex items-center gap-3">
          <button
            onClick={goBack}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white active:scale-95"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: accent }}>
            <Icon className="h-[18px] w-[18px] text-white" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[17px] font-bold leading-tight text-white">{title}</h1>
            {subtitle && (
              <p className="truncate text-[12px] leading-snug" style={{ color: 'rgba(191,214,255,0.85)' }}>{subtitle}</p>
            )}
          </div>
          <UserMenu />
        </div>
      </div>

      {/* Light sheet with the Mzanzi watermark in its open spaces */}
      <div className="relative -mt-7 rounded-t-[28px]" style={{ background: '#f6f8fc', minHeight: 'calc(100dvh - 84px)' }}>
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-t-[28px]"
          style={{ backgroundImage: `url(${pattern})`, backgroundSize: '560px 560px', backgroundRepeat: 'repeat' }}
        />
        {/* soft radial fade keeps the texture understated toward the edges */}
        <div
          className="pointer-events-none absolute inset-0 rounded-t-[28px]"
          style={{ background: 'radial-gradient(130% 90% at 50% 25%, rgba(246,248,252,0) 45%, rgba(246,248,252,0.85) 100%)' }}
        />
        <div className="relative px-3 pt-5 sm:px-5" style={{ paddingBottom: 'calc(7rem + env(safe-area-inset-bottom))' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
