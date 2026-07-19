/**
 * Premium 3D-style maintenance illustration: a glossy green toolbox with a
 * house badge, a tall chrome fluted screwdriver (green collar + chrome top with
 * a sprouting leaf), a green pipe over the left rim, a right-leaning green
 * spanner, a black-handled screwdriver peeking out, and a separate green spanner
 * resting on a silver hex nut — over faint mint house/tree silhouettes.
 * Pure SVG so it scales crisply and tints to the module's green identity.
 */
export default function MaintenanceToolbox({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 264 264"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="mtMint" cx="52%" cy="46%" r="58%">
          <stop offset="0" stopColor="#d6f7e2" stopOpacity="0.9" />
          <stop offset="1" stopColor="#d6f7e2" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="mtBoxFront" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#43d873" />
          <stop offset="0.55" stopColor="#25b84e" />
          <stop offset="1" stopColor="#12963a" />
        </linearGradient>
        <linearGradient id="mtGreenTool" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4ad277" />
          <stop offset="1" stopColor="#0f9137" />
        </linearGradient>
        <linearGradient id="mtGreenTool2" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3fca6b" />
          <stop offset="1" stopColor="#0d8a34" />
        </linearGradient>
        <linearGradient id="mtChrome" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#c3ccd2" />
          <stop offset="0.28" stopColor="#f4f6f8" />
          <stop offset="0.5" stopColor="#ffffff" />
          <stop offset="0.72" stopColor="#aeb8bf" />
          <stop offset="1" stopColor="#d7dde1" />
        </linearGradient>
        <linearGradient id="mtChromeHandle" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#eef1f3" />
          <stop offset="0.5" stopColor="#c2cbd1" />
          <stop offset="1" stopColor="#f2f4f6" />
        </linearGradient>
        <linearGradient id="mtBadge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2bb24d" />
          <stop offset="1" stopColor="#128f37" />
        </linearGradient>
        <linearGradient id="mtNut" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f0f3f5" />
          <stop offset="0.5" stopColor="#c4ccd2" />
          <stop offset="1" stopColor="#9aa4ab" />
        </linearGradient>
        <linearGradient id="mtBlack" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3a3f45" />
          <stop offset="1" stopColor="#16191d" />
        </linearGradient>
      </defs>

      {/* soft mint glow */}
      <ellipse cx="138" cy="128" rx="128" ry="120" fill="url(#mtMint)" />

      {/* faint background silhouettes: house + trees */}
      <g fill="#d5f2df">
        <path d="M170 200 L170 130 L210 100 L250 130 L250 200 Z" opacity="0.55" />
        <path d="M162 134 L210 96 L258 134 Z" opacity="0.55" />
        <rect x="222" y="150" width="18" height="18" rx="2" fill="#c7ecd4" opacity="0.6" />
        <g opacity="0.5">
          <rect x="36" y="150" width="6" height="30" rx="3" />
          <path d="M39 120 l18 34 h-36 z" />
        </g>
        <g opacity="0.45">
          <rect x="242" y="176" width="5" height="22" rx="2.5" />
          <path d="M244 152 l14 26 h-28 z" />
        </g>
      </g>

      {/* ground shadow */}
      <ellipse cx="150" cy="244" rx="86" ry="12" fill="#0f7a30" opacity="0.16" />
      <ellipse cx="44" cy="232" rx="26" ry="6" fill="#0f7a30" opacity="0.14" />

      {/* box back wall (behind the tools) */}
      <rect x="96" y="150" width="108" height="44" rx="10" fill="#0f9137" />

      {/* black-handled screwdriver peeking out behind, tilted */}
      <g transform="rotate(12 176 168)">
        <rect x="168" y="120" width="8" height="30" rx="4" fill="#c9ced3" />
        <rect x="163" y="146" width="20" height="46" rx="9" fill="url(#mtBlack)" />
        <rect x="167" y="150" width="4" height="30" rx="2" fill="#4b5158" opacity="0.7" />
      </g>

      {/* right-leaning green spanner */}
      <g transform="rotate(34 196 150)">
        <rect x="188" y="126" width="16" height="94" rx="8" fill="url(#mtGreenTool2)" />
        <rect x="192" y="150" width="4" height="60" rx="2" fill="#ffffff" opacity="0.18" />
        <path d="M180 120 A 16 16 0 1 1 212 120" fill="none" stroke="url(#mtGreenTool2)" strokeWidth="12" strokeLinecap="round" />
        <path d="M185 118 A 11 11 0 1 1 207 118" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" opacity="0.22" />
      </g>

      {/* central chrome screwdriver — leaf sprouting from the top */}
      <path d="M150 64 C 158 46 178 44 186 50 C 178 64 160 66 150 64 Z" fill="url(#mtGreenTool)" />
      <path d="M156 60 C 164 52 174 51 181 53" stroke="#0c8a33" strokeWidth="1.4" fill="none" opacity="0.55" />
      <rect x="133" y="60" width="34" height="52" rx="16" fill="url(#mtChromeHandle)" />
      <ellipse cx="156" cy="80" rx="9" ry="15" fill="#7f8a92" opacity="0.55" />
      <rect x="139" y="66" width="8" height="34" rx="4" fill="#ffffff" opacity="0.6" />

      {/* smooth chrome shaft */}
      <rect x="141" y="104" width="18" height="46" rx="4" fill="url(#mtChrome)" />

      {/* fluted chrome shaft (into the box) */}
      <rect x="136" y="150" width="28" height="60" rx="6" fill="url(#mtChrome)" />
      <g stroke="#9aa5ad" strokeWidth="1.4" opacity="0.7">
        <line x1="143" y1="158" x2="143" y2="206" />
        <line x1="150" y1="158" x2="150" y2="206" />
        <line x1="157" y1="158" x2="157" y2="206" />
      </g>
      <line x1="146" y1="158" x2="146" y2="206" stroke="#ffffff" strokeWidth="1.4" opacity="0.75" />
      <line x1="153" y1="158" x2="153" y2="206" stroke="#ffffff" strokeWidth="1.4" opacity="0.75" />

      {/* green pipe across the rim + left elbow */}
      <path
        d="M98 165 q -14 0 -14 -14 l0 -2"
        stroke="url(#mtGreenTool)" strokeWidth="15" strokeLinecap="round" fill="none"
      />
      <rect x="92" y="150" width="120" height="15" rx="7.5" fill="url(#mtGreenTool)" />
      <rect x="98" y="153" width="108" height="4" rx="2" fill="#ffffff" opacity="0.22" />

      {/* green collar ring around the shaft */}
      <rect x="128" y="146" width="44" height="20" rx="9" fill="url(#mtGreenTool)" />
      <rect x="133" y="149" width="34" height="4" rx="2" fill="#ffffff" opacity="0.28" />

      {/* toolbox front */}
      <rect x="84" y="176" width="132" height="70" rx="18" fill="url(#mtBoxFront)" />
      <ellipse cx="120" cy="192" rx="42" ry="12" fill="#ffffff" opacity="0.16" />
      <rect x="92" y="238" width="116" height="5" rx="2.5" fill="#0b7c2f" opacity="0.4" />

      {/* house badge */}
      <rect x="132" y="196" width="36" height="34" rx="10" fill="url(#mtBadge)" />
      <rect x="135" y="199" width="30" height="6" rx="3" fill="#ffffff" opacity="0.18" />
      <g fill="#ffffff">
        <path d="M138 216 L150 206 L162 216 Z" />
        <rect x="141" y="215" width="18" height="13" rx="1.5" />
        <rect x="147" y="220" width="6" height="8" rx="1" fill="#2bb24d" />
      </g>

      {/* separate left spanner resting on a hex nut */}
      <g>
        <rect x="37" y="118" width="15" height="92" rx="7.5" fill="url(#mtGreenTool)" />
        <rect x="41" y="126" width="4" height="72" rx="2" fill="#ffffff" opacity="0.2" />
        <path d="M27 99 A 18 18 0 1 1 61 99" fill="none" stroke="url(#mtGreenTool)" strokeWidth="13" strokeLinecap="round" />
        <path d="M33 97 A 12 12 0 1 1 55 97" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" opacity="0.25" />
        {/* hex nut */}
        <path d="M44 200 l13 7.5 v15 l-13 7.5 l-13 -7.5 v-15 z" fill="url(#mtNut)" />
        <path d="M44 208 l7 4 v8 l-7 4 l-7 -4 v-8 z" fill="#9aa4ab" opacity="0.55" />
      </g>
    </svg>
  );
}
