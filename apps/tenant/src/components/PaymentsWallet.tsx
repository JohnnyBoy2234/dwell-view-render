/**
 * Premium 3D-style payments illustration: a glossy teal wallet with cards and a
 * slip fanning out of the top, a snap-button on the side, over faint aqua trees
 * and sparkles. Pure SVG so it scales crisply and tints to the Payments module's
 * teal/aqua identity. Shared by the hero (large) and the empty state (smaller).
 */
export default function PaymentsWallet({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 220 196"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="pwGlow" cx="52%" cy="48%" r="58%">
          <stop offset="0" stopColor="#bff3ea" stopOpacity="0.9" />
          <stop offset="1" stopColor="#bff3ea" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="pwBack" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#12a596" />
          <stop offset="1" stopColor="#0a7c70" />
        </linearGradient>
        <linearGradient id="pwFront" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#31d4bf" />
          <stop offset="1" stopColor="#0d9c8c" />
        </linearGradient>
        <linearGradient id="pwCard1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a9f2e6" />
          <stop offset="1" stopColor="#5fe6d1" />
        </linearGradient>
        <linearGradient id="pwCard2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e6fffa" />
          <stop offset="1" stopColor="#a9f2e6" />
        </linearGradient>
        <linearGradient id="pwSnap" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2dd4bf" />
          <stop offset="1" stopColor="#0d9c8c" />
        </linearGradient>
        <filter id="pwSoft" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="6" stdDeviation="7" floodColor="#0a6d63" floodOpacity="0.18" />
        </filter>
      </defs>

      {/* soft aqua glow */}
      <ellipse cx="112" cy="104" rx="112" ry="96" fill="url(#pwGlow)" />

      {/* faint trees + sparkles */}
      <g fill="#c4efe7">
        <g opacity="0.6">
          <rect x="34" y="122" width="5" height="26" rx="2.5" />
          <path d="M36 96 l16 30 h-32 z" />
        </g>
        <g opacity="0.5">
          <rect x="188" y="120" width="5" height="24" rx="2.5" />
          <path d="M190 98 l14 26 h-28 z" />
        </g>
      </g>
      <g fill="#7fe3d3">
        <rect x="182" y="52" width="9" height="9" rx="2" transform="rotate(45 186 56)" opacity="0.7" />
        <rect x="52" y="60" width="7" height="7" rx="2" transform="rotate(45 55 63)" opacity="0.65" />
        <rect x="168" y="38" width="6" height="6" rx="1.5" transform="rotate(45 171 41)" opacity="0.6" />
      </g>

      {/* cards + slip fanning out of the wallet */}
      <g filter="url(#pwSoft)">
        <g transform="rotate(-9 120 78)">
          <rect x="70" y="40" width="104" height="66" rx="11" fill="url(#pwCard1)" />
          <rect x="80" y="54" width="20" height="15" rx="3" fill="#2dd4bf" opacity="0.55" />
          <rect x="80" y="80" width="70" height="5" rx="2.5" fill="#ffffff" opacity="0.6" />
          <rect x="80" y="90" width="44" height="5" rx="2.5" fill="#ffffff" opacity="0.45" />
        </g>
        <g transform="rotate(6 130 70)">
          <rect x="92" y="30" width="104" height="66" rx="11" fill="url(#pwCard2)" />
          <rect x="102" y="44" width="20" height="15" rx="3" fill="#5fe6d1" opacity="0.7" />
          <rect x="102" y="70" width="66" height="5" rx="2.5" fill="#2dd4bf" opacity="0.4" />
        </g>
      </g>

      {/* wallet back panel */}
      <rect x="52" y="86" width="134" height="94" rx="22" fill="url(#pwBack)" />

      {/* wallet front panel */}
      <rect x="52" y="112" width="134" height="68" rx="22" fill="url(#pwFront)" />
      <path d="M52 120 q67 -18 134 0" stroke="#0a7c70" strokeWidth="1.6" fill="none" opacity="0.4" />
      <ellipse cx="86" cy="128" rx="34" ry="9" fill="#ffffff" opacity="0.16" />

      {/* snap-button tab on the right */}
      <rect x="176" y="128" width="22" height="34" rx="9" fill="url(#pwSnap)" />
      <circle cx="187" cy="145" r="6.5" fill="#ffffff" />
      <circle cx="187" cy="145" r="2.4" fill="#0d9c8c" />

      {/* contact shadow */}
      <ellipse cx="118" cy="184" rx="72" ry="9" fill="#0a6d63" opacity="0.15" />
    </svg>
  );
}
