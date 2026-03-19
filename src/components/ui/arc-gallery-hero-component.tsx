import React, { useEffect, useState } from 'react';

type ArcGalleryHeroProps = {
  images: string[];
  startAngle?: number;
  endAngle?: number;
  radiusLg?: number;
  radiusMd?: number;
  radiusSm?: number;
  cardSizeLg?: number;
  cardSizeMd?: number;
  cardSizeSm?: number;
  className?: string;
};

export const ArcGalleryHero: React.FC<ArcGalleryHeroProps> = ({
  images,
  startAngle = 20,
  endAngle = 160,
  radiusLg = 480,
  radiusMd = 360,
  radiusSm = 260,
  cardSizeLg = 120,
  cardSizeMd = 100,
  cardSizeSm = 80,
  className = '',
}) => {
  const [dimensions, setDimensions] = useState({
    radius: radiusLg,
    cardSize: cardSizeLg,
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setDimensions({ radius: radiusSm, cardSize: cardSizeSm });
      } else if (width < 1024) {
        setDimensions({ radius: radiusMd, cardSize: cardSizeMd });
      } else {
        setDimensions({ radius: radiusLg, cardSize: cardSizeLg });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [radiusLg, radiusMd, radiusSm, cardSizeLg, cardSizeMd, cardSizeSm]);

  const count = Math.max(images.length, 2);
  const step = (endAngle - startAngle) / (count - 1);

  return (
    <section className={`relative overflow-hidden bg-white text-gray-900 min-h-screen flex flex-col ${className}`}>
      {/* Subtle background texture */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(37,99,235,0.04) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
      }} />
      {/* Background ring container */}
      <div
        className="relative mx-auto"
        style={{
          width: '100%',
          height: dimensions.radius * 1.2,
        }}
      >
        <div className="absolute left-1/2 bottom-0 -translate-x-1/2">
          {images.map((src, i) => {
            const angle = startAngle + step * i;
            const angleRad = (angle * Math.PI) / 180;
            const x = Math.cos(angleRad) * dimensions.radius;
            const y = Math.sin(angleRad) * dimensions.radius;

            return (
              <div
                key={i}
                className="absolute opacity-0 animate-arc-fade-in"
                style={{
                  width: dimensions.cardSize,
                  height: dimensions.cardSize,
                  left: `calc(50% + ${x}px)`,
                  bottom: `${y}px`,
                  transform: `translate(-50%, 50%)`,
                  animationDelay: `${i * 80}ms`,
                  animationFillMode: 'forwards',
                  zIndex: count - i,
                }}
              >
                <div
                  className="rounded-2xl shadow-xl overflow-hidden ring-2 ring-white/80 bg-white transition-transform hover:scale-110 hover:z-50 w-full h-full"
                  style={{
                    transform: `rotate(${angle / 4}deg)`,
                    boxShadow: '0 8px 32px rgba(37,99,235,0.12), 0 2px 8px rgba(0,0,0,0.08)',
                  }}
                >
                  <img
                    src={src}
                    alt={`Property ${i + 1}`}
                    className="block w-full h-full object-cover"
                    draggable={false}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://placehold.co/400x400/1e40af/ffffff?text=Property`;
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hero content below arc */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-6 -mt-40 md:-mt-52 lg:-mt-64">
        <div
          className="text-center max-w-3xl px-6 opacity-0 animate-arc-content-in"
          style={{ animationDelay: '900ms', animationFillMode: 'forwards' }}
        >
          <div className="inline-flex items-center gap-2 bg-ocean-blue/8 border border-ocean-blue/20 rounded-full px-4 py-1.5 mb-6">
            <span className="w-2 h-2 rounded-full bg-success-green animate-pulse" />
            <span className="text-sm font-medium text-ocean-blue tracking-wide">Commission-Free Rentals</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight text-gray-900 leading-[1.05]">
            Find Your Perfect{' '}
            <span className="relative inline-block">
              <span className="relative z-10 text-ocean-blue">Home</span>
              <span
                className="absolute bottom-1 left-0 right-0 h-3 -z-10 rounded-sm opacity-20"
                style={{ background: 'hsl(214 100% 59%)' }}
              />
            </span>{' '}
            in South Africa
          </h1>
          <p className="mt-5 text-lg sm:text-xl text-gray-500 max-w-xl mx-auto leading-relaxed">
            Verified listings. Direct landlords. Zero agent fees. RentLekker makes renting simple, safe, and transparent.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="/properties"
              className="w-full sm:w-auto px-7 py-3.5 rounded-full font-semibold text-white text-sm tracking-wide shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
              style={{
                background: 'hsl(214 100% 59%)',
                boxShadow: '0 4px 20px rgba(37,99,235,0.35)',
              }}
            >
              Browse Properties
            </a>
            <a
              href="/list-property"
              className="w-full sm:w-auto px-7 py-3.5 rounded-full font-semibold text-gray-700 text-sm tracking-wide border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
            >
              List Your Property
            </a>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes arc-fade-in {
          from { opacity: 0; transform: translate(-50%, 65%); }
          to   { opacity: 1; transform: translate(-50%, 50%); }
        }
        @keyframes arc-content-in {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-arc-fade-in {
          animation-name: arc-fade-in;
          animation-duration: 0.7s;
          animation-timing-function: cubic-bezier(0.22, 0.61, 0.36, 1);
        }
        .animate-arc-content-in {
          animation-name: arc-content-in;
          animation-duration: 0.8s;
          animation-timing-function: cubic-bezier(0.22, 0.61, 0.36, 1);
        }
      `}</style>
    </section>
  );
};
