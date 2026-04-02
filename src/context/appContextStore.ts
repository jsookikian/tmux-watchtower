import { createContext } from 'react';
import type { DashboardData, Settings } from '@/types';

export interface AppContextValue {
  dashboardData: DashboardData;
  settings: Settings;
  isLoading: boolean;
  refreshData: () => Promise<void>;
}

export const defaultDashboardData: DashboardData = { sessions: [], events: [], watched_panes: [] };

export const defaultSettings: Settings = {
  always_on_top: true,
  minimum_mode_enabled: true,
  opacity_active: 1.0,
  opacity_inactive: 1.0,
  sound_enabled: true,
};

export const AppContext = createContext<AppContextValue | null>(null);
