import React, { createContext, useContext, useEffect } from 'react';

export type Theme = 'light';

interface ThemeContextType {
  theme: 'light';
  toggleTheme: () => void;
  setTheme: (theme: 'light') => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
  setTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Always lock theme to clean minimalist light mode
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark');
    root.classList.add('light');
    try {
      localStorage.setItem('horusscope_theme_preference', 'light');
    } catch {
      // ignore
    }
  }, []);

  const toggleTheme = () => {
    // Dark mode removed per user request: always enforce light mode
  };

  const setTheme = () => {
    // Dark mode removed per user request: always enforce light mode
  };

  return (
    <ThemeContext.Provider value={{ theme: 'light', toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => useContext(ThemeContext);

