import React from 'react';
import { useBrand } from '../context/BrandContext';
import { useTheme } from '../context/ThemeContext';
import { Upload } from 'lucide-react';

interface HoruscopeLogoProps {
  variant?: 'full' | 'compact' | 'icon-only';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showUploadPrompt?: boolean;
  className?: string;
  mode?: 'light' | 'dark'; // Force light or dark logo variant
  onClick?: () => void;
}

export const HoruscopeLogo: React.FC<HoruscopeLogoProps> = ({
  variant = 'full',
  size = 'md',
  showUploadPrompt = true,
  className = '',
  mode,
  onClick,
}) => {
  const { lightLogoUrl, darkLogoUrl, activeLogoUrl, openUploadModal } = useBrand();
  const { theme } = useTheme();

  const currentEffectiveMode = mode || theme;

  // Determine logo URL based on explicit mode override or active theme
  const effectiveLogoUrl = mode === 'light'
    ? (lightLogoUrl || darkLogoUrl)
    : mode === 'dark'
    ? (darkLogoUrl || lightLogoUrl)
    : activeLogoUrl;

  const handleLogoClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick();
    } else if (showUploadPrompt) {
      e.stopPropagation();
      openUploadModal(currentEffectiveMode);
    }
  };

  // Dimensions based on size
  const sizeConfig = {
    sm: { height: 'h-8', maxHeight: 'max-h-8', textTitle: 'text-sm', sub: 'text-[9px]', iconSize: 'h-7 w-7', divH: 'h-5', compactText: 'text-sm' },
    md: { height: 'h-11 sm:h-12', maxHeight: 'max-h-12', textTitle: 'text-xl', sub: 'text-[10px] sm:text-[11px]', iconSize: 'h-10 w-10', divH: 'h-7', compactText: 'text-base' },
    lg: { height: 'h-14', maxHeight: 'max-h-14', textTitle: 'text-2xl', sub: 'text-xs', iconSize: 'h-12 w-12', divH: 'h-8', compactText: 'text-xl' },
    xl: { height: 'h-20', maxHeight: 'max-h-20', textTitle: 'text-3xl', sub: 'text-sm', iconSize: 'h-16 w-16', divH: 'h-12', compactText: 'text-2xl' },
  }[size];

  // If user has uploaded a custom logo for this mode, render their image
  if (effectiveLogoUrl) {
    return (
      <div
        className={`group relative inline-flex items-center cursor-pointer select-none ${className}`}
        onClick={handleLogoClick}
        title="Click to manage custom logo"
      >
        <img
          src={effectiveLogoUrl}
          alt="Custom System Logo"
          className={`${sizeConfig.maxHeight} w-auto object-contain transition-transform group-hover:scale-102`}
        />
        {showUploadPrompt && (
          <div className="absolute -top-1 -right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-amber-500 text-slate-950 p-1 rounded-full shadow-md text-[10px] font-bold">
            <Upload className="w-2.5 h-2.5" />
          </div>
        )}
      </div>
    );
  }

  // Text color based on mode
  const emblemTextColor = currentEffectiveMode === 'light' ? 'text-slate-900' : 'text-white';

  // --- Official Horuscope Vector Logo ---

  // 1. Icon Only Variant (Eye of Horus with Gold Crosshairs)
  if (variant === 'icon-only') {
    return (
      <div
        className={`group relative inline-flex items-center justify-center cursor-pointer select-none ${className}`}
        onClick={handleLogoClick}
        title="Horuscope • Click to upload custom logo"
      >
        <svg
          viewBox="0 0 140 140"
          className={`${sizeConfig.height} aspect-square text-amber-500`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Gold Target Crosshair Ring */}
          <circle cx="70" cy="70" r="52" stroke="#C59B27" strokeWidth="4.5" />
          <line x1="70" y1="8" x2="70" y2="28" stroke="#C59B27" strokeWidth="5" strokeLinecap="round" />
          <line x1="70" y1="112" x2="70" y2="132" stroke="#C59B27" strokeWidth="5" strokeLinecap="round" />
          <line x1="8" y1="70" x2="28" y2="70" stroke="#C59B27" strokeWidth="5" strokeLinecap="round" />
          <line x1="112" y1="70" x2="132" y2="70" stroke="#C59B27" strokeWidth="5" strokeLinecap="round" />

          {/* Eye of Horus Elements */}
          {/* Eyebrow */}
          <path
            d="M 36 44 C 54 33 86 33 106 44 C 98 42 74 38 48 44 Z"
            fill="currentColor"
            className="text-slate-900"
          />
          {/* Upper Eyelid */}
          <path
            d="M 32 66 C 48 50 86 48 112 62"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
            className="text-slate-900"
          />
          {/* Lower Eyelid */}
          <path
            d="M 32 66 C 52 78 88 77 106 66"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            className="text-slate-900"
          />
          {/* Central Reticle Pupil */}
          <circle cx="72" cy="64" r="14" stroke="#C59B27" strokeWidth="3" />
          <circle cx="72" cy="64" r="6" stroke="#C59B27" strokeWidth="2.5" />
          <circle cx="72" cy="64" r="2.5" fill="#C59B27" />
          <line x1="72" y1="46" x2="72" y2="82" stroke="#C59B27" strokeWidth="2" />
          <line x1="54" y1="64" x2="90" y2="64" stroke="#C59B27" strokeWidth="2" />

          {/* Falcon Cheek Drop & Spiral */}
          <path
            d="M 82 72 L 82 104 C 82 108 85 110 87 106 L 87 70 Z"
            fill="currentColor"
            className="text-slate-900"
          />
          <path
            d="M 64 76 C 50 86 44 94 44 100 C 44 106 50 106 54 100 C 58 94 62 86 64 76"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            className="text-slate-900"
          />
        </svg>

        {showUploadPrompt && (
          <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-amber-500 text-slate-950 p-0.5 rounded-full shadow-md">
            <Upload className="w-2.5 h-2.5" />
          </div>
        )}
      </div>
    );
  }

  // 2. Compact Variant (Horizontal Emblem + Text for Navbars)
  if (variant === 'compact') {
    return (
      <div
        className={`group relative inline-flex items-center space-x-2.5 cursor-pointer select-none ${className}`}
        onClick={handleLogoClick}
        title="Horuscope • Click to upload custom logo"
      >
        <svg
          viewBox="0 0 140 140"
          className={`${sizeConfig.iconSize} shrink-0 text-amber-500`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Gold Target Crosshair Ring */}
          <circle cx="70" cy="70" r="52" stroke="#C59B27" strokeWidth="5" />
          <line x1="70" y1="8" x2="70" y2="26" stroke="#C59B27" strokeWidth="5" strokeLinecap="round" />
          <line x1="70" y1="114" x2="70" y2="132" stroke="#C59B27" strokeWidth="5" strokeLinecap="round" />
          <line x1="8" y1="70" x2="26" y2="70" stroke="#C59B27" strokeWidth="5" strokeLinecap="round" />
          <line x1="114" y1="70" x2="132" y2="70" stroke="#C59B27" strokeWidth="5" strokeLinecap="round" />

          {/* Eye of Horus */}
          <path d="M 36 44 C 54 33 86 33 106 44 Z" fill="currentColor" className={emblemTextColor} />
          <path d="M 32 66 C 48 50 86 48 112 62" stroke="currentColor" strokeWidth="5" strokeLinecap="round" className={emblemTextColor} />
          <path d="M 32 66 C 52 78 88 77 106 66" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className={emblemTextColor} />
          <circle cx="72" cy="64" r="13" stroke="#C59B27" strokeWidth="3" />
          <circle cx="72" cy="64" r="5.5" stroke="#C59B27" strokeWidth="2" />
          <circle cx="72" cy="64" r="2" fill="#C59B27" />
          <line x1="72" y1="48" x2="72" y2="80" stroke="#C59B27" strokeWidth="2" />
          <line x1="56" y1="64" x2="88" y2="64" stroke="#C59B27" strokeWidth="2" />
          <path d="M 82 72 L 82 104 L 86 104 L 86 70 Z" fill="currentColor" className={emblemTextColor} />
          <path d="M 64 76 C 50 86 44 94 44 100 C 44 106 50 106 54 100" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" className={emblemTextColor} />
        </svg>

        {/* Divider */}
        <div className={`${sizeConfig.divH} w-[2px] bg-[#C59B27]/80 rounded-full`} />

        {/* Brand Text */}
        <div className={`flex items-center ${sizeConfig.compactText} font-black tracking-wider leading-none`}>
          <span className={emblemTextColor}>HORUS</span>
          <span className="text-[#C59B27] flex items-center">
            <span>C</span>
            {/* Target Reticle 'O' */}
            <span className="inline-flex items-center justify-center mx-[1px] relative w-3 h-3 border-2 border-[#C59B27] rounded-full">
              <span className="w-1 h-1 bg-[#C59B27] rounded-full"></span>
              <span className="absolute -top-1 w-[1.5px] h-1 bg-[#C59B27]"></span>
              <span className="absolute -bottom-1 w-[1.5px] h-1 bg-[#C59B27]"></span>
              <span className="absolute -left-1 h-[1.5px] w-1 bg-[#C59B27]"></span>
              <span className="absolute -right-1 h-[1.5px] w-1 bg-[#C59B27]"></span>
            </span>
            <span>PE</span>
          </span>
        </div>

        {showUploadPrompt && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-amber-400 p-0.5 ml-1">
            <Upload className="w-3 h-3" />
          </div>
        )}
      </div>
    );
  }

  // 3. Full Official Logo Variant (Medallion + Divider + HORUSCOPE + Subtitle)
  return (
    <div
      className={`group relative inline-flex items-center gap-3.5 cursor-pointer select-none ${className}`}
      onClick={handleLogoClick}
      title="Horuscope • Click to upload custom logo"
    >
      {/* Left Medallion: Eye of Horus inside Gold Crosshairs */}
      <svg
        viewBox="0 0 140 140"
        className={`${sizeConfig.height} aspect-square shrink-0`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer Gold Reticle */}
        <circle cx="70" cy="70" r="50" stroke="#C59B27" strokeWidth="4.5" />
        <line x1="70" y1="8" x2="70" y2="28" stroke="#C59B27" strokeWidth="5" strokeLinecap="round" />
        <line x1="70" y1="112" x2="70" y2="132" stroke="#C59B27" strokeWidth="5" strokeLinecap="round" />
        <line x1="8" y1="70" x2="28" y2="70" stroke="#C59B27" strokeWidth="5" strokeLinecap="round" />
        <line x1="112" y1="70" x2="132" y2="70" stroke="#C59B27" strokeWidth="5" strokeLinecap="round" />

        {/* Eye of Horus Symbol */}
        <path
          d="M 36 44 C 54 33 86 33 106 44 C 98 42 74 38 48 44 Z"
          fill="currentColor"
          className={emblemTextColor}
        />
        <path
          d="M 32 66 C 48 50 86 48 112 62"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
          className={emblemTextColor}
        />
        <path
          d="M 32 66 C 52 78 88 77 106 66"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          className={emblemTextColor}
        />

        {/* Reticle Pupil */}
        <circle cx="72" cy="64" r="14" stroke="#C59B27" strokeWidth="3" />
        <circle cx="72" cy="64" r="6" stroke="#C59B27" strokeWidth="2.5" />
        <circle cx="72" cy="64" r="2.5" fill="#C59B27" />
        <line x1="72" y1="46" x2="72" y2="82" stroke="#C59B27" strokeWidth="2" />
        <line x1="54" y1="64" x2="90" y2="64" stroke="#C59B27" strokeWidth="2" />

        {/* Falcon Cheek and Spiral */}
        <path
          d="M 82 72 L 82 104 C 82 108 85 110 87 106 L 87 70 Z"
          fill="currentColor"
          className={emblemTextColor}
        />
        <path
          d="M 64 76 C 50 86 44 94 44 100 C 44 106 50 106 54 100 C 58 94 62 86 64 76"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          className={emblemTextColor}
        />
      </svg>

      {/* Gold Divider Bar */}
      <div className="h-8 sm:h-10 w-[2.5px] bg-[#C59B27] rounded-full shrink-0" />

      {/* Typography */}
      <div className="flex flex-col justify-center text-left">
        {/* Main Title: HORUSCOPE */}
        <div className={`font-black tracking-tight leading-none flex items-center ${sizeConfig.textTitle}`}>
          <span className={`${emblemTextColor} font-extrabold tracking-wide`}>HORUS</span>
          <span className="text-[#C59B27] flex items-center font-extrabold tracking-wide">
            <span>C</span>
            {/* Precision Crosshair Target 'O' */}
            <span className="inline-flex items-center justify-center mx-[1.5px] relative w-[0.85em] h-[0.85em] border-[2.5px] border-[#C59B27] rounded-full align-middle">
              <span className="w-[0.25em] h-[0.25em] bg-[#C59B27] rounded-full"></span>
              {/* Reticle ticks */}
              <span className="absolute -top-[0.25em] w-[2px] h-[0.22em] bg-[#C59B27]"></span>
              <span className="absolute -bottom-[0.25em] w-[2px] h-[0.22em] bg-[#C59B27]"></span>
              <span className="absolute -left-[0.25em] h-[2px] w-[0.22em] bg-[#C59B27]"></span>
              <span className="absolute -right-[0.25em] h-[2px] w-[0.22em] bg-[#C59B27]"></span>
            </span>
            <span>PE</span>
          </span>
        </div>

        {/* Subtitle: FIND • ANALYZE • CONNECT • GROW */}
        <div className={`font-semibold tracking-[0.22em] text-slate-500 uppercase mt-1 ${sizeConfig.sub}`}>
          <span>FIND</span>
          <span className="text-[#C59B27] mx-1.5">•</span>
          <span>ANALYZE</span>
          <span className="text-[#C59B27] mx-1.5">•</span>
          <span>CONNECT</span>
          <span className="text-[#C59B27] mx-1.5">•</span>
          <span>GROW</span>
        </div>
      </div>

      {showUploadPrompt && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-amber-500 hover:bg-amber-400 text-slate-950 p-1.5 rounded-lg shadow-md flex items-center gap-1 text-[10px] font-bold shrink-0 ml-1">
          <Upload className="w-3 h-3" />
          <span className="hidden sm:inline">Change</span>
        </div>
      )}
    </div>
  );
};
