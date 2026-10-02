import React from 'react';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

/**
 * Theme toggle has been retired as dark mode was removed.
 * Renders null to keep API compatibility without displaying obsolete toggle controls.
 */
export const ThemeToggle: React.FC<ThemeToggleProps> = () => {
  return null;
};

