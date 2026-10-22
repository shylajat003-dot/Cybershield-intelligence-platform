import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeId = 'light-professional' | 'cyber-blue' | 'emerald-soc' | 'purple-intelligence';

export interface Theme {
  id: ThemeId;
  label: string;
  swatch: string;
}

export const THEMES: Theme[] = [
  { id: 'light-professional',  label: 'Light Professional',  swatch: '#2563eb' },
  { id: 'cyber-blue',          label: 'Cyber Dark',          swatch: '#3b82f6' },
  { id: 'emerald-soc',         label: 'Emerald SOC',         swatch: '#10b981' },
  { id: 'purple-intelligence', label: 'Purple Intelligence', swatch: '#8b5cf6' },
];

const STORAGE_KEY = 'cybershield_theme';
const MIGRATION_KEY = 'cybershield_theme_migrated_light_v4';
const DEFAULT_THEME: ThemeId = 'light-professional';

interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (id: ThemeId) => void;
  themes: Theme[];
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  setTheme: () => {},
  themes: THEMES,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    const hasMigrated = localStorage.getItem(MIGRATION_KEY);
    if (!hasMigrated) {
      localStorage.setItem(MIGRATION_KEY, 'true');
      localStorage.setItem(STORAGE_KEY, DEFAULT_THEME);
      return DEFAULT_THEME;
    }
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
    return stored && THEMES.find(t => t.id === stored) ? stored : DEFAULT_THEME;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = (id: ThemeId) => setThemeState(id);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);