import React from 'react';

/**
 * Friendly Indian Shopkeeper Mascot (Vyapari Mitra)
 * Character with traditional turban, friendly smile, tilak, and welcoming posture.
 */
export const ShopkeeperMascot: React.FC<{ className?: string; size?: number }> = ({
  className = '',
  size = 120,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 160 160"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block drop-shadow-md ${className}`}
  >
    {/* Soft aura */}
    <circle cx="80" cy="80" r="72" fill="url(#shopkeeperAura)" opacity="0.25" />
    <defs>
      <radialGradient id="shopkeeperAura" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0%" stopColor="#FF9B25" />
        <stop offset="100%" stopColor="#741BFF" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="turbanGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#FF9B25" />
        <stop offset="50%" stopColor="#FF55B8" />
        <stop offset="100%" stopColor="#741BFF" />
      </linearGradient>
      <linearGradient id="kurtaGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FFF7ED" />
        <stop offset="100%" stopColor="#FED7AA" />
      </linearGradient>
      <linearGradient id="jacketGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#741BFF" />
        <stop offset="100%" stopColor="#1769FF" />
      </linearGradient>
      <linearGradient id="skinGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FDDEC0" />
        <stop offset="100%" stopColor="#F5B98B" />
      </linearGradient>
    </defs>

    {/* Body / Kurta */}
    <path d="M40 145 C40 115, 60 108, 80 108 C100 108, 120 115, 120 145 Z" fill="url(#kurtaGrad)" />
    {/* Nehru Jacket */}
    <path d="M52 118 C52 110, 64 109, 80 112 C96 109, 108 110, 108 118 L104 145 L56 145 Z" fill="url(#jacketGrad)" />
    <line x1="80" y1="112" x2="80" y2="145" stroke="#F0E9FF" strokeWidth="2" strokeDasharray="3 3" />

    {/* Neck */}
    <rect x="73" y="92" width="14" height="20" rx="4" fill="url(#skinGrad)" />

    {/* Head */}
    <ellipse cx="80" cy="74" rx="26" ry="28" fill="url(#skinGrad)" />
    {/* Ears */}
    <ellipse cx="53" cy="76" rx="5" ry="8" fill="url(#skinGrad)" />
    <ellipse cx="107" cy="76" rx="5" ry="8" fill="url(#skinGrad)" />

    {/* Turban (Pagdi) */}
    <path
      d="M50 58 C45 36, 68 22, 80 22 C95 22, 115 36, 110 58 C105 66, 55 66, 50 58 Z"
      fill="url(#turbanGrad)"
    />
    <path
      d="M56 46 C68 36, 92 36, 104 46 C96 54, 64 54, 56 46 Z"
      fill="#FF55B8"
      opacity="0.6"
    />
    {/* Turban Jewel (Kalgi / Brooch) */}
    <circle cx="80" cy="36" r="5" fill="#FACC15" stroke="#FFFFFF" strokeWidth="1.5" />
    <path d="M80 31 L80 18" stroke="#FACC15" strokeWidth="2" strokeLinecap="round" />

    {/* Tilak */}
    <line x1="80" y1="52" x2="80" y2="60" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="80" cy="62" r="1.5" fill="#FACC15" />

    {/* Eyebrows */}
    <path d="M63 64 Q70 61 74 64" stroke="#451A03" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    <path d="M86 64 Q90 61 97 64" stroke="#451A03" strokeWidth="2.5" strokeLinecap="round" fill="none" />

    {/* Eyes with cheerful spark */}
    <ellipse cx="69" cy="70" rx="3.5" ry="3.5" fill="#1E1B4B" />
    <circle cx="70.5" cy="69" r="1.2" fill="#FFFFFF" />
    <ellipse cx="91" cy="70" rx="3.5" ry="3.5" fill="#1E1B4B" />
    <circle cx="92.5" cy="69" r="1.2" fill="#FFFFFF" />

    {/* Cheerful rosy cheeks */}
    <ellipse cx="62" cy="77" rx="5" ry="3" fill="#FF55B8" opacity="0.35" />
    <ellipse cx="98" cy="77" rx="5" ry="3" fill="#FF55B8" opacity="0.35" />

    {/* Classic Friendly Indian Mustache */}
    <path
      d="M68 83 Q80 81 80 84 Q80 81 92 83 C88 88, 80 88, 80 86 C80 88, 72 88, 68 83 Z"
      fill="#292524"
    />

    {/* Warm Smile */}
    <path d="M72 88 Q80 95 88 88" stroke="#78350F" strokeWidth="2" strokeLinecap="round" fill="none" />

    {/* Welcoming Namaste Hands / Thumbs Up Badge */}
    <g transform="translate(100, 106)">
      <circle cx="16" cy="16" r="14" fill="#10B981" />
      <path d="M12 16 L15 19 L21 13" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  </svg>
);

/**
 * Friendly AI Robot Assistant Companion
 * Spherical modern friendly AI with expressive eyes and speech wave antenna.
 */
export const AIRobotAssistant: React.FC<{ className?: string; size?: number }> = ({
  className = '',
  size = 120,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 160 160"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block drop-shadow-md ${className}`}
  >
    <defs>
      <linearGradient id="botHeadGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="50%" stopColor="#F0E9FF" />
        <stop offset="100%" stopColor="#E0E7FF" />
      </linearGradient>
      <linearGradient id="botVisorGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#1E1B4B" />
        <stop offset="100%" stopColor="#312E81" />
      </linearGradient>
      <linearGradient id="antennaGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#36C5FF" />
        <stop offset="100%" stopColor="#741BFF" />
      </linearGradient>
    </defs>

    {/* Floating Shadow */}
    <ellipse cx="80" cy="146" rx="42" ry="8" fill="#741BFF" opacity="0.18" />

    {/* Antenna */}
    <line x1="80" y1="42" x2="80" y2="22" stroke="#741BFF" strokeWidth="4" strokeLinecap="round" />
    <circle cx="80" cy="18" r="9" fill="url(#antennaGrad)" />
    <circle cx="80" cy="18" r="4" fill="#FFFFFF" />
    {/* Sound rings from antenna */}
    <path d="M70 12 C73 9 87 9 90 12" stroke="#36C5FF" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.8" />
    <path d="M64 7 C70 3 90 3 96 7" stroke="#36C5FF" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5" />

    {/* Robot Head / Body (All-in-one friendly sphere) */}
    <rect x="36" y="38" width="88" height="82" rx="40" fill="url(#botHeadGrad)" stroke="#741BFF" strokeWidth="3" />
    {/* Ear pods */}
    <rect x="26" y="64" width="12" height="28" rx="6" fill="#741BFF" />
    <circle cx="32" cy="78" r="3" fill="#36C5FF" />
    <rect x="122" y="64" width="12" height="28" rx="6" fill="#741BFF" />
    <circle cx="128" cy="78" r="3" fill="#36C5FF" />

    {/* Digital Visor / Face Screen */}
    <rect x="46" y="52" width="68" height="48" rx="20" fill="url(#botVisorGrad)" />

    {/* Expressive Glowing Cyan Eyes */}
    <g>
      {/* Left eye */}
      <ellipse cx="66" cy="74" rx="7" ry="10" fill="#36C5FF" />
      <circle cx="68" cy="71" r="2.5" fill="#FFFFFF" />
      {/* Right eye */}
      <ellipse cx="94" cy="74" rx="7" ry="10" fill="#36C5FF" />
      <circle cx="96" cy="71" r="2.5" fill="#FFFFFF" />
    </g>

    {/* Cute smile on visor */}
    <path d="M74 86 Q80 91 86 86" stroke="#36C5FF" strokeWidth="2.5" strokeLinecap="round" fill="none" />

    {/* Body badge: Indian Tricolor / Voice AI Symbol */}
    <g transform="translate(68, 124)">
      <rect x="0" y="0" width="24" height="12" rx="6" fill="#1769FF" />
      <circle cx="12" cy="6" r="3" fill="#FFFFFF" />
    </g>
  </svg>
);

/**
 * Kirana Indian Grocery Storefront Illustration
 */
export const KiranaStoreIllustration: React.FC<{ className?: string; size?: number }> = ({
  className = '',
  size = 140,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 160 160"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block drop-shadow-sm ${className}`}
  >
    <defs>
      <linearGradient id="awningGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#FF9B25" />
        <stop offset="50%" stopColor="#FF55B8" />
        <stop offset="100%" stopColor="#741BFF" />
      </linearGradient>
    </defs>
    {/* Store building body */}
    <rect x="24" y="52" width="112" height="92" rx="14" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="2" />
    {/* Awning stripes */}
    <path d="M18 52 C20 40, 140 40, 142 52 L136 68 C136 74, 126 74, 124 68 C124 74, 114 74, 112 68 C112 74, 102 74, 100 68 C100 74, 90 74, 88 68 C88 74, 78 74, 76 68 C76 74, 66 74, 64 68 C64 74, 54 74, 52 68 C52 74, 42 74, 40 68 C40 74, 30 74, 28 68 C28 74, 18 74, 18 68 Z" fill="url(#awningGrad)" />

    {/* Signboard */}
    <rect x="42" y="24" width="76" height="22" rx="8" fill="#741BFF" />
    <text x="80" y="39" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="bold" fontFamily="sans-serif">
      KIRANA STORE
    </text>

    {/* Display counter */}
    <rect x="36" y="92" width="88" height="42" rx="8" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1.5" />
    {/* Jars & items on counter */}
    <rect x="44" y="76" width="14" height="18" rx="4" fill="#FF9B25" opacity="0.8" />
    <rect x="62" y="74" width="14" height="20" rx="4" fill="#10B981" opacity="0.8" />
    <rect x="80" y="78" width="14" height="16" rx="4" fill="#36C5FF" opacity="0.8" />
    <rect x="98" y="72" width="18" height="22" rx="4" fill="#FF55B8" opacity="0.8" />

    {/* Grain sacks */}
    <ellipse cx="44" cy="136" rx="12" ry="8" fill="#D97706" />
    <ellipse cx="116" cy="136" rx="12" ry="8" fill="#059669" />
  </svg>
);

/**
 * Shopping Basket with Groceries Illustration
 */
export const ShoppingBasketIllustration: React.FC<{ className?: string; size?: number }> = ({
  className = '',
  size = 120,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 140 140"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block ${className}`}
  >
    <defs>
      <linearGradient id="basketGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#FF9B25" />
        <stop offset="100%" stopColor="#EA580C" />
      </linearGradient>
    </defs>
    {/* Basket Handle */}
    <path d="M46 68 C46 36, 94 36, 94 68" stroke="#C2410C" strokeWidth="5" strokeLinecap="round" fill="none" />

    {/* Groceries sticking out */}
    <rect x="52" y="36" width="14" height="36" rx="4" fill="#3B82F6" transform="rotate(-10 52 36)" />
    <rect x="74" y="30" width="16" height="42" rx="6" fill="#10B981" transform="rotate(12 74 30)" />
    <circle cx="68" cy="54" r="10" fill="#EF4444" />
    <circle cx="86" cy="58" r="9" fill="#F59E0B" />

    {/* Basket Body */}
    <path
      d="M26 68 L36 114 C38 120, 44 124, 50 124 L90 124 C96 124, 102 120, 104 114 L114 68 Z"
      fill="url(#basketGrad)"
    />
    <line x1="22" y1="68" x2="118" y2="68" stroke="#9A3412" strokeWidth="4" strokeLinecap="round" />
    {/* Weave lines */}
    <line x1="48" y1="74" x2="54" y2="118" stroke="#FFFFFF" strokeWidth="2" opacity="0.4" />
    <line x1="70" y1="74" x2="70" y2="118" stroke="#FFFFFF" strokeWidth="2" opacity="0.4" />
    <line x1="92" y1="74" x2="86" y2="118" stroke="#FFFFFF" strokeWidth="2" opacity="0.4" />
  </svg>
);

/**
 * Business Growth & Profit Illustration
 */
export const BusinessGrowthIllustration: React.FC<{ className?: string; size?: number }> = ({
  className = '',
  size = 120,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 140 140"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block ${className}`}
  >
    <defs>
      <linearGradient id="growthGrad" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0%" stopColor="#10B981" />
        <stop offset="100%" stopColor="#36C5FF" />
      </linearGradient>
    </defs>
    {/* Bars */}
    <rect x="22" y="88" width="18" height="36" rx="6" fill="#E2E8F0" />
    <rect x="46" y="70" width="18" height="54" rx="6" fill="#BAE6FD" />
    <rect x="70" y="52" width="18" height="72" rx="6" fill="#DDD6FE" />
    <rect x="94" y="32" width="18" height="92" rx="6" fill="url(#growthGrad)" />

    {/* Trending line & arrow */}
    <path
      d="M26 84 Q50 64 68 54 T104 22"
      stroke="#741BFF"
      strokeWidth="4"
      strokeLinecap="round"
      fill="none"
    />
    <polygon points="104,14 116,22 104,30" fill="#741BFF" />

    {/* Indian Rupee Coin */}
    <circle cx="114" cy="46" r="14" fill="#FACC15" stroke="#CA8A04" strokeWidth="2" />
    <text x="114" y="52" textAnchor="middle" fill="#854D0E" fontSize="13" fontWeight="bold">₹</text>
  </svg>
);
