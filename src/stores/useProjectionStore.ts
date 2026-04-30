import { create } from 'zustand';
import type { ProjectionInput, ProjectionResult } from '../lib/projections';
import { runProjection } from '../lib/projections';

interface ProjectionState {
  baseline: ProjectionResult | null;
  scenarios: Record<string, ProjectionResult>;
  isComputing: boolean;
  lastComputedAt: Date | null;
  invalidate: () => void;
  compute: (input: ProjectionInput, scenarioId?: string) => Promise<void>;
}

export const useProjectionStore = create<ProjectionState>((set, get) => ({
  baseline: null,
  scenarios: {},
  isComputing: false,
  lastComputedAt: null,
  invalidate: () => set({ baseline: null, scenarios: {}, lastComputedAt: null }),
  compute: async (input, scenarioId) => {
    set({ isComputing: true });
    // Run in next tick to allow UI to update
    await new Promise(r => setTimeout(r, 0));
    try {
      const result = runProjection(input);
      if (scenarioId) {
        set(s => ({
          scenarios: { ...s.scenarios, [scenarioId]: result },
          isComputing: false,
          lastComputedAt: new Date(),
        }));
      } else {
        set({ baseline: result, isComputing: false, lastComputedAt: new Date() });
      }
    } catch (e) {
      set({ isComputing: false });
      console.error('Projection failed', e);
    }
  },
}));
