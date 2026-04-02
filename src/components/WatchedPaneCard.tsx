import { useState } from 'react';
import type { WatchedPaneInfo, WatchedPaneStatus } from '@/types';
import { openTmuxViewer, removeWatchedPane } from '@/lib/tauri';
import { ChevronDownIcon } from './icons';

interface WatchedPaneCardProps {
  pane: WatchedPaneInfo;
}

const statusBadge = (status: WatchedPaneStatus) => {
  switch (status) {
    case 'running':
      return <span className="text-base leading-none shrink-0" title="Running">✅</span>;
    case 'errored':
      return <span className="text-base leading-none shrink-0 animate-pulse" title="Error">❌</span>;
    case 'idle':
      return <span className="text-base leading-none shrink-0" title="Building">🔨</span>;
    case 'unreachable':
      return <span className="text-base leading-none shrink-0" title="Unreachable">⚠️</span>;
  }
};

const statusLabel = (status: WatchedPaneStatus) => {
  switch (status) {
    case 'running':
      return <span className="text-success text-[0.5rem]">Healthy</span>;
    case 'errored':
      return <span className="text-red-400 text-[0.5rem] animate-pulse">Error</span>;
    case 'idle':
      return <span className="text-yellow-400 text-[0.5rem]">Building...</span>;
    case 'unreachable':
      return <span className="text-warning text-[0.5rem]">Unreachable</span>;
  }
};

const borderColor = (status: WatchedPaneStatus) => {
  switch (status) {
    case 'running':
      return 'border-l-4 border-success';
    case 'errored':
      return 'border-l-4 border-red-500';
    case 'idle':
      return 'border-l-4 border-bg-card';
    case 'unreachable':
      return 'border-l-4 border-warning';
  }
};

export const WatchedPaneCard = ({ pane }: WatchedPaneCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenTerminal = async () => {
    try {
      setError(null);
      await openTmuxViewer(pane.config.pane_id);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Failed to open terminal: ${message}`);
    }
  };

  const handleRemove = async () => {
    try {
      setError(null);
      await removeWatchedPane(pane.config.pane_id);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Failed to remove pane: ${message}`);
    }
  };

  return (
    <div
      className={`bg-bg-secondary rounded-xl transition-all hover:shadow-lg hover:shadow-black/30 ${borderColor(pane.status)} overflow-hidden`}
    >
      <div
        className="flex items-center p-2 gap-2 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {statusBadge(pane.status)}
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="font-semibold truncate text-xs">{pane.config.label}</div>
          {statusLabel(pane.status)}
        </div>
        <div
          className={`w-4 h-4 flex items-center justify-center transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
        >
          <ChevronDownIcon className="text-text-secondary w-3 h-3" />
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-bg-card px-2 py-2 space-y-1.5">
          {error && (
            <div className="text-red-400 bg-red-400/10 rounded px-2 py-1 text-[0.625rem] flex items-center justify-between">
              <span className="truncate">{error}</span>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-300 ml-1 shrink-0"
              >
                ×
              </button>
            </div>
          )}

          {pane.last_output_snippet && (
            <div className="bg-bg-card rounded p-1.5">
              <pre className="text-[0.5rem] font-mono text-text-secondary whitespace-pre-wrap break-all leading-relaxed">
                {pane.last_output_snippet}
              </pre>
            </div>
          )}

          <div className="pt-1 border-t border-bg-card flex gap-1.5">
            <button
              onClick={handleOpenTerminal}
              className="flex-1 py-1 px-2 text-[0.625rem] text-text-secondary hover:text-white hover:bg-white/10 rounded transition-colors"
            >
              Open Terminal
            </button>
            <button
              onClick={handleRemove}
              className="flex-1 py-1 px-2 text-[0.625rem] text-text-secondary hover:text-white hover:bg-red-500/20 rounded transition-colors"
            >
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
