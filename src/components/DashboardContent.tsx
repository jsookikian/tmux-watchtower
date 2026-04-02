import { useState } from 'react';
import type { SessionInfo, WatchedPaneInfo } from '@/types';
import { SessionList } from './SessionList';
import { WatchedPaneList } from './WatchedPaneList';
import { PanePicker } from './PanePicker';

interface DashboardContentProps {
  sessions: SessionInfo[];
  watchedPanes: WatchedPaneInfo[];
}

export const DashboardContent = ({ sessions, watchedPanes }: DashboardContentProps) => {
  const [showPanePicker, setShowPanePicker] = useState(false);

  return (
    <div className="flex-1 overflow-y-scroll min-h-0">
      <div className="flex flex-col gap-2">
        <SessionList sessions={sessions} />

        <div className="flex flex-col gap-2 mt-1">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[0.625rem] text-text-secondary font-semibold uppercase tracking-wider">
              Watched Panes
            </span>
            <button
              onClick={() => setShowPanePicker(true)}
              className="text-[0.625rem] text-text-secondary hover:text-white px-1.5 py-0.5 bg-bg-secondary rounded hover:bg-white/10 transition-colors"
            >
              + Add Pane
            </button>
          </div>
          {watchedPanes.length > 0 && <WatchedPaneList panes={watchedPanes} />}
        </div>
      </div>

      {showPanePicker && <PanePicker onClose={() => setShowPanePicker(false)} />}
    </div>
  );
};
