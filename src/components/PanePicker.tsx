import { useState, useEffect, useCallback } from 'react';
import type { TmuxPane, WatchedPaneConfig } from '@/types';
import { listAvailablePanes, addWatchedPane } from '@/lib/tauri';

type Preset = 'Dev Server' | 'Build Watcher' | 'Test Runner' | 'Custom';

const PRESETS: Record<Exclude<Preset, 'Custom'>, { error: string[]; success: string[] }> = {
  'Dev Server': {
    error: ['(?i)\\berror\\b', 'EADDRINUSE', 'ERR!'],
    success: ['compiled successfully', 'ready on', 'listening on', '(?i)server running'],
  },
  'Build Watcher': {
    error: ['(?i)\\berror\\b', '(?i)\\bfailed\\b'],
    success: ['compiled successfully', 'Successfully compiled', 'watcher is ready', 'watching for', 'built in'],
  },
  'Test Runner': {
    error: ['(?i)\\bfail(ed)?\\b'],
    success: ['passed', 'All specs passed'],
  },
};

interface PanePickerProps {
  onClose: () => void;
}

export const PanePicker = ({ onClose }: PanePickerProps) => {
  const [panes, setPanes] = useState<TmuxPane[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPane, setSelectedPane] = useState<TmuxPane | null>(null);
  const [label, setLabel] = useState('');
  const [preset, setPreset] = useState<Preset>('Dev Server');
  const [customError, setCustomError] = useState('');
  const [customSuccess, setCustomSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    listAvailablePanes()
      .then((p) => {
        setPanes(p);
        setIsLoading(false);
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        setError(`Failed to list panes: ${message}`);
        setIsLoading(false);
      });
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleSelectPane = (pane: TmuxPane) => {
    setSelectedPane(pane);
    setLabel(pane.pane_title && pane.pane_title !== pane.session_name ? pane.pane_title : pane.window_name);
  };

  const handleAdd = async () => {
    if (!selectedPane || !label.trim()) return;

    let errorPatterns: string[];
    let successPatterns: string[];

    if (preset === 'Custom') {
      errorPatterns = customError
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      successPatterns = customSuccess
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    } else {
      errorPatterns = PRESETS[preset].error;
      successPatterns = PRESETS[preset].success;
    }

    const config: WatchedPaneConfig = {
      pane_id: selectedPane.pane_id,
      label: label.trim(),
      error_patterns: errorPatterns,
      success_patterns: successPatterns,
    };

    setIsSubmitting(true);
    try {
      await addWatchedPane(config);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Failed to add pane: ${message}`);
      setIsSubmitting(false);
    }
  };

  const groupedPanes = panes.reduce<Record<string, TmuxPane[]>>((acc, pane) => {
    const key = pane.session_name;
    if (!acc[key]) acc[key] = [];
    acc[key].push(pane);
    return acc;
  }, {});

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-bg-primary rounded-xl w-72 max-h-[80vh] flex flex-col shadow-2xl border border-bg-card overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-bg-card shrink-0">
          <span className="text-xs font-semibold">Add Watched Pane</span>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-white text-sm leading-none"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
          {error && (
            <div className="text-red-400 bg-red-400/10 rounded px-2 py-1 text-[0.625rem]">
              {error}
            </div>
          )}

          <div>
            <div className="text-[0.625rem] text-text-secondary mb-1.5 font-semibold uppercase tracking-wider">
              Select Pane
            </div>
            {isLoading ? (
              <div className="text-[0.625rem] text-text-secondary">Loading panes...</div>
            ) : panes.length === 0 ? (
              <div className="text-[0.625rem] text-text-secondary">No available panes</div>
            ) : (
              <div className="flex flex-col gap-1">
                {Object.entries(groupedPanes).map(([sessionName, sessionPanes]) => (
                  <div key={sessionName}>
                    <div className="text-[0.5rem] text-text-secondary px-1 py-0.5 uppercase tracking-wider">
                      {sessionName}
                    </div>
                    {sessionPanes.map((pane) => (
                      <button
                        key={pane.pane_id}
                        onClick={() => handleSelectPane(pane)}
                        className={`w-full text-left px-2 py-1 rounded text-[0.625rem] transition-colors ${
                          selectedPane?.pane_id === pane.pane_id
                            ? 'bg-success/20 text-white'
                            : 'bg-bg-secondary hover:bg-bg-card text-text-secondary hover:text-white'
                        }`}
                      >
                        <span className="font-semibold">
                          {pane.pane_title && pane.pane_title !== pane.session_name
                            ? pane.pane_title
                            : pane.window_name}
                        </span>
                        {pane.is_active && (
                          <span className="ml-1 text-success text-[0.5rem]">●</span>
                        )}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedPane && (
            <>
              <div>
                <div className="text-[0.625rem] text-text-secondary mb-1 font-semibold uppercase tracking-wider">
                  Label
                </div>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="w-full bg-bg-secondary rounded px-2 py-1 text-[0.625rem] text-white outline-none focus:ring-1 focus:ring-success/50"
                  placeholder="e.g. config-frontend dev"
                />
              </div>

              <div>
                <div className="text-[0.625rem] text-text-secondary mb-1 font-semibold uppercase tracking-wider">
                  Pattern Preset
                </div>
                <div className="flex flex-wrap gap-1">
                  {(['Dev Server', 'Build Watcher', 'Test Runner', 'Custom'] as Preset[]).map(
                    (p) => (
                      <button
                        key={p}
                        onClick={() => setPreset(p)}
                        className={`px-2 py-0.5 rounded text-[0.5rem] transition-colors ${
                          preset === p
                            ? 'bg-success/20 text-white'
                            : 'bg-bg-secondary text-text-secondary hover:text-white hover:bg-bg-card'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                </div>
              </div>

              {preset === 'Custom' && (
                <div className="space-y-2">
                  <div>
                    <div className="text-[0.625rem] text-text-secondary mb-1">
                      Error patterns (comma-separated regex)
                    </div>
                    <textarea
                      value={customError}
                      onChange={(e) => setCustomError(e.target.value)}
                      rows={2}
                      className="w-full bg-bg-secondary rounded px-2 py-1 text-[0.5rem] font-mono text-white outline-none focus:ring-1 focus:ring-success/50 resize-none"
                      placeholder="(?i)\berror\b, ERR!"
                    />
                  </div>
                  <div>
                    <div className="text-[0.625rem] text-text-secondary mb-1">
                      Success patterns (comma-separated regex)
                    </div>
                    <textarea
                      value={customSuccess}
                      onChange={(e) => setCustomSuccess(e.target.value)}
                      rows={2}
                      className="w-full bg-bg-secondary rounded px-2 py-1 text-[0.5rem] font-mono text-white outline-none focus:ring-1 focus:ring-success/50 resize-none"
                      placeholder="compiled successfully, ready on"
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-3 py-2 border-t border-bg-card shrink-0 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-1 text-[0.625rem] text-text-secondary hover:text-white bg-bg-secondary hover:bg-bg-card rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!selectedPane || !label.trim() || isSubmitting}
            className="flex-1 py-1 text-[0.625rem] text-white bg-success/80 hover:bg-success rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Adding...' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
};
