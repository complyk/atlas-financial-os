import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';
type Density = 'comfortable' | 'compact';

interface AppState {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  density: Density;
  currency: string;
  secondaryCurrency: string;
  locale: string;
  sidebarCollapsed: boolean;
  setTheme: (t: Theme) => void;
  setDensity: (d: Density) => void;
  setCurrency: (c: string) => void;
  setSidebarCollapsed: (v: boolean) => void;
  resolveTheme: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      resolvedTheme: 'light',
      density: 'comfortable',
      currency: 'AED',
      secondaryCurrency: 'USD',
      locale: 'en-AE',
      sidebarCollapsed: false,
      setTheme: (theme) => {
        set({ theme });
        get().resolveTheme();
      },
      setDensity: (density) => set({ density }),
      setCurrency: (currency) => set({ currency }),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      resolveTheme: () => {
        const { theme } = get();
        let resolved: 'light' | 'dark';
        if (theme === 'system') {
          resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        } else {
          resolved = theme;
        }
        set({ resolvedTheme: resolved });
        document.documentElement.classList.toggle('dark', resolved === 'dark');
      },
    }),
    {
      name: 'atlas-app-store',
      partialize: (s) => ({
        theme: s.theme,
        density: s.density,
        currency: s.currency,
        sidebarCollapsed: s.sidebarCollapsed,
      }),
    }
  )
);
