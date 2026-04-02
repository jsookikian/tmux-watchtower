import type { WatchedPaneInfo } from '@/types';
import { WatchedPaneCard } from './WatchedPaneCard';

interface WatchedPaneListProps {
  panes: WatchedPaneInfo[];
}

export const WatchedPaneList = ({ panes }: WatchedPaneListProps) => {
  return (
    <div className="flex flex-col gap-2">
      {panes.map((pane) => (
        <WatchedPaneCard key={pane.config.pane_id} pane={pane} />
      ))}
    </div>
  );
};
