import type { SessionInfo } from '@/types';

interface MinimumViewProps {
  sessions: SessionInfo[];
}

export const MinimumView = ({ sessions }: MinimumViewProps) => {
  const waitingCount = sessions.filter(
    (s) => s.status === 'WaitingPermission' || s.status === 'WaitingInput'
  ).length;
  const activeCount = sessions.filter((s) => s.status === 'Active').length;

  const isWaiting = waitingCount > 0;

  return (
    <div className="container bg-bg-primary h-screen rounded-xl max-w-[900px] mx-auto flex flex-col p-2.5">
      <header className="flex justify-between items-center py-1.5 shrink-0">
        <h1 className="font-semibold text-sm whitespace-nowrap">Eyes on Claude Code</h1>
        <div className="flex items-center gap-2 bg-bg-card rounded-full py-0.5 px-2 text-[0.625rem] whitespace-nowrap shrink-0">
          <div
            className={`w-2 h-2 rounded-full bg-success ${isWaiting ? 'bg-warning animate-pulse-slow' : ''}`}
          />
          <span>
            {isWaiting ? `${waitingCount} waiting` : activeCount > 0 ? `${activeCount} active` : 'Idle'}
          </span>
        </div>
      </header>
    </div>
  );
};
