import React, { createContext, useContext, useEffect, useState } from 'react';
import { useDatabase } from './useDatabase';

export type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');
  const { saveSettings, loadSettings } = useDatabase();

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const settings = await loadSettings();
      if (settings?.theme) {
        setThemeState(settings.theme as Theme);
      }
    } catch (error) {
      console.error('Failed to load theme:', error);
    }
  };

  const setTheme = async (newTheme: Theme) => {
    try {
      const settings = await loadSettings();
      await saveSettings({ ...settings, theme: newTheme });
      setThemeState(newTheme);
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export const lightTheme = {
  colors: {
    background: ['#f8fafc', '#f1f5f9'],
    card: '#ffffff',
    cardBorder: '#e2e8f0',
    text: '#0f172a',
    textSecondary: '#64748b',
    primary: '#2563eb',
    success: '#16a34a',
    warning: '#ca8a04',
    error: '#dc2626',
    progressBackground: '#e2e8f0',
    progressInner: '#ffffff',
    progressBorder: '#f1f5f9',
  },
};

export const darkTheme = {
  colors: {
    background: ['#1e293b', '#0f172a'],
    card: '#1e293b',
    cardBorder: '#334155',
    text: '#ffffff',
    textSecondary: '#94a3b8',
    primary: '#2563eb',
    success: '#22c55e',
    warning: '#eab308',
    error: '#ef4444',
    progressBackground: '#1e293b',
    progressInner: '#0f172a',
    progressBorder: '#1e293b',
  },
};