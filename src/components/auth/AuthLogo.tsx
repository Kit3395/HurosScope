import React from 'react';

interface AuthLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showWordmark?: boolean;
  theme?: 'light' | 'dark';
  className?: string;
}

export const AuthLogo: React.FC<AuthLogoProps> = ({
  size = 'lg',
  showWordmark = true,
  theme = 'light',
  className = '',
}) => {
  const isLight = theme === 'light';
  const iconDimensions = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
  }[size];

  const wordmarkSize = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl sm:text-3xl',
    xl: 'text-3xl sm:text-4xl',
  }[size];

  const eyeColor = isLight ? '#0F172A' : '#F5F1E8';
  const goldColor = isLight ? '#B48C36' : '#C9A24A';

  return (
    <div className={`inline-flex items-center space-x-3.5 select-none ${className}`}>
      {/* Eye of Horus + Precision Scope Emblem */}
      <svg
        viewBox="0 0 120 120"
        className={`${iconDimensions} shrink-0`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Scope Reticle Outer Ring */}
        <circle
          cx="60"
          cy="60"
          r="48"
          stroke={goldColor}
          strokeWidth="2.5"
          strokeOpacity={isLight ? '0.85' : '0.9'}
        />

        {/* Scope Inner Coordinate Circle */}
        <circle
          cx="60"
          cy="60"
          r="28"
          stroke={goldColor}
          strokeWidth="1.25"
          strokeDasharray="2 4"
          strokeOpacity={isLight ? '0.6' : '0.6'}
        />

        {/* Scope Cardinal Crosshairs */}
        <line x1="60" y1="6" x2="60" y2="20" stroke={goldColor} strokeWidth="2.5" strokeLinecap="square" />
        <line x1="60" y1="100" x2="60" y2="114" stroke={goldColor} strokeWidth="2.5" strokeLinecap="square" />
        <line x1="6" y1="60" x2="20" y2="60" stroke={goldColor} strokeWidth="2.5" strokeLinecap="square" />
        <line x1="100" y1="60" x2="114" y2="60" stroke={goldColor} strokeWidth="2.5" strokeLinecap="square" />

        {/* Eye of Horus Eyebrow */}
        <path
          d="M 32 38 C 48 28 72 28 88 38 C 80 36 60 33 42 38 Z"
          fill={eyeColor}
        />

        {/* Eye of Horus Upper Eyelid Curve */}
        <path
          d="M 30 56 C 44 42 76 40 94 52"
          stroke={eyeColor}
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Eye of Horus Lower Contour */}
        <path
          d="M 30 56 C 46 66 78 66 90 56"
          stroke={eyeColor}
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Scope Target Pupil (The Intelligent Eye Center) */}
        <circle cx="60" cy="54" r="9" stroke={goldColor} strokeWidth="2" />
        <circle cx="60" cy="54" r="3.5" fill={goldColor} />

        {/* Falcon Tear Marking (Vertical Drop) */}
        <path
          d="M 72 61 L 72 86 C 72 89 74 91 76 88 L 76 60 Z"
          fill={eyeColor}
        />

        {/* Falcon Spiral Tail Feature */}
        <path
          d="M 52 64 C 40 72 36 78 36 84 C 36 88 41 89 44 84 C 48 78 50 72 52 64"
          stroke={goldColor}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>

      {/* Brand Wordmark with Exact Capitalization: HoruScope */}
      {showWordmark && (
        <div className="flex flex-col">
          <span
            className={`${wordmarkSize} font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-[#F5F1E8]'} font-sans`}
            style={{ letterSpacing: '-0.02em' }}
          >
            Horu<span style={{ color: goldColor }}>Scope</span>
          </span>
        </div>
      )}
    </div>
  );
};
