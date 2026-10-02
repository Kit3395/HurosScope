import React from 'react';

export const AuthFooter: React.FC = () => {
  return (
    <footer className="w-full py-5 text-center text-xs text-slate-500 border-t border-slate-200 relative z-10 bg-white/60">
      <div className="flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-3">
        <span className="font-bold text-slate-900">HoruScope</span>
        <span className="hidden sm:inline text-[#B48C36]">•</span>
        <span className="font-mono text-[11px] tracking-wider uppercase text-slate-500">
          Enterprise Intelligence Workspace
        </span>
      </div>
    </footer>
  );
};
