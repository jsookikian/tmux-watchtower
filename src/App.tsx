import { useEffect, useState, useMemo, useRef } from 'react';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { getCurrentWindow, LogicalSize, LogicalPosition } from '@tauri-apps/api/window';
import { AppProvider } from '@/context/AppContext';
import { useAppContext } from '@/context/useAppContext';
import { useWindowOpacity } from '@/hooks/useWindowOpacity';
import { useWindowDrag } from '@/hooks/useWindowDrag';
import { Header } from '@/components/Header';
import { MinimumView } from '@/components/MinimumView';
import { SessionList } from '@/components/SessionList';
import { SetupModal } from '@/components/SetupModal';
import { TmuxViewer } from '@/components/TmuxViewer';
import {
  onWindowFocus,
  bringDiffWindowsToFront,
  getSetupStatus,
  setWindowSizeForSetup,
} from '@/lib/tauri';
import { allHooksConfigured } from '@/lib/utils';
import type { SetupStatus } from '@/types';

const MINIMUM_VIEW_HEIGHT = 50;
const MINIMUM_VIEW_WIDTH = 240;

interface SavedWindowState {
  width: number;
  height: number;
  x: number;
  y: number;
}

const Dashboard = () => {
  const { dashboardData, settings, isLoading, refreshData } = useAppContext();
  const [isActive, setIsActive] = useState(true);
  const savedStateRef = useRef<SavedWindowState | null>(null);

  // Always apply mini-view class to body
  useEffect(() => {
    document.body.classList.add('mini-view');
    return () => {
      document.body.classList.remove('mini-view');
    };
  }, []);

  // Track window active state for minimum mode
  useEffect(() => {
    let unlisten: UnlistenFn | undefined;

    // Listen for dashboard-active event
    listen<boolean>('dashboard-active', (event) => {
      setIsActive(event.payload);
    }).then((u) => {
      unlisten = u;
    });

    // Set initial state
    getCurrentWindow()
      .isFocused()
      .then(setIsActive)
      .catch(console.error);

    return () => unlisten?.();
  }, []);

  // Resize window based on active state
  useEffect(() => {
    const window = getCurrentWindow();

    const resizeWindow = async () => {
      const scaleFactor = await window.scaleFactor();

      if (isActive) {
        // Restore to previous size and position
        const saved = savedStateRef.current;
        if (saved) {
          await window.setSize(new LogicalSize(saved.width, saved.height));
          await window.setPosition(new LogicalPosition(saved.x, saved.y));
        }
      } else {
        // Save current size and position before minimizing
        const [physicalSize, physicalPosition] = await Promise.all([
          window.innerSize(),
          window.outerPosition(),
        ]);

        // Convert physical to logical pixels
        savedStateRef.current = {
          width: physicalSize.width / scaleFactor,
          height: physicalSize.height / scaleFactor,
          x: physicalPosition.x / scaleFactor,
          y: physicalPosition.y / scaleFactor,
        };

        await window.setSize(new LogicalSize(MINIMUM_VIEW_WIDTH, MINIMUM_VIEW_HEIGHT));
      }
    };

    resizeWindow().catch(console.error);
  }, [isActive]);

  // Handle window opacity based on focus
  useWindowOpacity(settings.opacity_active, settings.opacity_inactive);

  // Handle window drag
  useWindowDrag();

  // Bring diff windows to front when dashboard is focused (via Cmd+Tab etc.)
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    onWindowFocus(() => {
      bringDiffWindowsToFront().catch(console.error);
    }).then((u) => {
      unlisten = u;
    });
    return () => unlisten?.();
  }, []);

  if (isLoading) {
    return (
      <div className="container bg-bg-primary h-screen rounded-xl max-w-[900px] mx-auto p-2.5 flex items-center justify-center">
        <div className="text-text-secondary">Loading...</div>
      </div>
    );
  }

  // Show minimum view when inactive
  if (!isActive) {
    return <MinimumView sessions={dashboardData.sessions} />;
  }

  return (
    <div className="container bg-bg-primary h-screen rounded-xl max-w-[900px] mx-auto flex flex-col p-2.5">
      <Header sessions={dashboardData.sessions} onRefresh={refreshData} />
      <SessionList sessions={dashboardData.sessions} />
    </div>
  );
};

function App() {
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [setupChecked, setSetupChecked] = useState(false);

  // Parse URL parameters to check if this is a tmux viewer window
  const tmuxPaneId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tmux_pane');
  }, []);

  // Check setup status on mount (skip for tmux viewer windows)
  useEffect(() => {
    // Skip for tmux viewer windows - they render before this check
    if (tmuxPaneId) return;

    getSetupStatus()
      .then((status) => {
        setSetupStatus(status);
        // Show modal if any hook is missing or there's an init error
        if (!allHooksConfigured(status.hooks) || status.init_error) {
          setShowSetupModal(true);
          // Enlarge window for setup modal
          setWindowSizeForSetup(true).catch(console.error);
        }
        setSetupChecked(true);
      })
      .catch((err) => {
        console.error('Failed to get setup status:', err);
        setSetupChecked(true);
      });
  }, [tmuxPaneId]);

  const handleSetupComplete = () => {
    setShowSetupModal(false);
    // Restore miniview size
    setWindowSizeForSetup(false).catch(console.error);
  };

  // Render tmux viewer if pane_id is in URL
  if (tmuxPaneId) {
    return <TmuxViewer paneId={tmuxPaneId} />;
  }

  // Wait for setup check before showing anything
  if (!setupChecked) {
    return (
      <div className="bg-bg-primary h-screen flex items-center justify-center">
        <div className="text-text-secondary">Checking setup...</div>
      </div>
    );
  }

  return (
    <AppProvider>
      <Dashboard />
      {showSetupModal && setupStatus && (
        <SetupModal setupStatus={setupStatus} onComplete={handleSetupComplete} />
      )}
    </AppProvider>
  );
}

export default App;
