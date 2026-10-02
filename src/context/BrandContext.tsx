import React, { createContext, useContext, useState } from 'react';
import { useTheme } from './ThemeContext';

interface BrandContextType {
  lightLogoUrl: string | null;
  darkLogoUrl: string | null;
  activeLogoUrl: string | null;
  customLogoUrl: string | null; // legacy alias to activeLogoUrl
  hasCustomLogo: boolean;
  brandName: string;
  tagline: string;
  uploadLightLogo: (dataUrl: string) => void;
  uploadDarkLogo: (dataUrl: string) => void;
  uploadCustomLogo: (dataUrl: string, targetMode?: 'light' | 'dark' | 'both') => void;
  removeLightLogo: () => void;
  removeDarkLogo: () => void;
  removeCustomLogo: (targetMode?: 'light' | 'dark' | 'all' | 'both') => void;
  isUploadModalOpen: boolean;
  uploadTargetMode: 'light' | 'dark' | 'both';
  setUploadTargetMode: (mode: 'light' | 'dark' | 'both') => void;
  openUploadModal: (initialMode?: 'light' | 'dark' | 'both') => void;
  closeUploadModal: () => void;
}

const LIGHT_LOGO_KEY = 'horusscope_custom_light_logo_v1';
const DARK_LOGO_KEY = 'horusscope_custom_dark_logo_v1';
const LEGACY_STORAGE_KEY = 'horusscope_custom_brand_logo_v1';
const BRAND_NAME_KEY = 'horusscope_brand_name_v1';
const TAGLINE_KEY = 'horusscope_brand_tagline_v1';

const BrandContext = createContext<BrandContextType | undefined>(undefined);

export const BrandProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme } = useTheme();

  const [lightLogoUrl, setLightLogoUrl] = useState<string | null>(() => {
    try {
      return localStorage.getItem(LIGHT_LOGO_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY) || null;
    } catch {
      return null;
    }
  });

  const [darkLogoUrl, setDarkLogoUrl] = useState<string | null>(() => {
    try {
      return localStorage.getItem(DARK_LOGO_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY) || null;
    } catch {
      return null;
    }
  });

  const [brandName] = useState<string>(() => {
    try {
      return localStorage.getItem(BRAND_NAME_KEY) || 'HORUSCOPE';
    } catch {
      return 'HORUSCOPE';
    }
  });

  const [tagline] = useState<string>(() => {
    try {
      return localStorage.getItem(TAGLINE_KEY) || 'FIND • ANALYZE • CONNECT • GROW';
    } catch {
      return 'FIND • ANALYZE • CONNECT • GROW';
    }
  });

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadTargetMode, setUploadTargetMode] = useState<'light' | 'dark' | 'both'>('light');

  // Compute active logo (light mode is the permanent system standard)
  const activeLogoUrl = lightLogoUrl || darkLogoUrl;

  const hasCustomLogo = Boolean(lightLogoUrl || darkLogoUrl);

  const uploadLightLogo = (dataUrl: string) => {
    try {
      localStorage.setItem(LIGHT_LOGO_KEY, dataUrl);
      setLightLogoUrl(dataUrl);
    } catch (e) {
      console.error('Failed to save light logo:', e);
    }
  };

  const uploadDarkLogo = (dataUrl: string) => {
    try {
      localStorage.setItem(DARK_LOGO_KEY, dataUrl);
      setDarkLogoUrl(dataUrl);
    } catch (e) {
      console.error('Failed to save dark logo:', e);
    }
  };

  const uploadCustomLogo = (dataUrl: string, targetMode?: 'light' | 'dark' | 'both') => {
    const mode = targetMode || uploadTargetMode || 'light';
    if (mode === 'dark') {
      uploadDarkLogo(dataUrl);
    } else if (mode === 'light') {
      uploadLightLogo(dataUrl);
    } else {
      uploadLightLogo(dataUrl);
      uploadDarkLogo(dataUrl);
    }
    // Also save legacy key for backward fallback
    try {
      localStorage.setItem(LEGACY_STORAGE_KEY, dataUrl);
    } catch {
      // ignore
    }
  };

  const removeLightLogo = () => {
    try {
      localStorage.removeItem(LIGHT_LOGO_KEY);
      setLightLogoUrl(null);
    } catch (e) {
      console.error('Failed to remove light logo:', e);
    }
  };

  const removeDarkLogo = () => {
    try {
      localStorage.removeItem(DARK_LOGO_KEY);
      setDarkLogoUrl(null);
    } catch (e) {
      console.error('Failed to remove dark logo:', e);
    }
  };

  const removeCustomLogo = (targetMode?: 'light' | 'dark' | 'all' | 'both') => {
    if (targetMode === 'light') {
      removeLightLogo();
    } else if (targetMode === 'dark') {
      removeDarkLogo();
    } else {
      removeLightLogo();
      removeDarkLogo();
      try {
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      } catch {
        // ignore
      }
    }
  };

  const openUploadModal = (initialMode?: 'light' | 'dark' | 'both') => {
    if (initialMode) {
      setUploadTargetMode(initialMode);
    } else {
      setUploadTargetMode('light');
    }
    setIsUploadModalOpen(true);
  };

  const closeUploadModal = () => setIsUploadModalOpen(false);

  return (
    <BrandContext.Provider
      value={{
        lightLogoUrl,
        darkLogoUrl,
        activeLogoUrl,
        customLogoUrl: activeLogoUrl,
        hasCustomLogo,
        brandName,
        tagline,
        uploadLightLogo,
        uploadDarkLogo,
        uploadCustomLogo,
        removeLightLogo,
        removeDarkLogo,
        removeCustomLogo,
        isUploadModalOpen,
        uploadTargetMode,
        setUploadTargetMode,
        openUploadModal,
        closeUploadModal,
      }}
    >
      {children}
    </BrandContext.Provider>
  );
};

export const useBrand = () => {
  const context = useContext(BrandContext);
  if (!context) {
    throw new Error('useBrand must be used within a BrandProvider');
  }
  return context;
};
