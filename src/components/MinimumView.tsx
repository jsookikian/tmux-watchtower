import type { SessionInfo, WatchedPaneInfo } from '@/types';

interface MinimumViewProps {
  sessions: SessionInfo[];
  watchedPanes?: WatchedPaneInfo[];
}

export const MinimumView = ({ sessions, watchedPanes = [] }: MinimumViewProps) => {
  const activeCount = sessions.filter((s) => s.status === 'Active').length;
  const permissionCount = sessions.filter((s) => s.status === 'WaitingPermission').length;
  const inputCount = sessions.filter((s) => s.status === 'WaitingInput').length;
  const completedCount = sessions.filter((s) => s.status === 'Completed').length;
  const erroredPaneCount = watchedPanes.filter((p) => p.status === 'errored').length;

  const statusItems = [
    { emoji: '🟢', count: activeCount },
    { emoji: '🔐', count: permissionCount },
    { emoji: '⏳', count: inputCount },
    { emoji: '✅', count: completedCount },
    { emoji: '🔴', count: erroredPaneCount },
  ].filter((item) => item.count > 0);

  return (
    <div className="container bg-bg-primary h-screen rounded-xl max-w-[900px] mx-auto flex flex-col p-2.5">
      <header className="flex justify-between items-center py-1.5 shrink-0">
        <h1 className="font-semibold text-sm whitespace-nowrap">Watchtower</h1>
        <div className="flex items-center gap-2 text-[0.625rem] whitespace-nowrap shrink-0">
          {statusItems.length > 0 ? (
            statusItems.map(({ emoji, count }) => (
              <span key={emoji}>
                {emoji}:{count}
              </span>
            ))
          ) : (
            <span className="text-text-secondary">Idle</span>
          )}
        </div>
      </header>
    </div>
  );
};
