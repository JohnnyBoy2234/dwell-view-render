/**
 * Premium 3D-style maintenance illustration: a green toolbox with two open-end
 * spanners and a pipe rising out of it, a small house emblem on the front, and
 * soft trees, hills and sparkles behind. Pure SVG with green gradients so it
 * scales crisply and tints itself to the module's green identity.
 */
export default function MaintenanceToolbox({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 260 210"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="mtBoxFront" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#54c057" />
          <stop offset="1" stopColor="#2c9a33" />
        </linearGradient>
        <linearGradient id="mtBoxTop" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9fe09f" />
          <stop offset="1" stopColor="#5fc25f" />
        </linearGradient>
        <linearGradient id="mtSpanner" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#79d179" />
          <stop offset="1" stopColor="#369a3c" />
        </linearGradient>
        <linearGradient id="mtPipe" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#b7bec9" />
          <stop offset="0.45" stopColor="#f2f5f8" />
          <stop offset="1" stopColor="#aab2be" />
        </linearGradient>
        <radialGradient id="mtGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#bdeebd" stopOpacity="0.85" />
          <stop offset="1" stopColor="#bdeebd" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* soft glow */}
      <ellipse cx="132" cy="120" rx="112" ry="86" fill="url(#mtGlow)" />

      {/* hills */}
      <path d="M-12 162 Q44 112 100 162 Z" fill="#d7efd7" />
      <path d="M118 164 Q182 106 256 164 Z" fill="#cbeccb" opacity="0.85" />

      {/* sparkles */}
      <g fill="#77cf77" opacity="0.65">
        <path d="M60 58 C60 64 64 68 70 68 C64 68 60 72 60 78 C60 72 56 68 50 68 C56 68 60 64 60 58 Z" />
        <path d="M198 70 C198 75 201 78 206 78 C201 78 198 81 198 86 C198 81 195 78 190 78 C195 78 198 75 198 70 Z" />
        <path d="M176 40 C176 44 178 46 182 46 C178 46 176 48 176 52 C176 48 174 46 170 46 C174 46 176 44 176 40 Z" />
      </g>

      {/* trees */}
      <g>
        <rect x="41" y="150" width="6" height="14" rx="2" fill="#3f9a45" />
        <circle cx="36" cy="150" r="8" fill="#59b459" />
        <circle cx="52" cy="150" r="8" fill="#59b459" />
        <circle cx="44" cy="144" r="12" fill="#66c266" />
        <rect x="213" y="152" width="5" height="12" rx="2" fill="#3f9a45" />
        <circle cx="210" cy="152" r="7" fill="#59b459" />
        <circle cx="222" cy="152" r="7" fill="#59b459" />
        <circle cx="216" cy="147" r="10" fill="#66c266" />
      </g>

      {/* ground shadow under the box */}
      <ellipse cx="130" cy="172" rx="66" ry="10" fill="#2c9a33" opacity="0.15" />

      {/* spanners rising behind the box */}
      <g strokeLinecap="round" fill="none">
        <line x1="113" y1="108" x2="96" y2="66" stroke="url(#mtSpanner)" strokeWidth="11" />
        <path d="M84 66 A 11 11 0 1 1 101 58" stroke="url(#mtSpanner)" strokeWidth="8" />
        <line x1="147" y1="108" x2="165" y2="62" stroke="url(#mtSpanner)" strokeWidth="11" />
        <path d="M177 62 A 11 11 0 1 0 160 54" stroke="url(#mtSpanner)" strokeWidth="8" />
      </g>

      {/* pipe rising out of the box */}
      <g>
        <rect x="123" y="58" width="14" height="54" rx="7" fill="url(#mtPipe)" />
        <path d="M123 70 Q123 46 103 46 L103 60 Q114 60 116 70 Z" fill="url(#mtPipe)" />
        <rect x="119" y="94" width="22" height="7" rx="3.5" fill="#9aa2ae" />
        <rect x="119" y="60" width="22" height="6" rx="3" fill="#aeb6c1" />
        <circle cx="103" cy="52" r="7.5" fill="url(#mtPipe)" />
        <circle cx="103" cy="52" r="3.5" fill="#8b93a0" />
      </g>

      {/* toolbox lid (covers the base of the tools) */}
      <rect x="112" y="100" width="36" height="9" rx="4" fill="#238a2a" />
      <rect x="76" y="97" width="108" height="21" rx="9" fill="url(#mtBoxTop)" />
      <rect x="84" y="101" width="92" height="6" rx="3" fill="#ffffff" opacity="0.25" />

      {/* toolbox front */}
      <rect x="82" y="112" width="96" height="52" rx="12" fill="url(#mtBoxFront)" />
      <rect x="89" y="118" width="82" height="7" rx="3.5" fill="#ffffff" opacity="0.16" />

      {/* house emblem */}
      <g>
        <path d="M117 137 L130 126 L143 137 Z" fill="#ffffff" />
        <rect x="120" y="136" width="20" height="15" rx="2" fill="#ffffff" />
        <rect x="126" y="142" width="8" height="9" rx="1" fill="#3aa93f" />
      </g>
    </svg>
  );
}
