import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { db } from '../db/schema';

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
  quickUpdateOpen: boolean;
  setTheme: (t: Theme) => void;
  setDensity: (d: Density) => void;
  setCurrency: (c: string) => void;
  setLocale: (l: string) => void;
  setSidebarCollapsed: (v: boolean) => void;
  setQuickUpdateOpen: (v: boolean) => void;
  resolveTheme: () => void;
  initFromDB: () => Promise<void>;
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
      quickUpdateOpen: false,
      setTheme: (theme) => {
        set({ theme });
        get().resolveTheme();
      },
      setDensity: (density) => set({ density }),
      setCurrency: (currency) => set({ currency }),
      setLocale: (locale) => set({ locale }),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      setQuickUpdateOpen: (v) => set({ quickUpdateOpen: v }),
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
      initFromDB: async () => {
        try {
          const settings = await db.settings.get('singleton');
          if (!settings) return;
          const patch: Partial<AppState> = {};
          if (settings.currency) patch.currency = settings.currency;
          if (settings.locale) patch.locale = settings.locale;
          if (settings.theme) patch.theme = settings.theme;
          if (settings.density) patch.density = settings.density;
          set(patch);
          get().resolveTheme();
        } catch {
          // ignore — DB may not be ready or not seeded yet
        }
      },
    }),
    {
      name: 'atlas-app-store',
      partialize: (s) => ({
        theme: s.theme,
        density: s.density,
        currency: s.currency,
        locale: s.locale,
        sidebarCollapsed: s.sidebarCollapsed,
      }),
    }
  )
);
