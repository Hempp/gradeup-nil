'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'gradeup-theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
  const mountedRef = useRef(false);

  // Load saved theme on mount
  useEffect(() => {
    mountedRef.current = true;
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    if (saved && ['light', 'dark', 'system'].includes(saved)) {
      setThemeState(saved);
    }
  }, []);

  // Apply theme changes
  useEffect(() => {
    if (!mountedRef.current) return;

    const root = document.documentElement;

    const applyTheme = (isDark: boolean) => {
      root.classList.toggle('dark', isDark);
      setResolvedTheme(isDark ? 'dark' : 'light');

      // Update meta theme-color for mobile browsers
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', isDark ? '#0a0a0a' : '#f8fafc');
      }
    };

    if (theme === 'system') {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(media.matches);

      const handler = (e: MediaQueryListEvent) => applyTheme(e.matches);
      media.addEventListener('change', handler);
      return () => media.removeEventListener('change', handler);
    } else {
      applyTheme(theme === 'dark');
    }
  }, [theme]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
  }, []);

  // Prevent hydration mismatch by not rendering until mounted
  // But still provide the context value
  const value: ThemeContextType = {
    theme,
    setTheme,
    resolvedTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
