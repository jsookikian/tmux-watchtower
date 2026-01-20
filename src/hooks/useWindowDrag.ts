import { useEffect } from 'react';

// Use global Tauri object (same as original implementation)
declare global {
  interface Window {
    __TAURI__?: {
      window?: {
        getCurrentWindow: () => {
          startDragging: () => Promise<void>;
        };
      };
    };
  }
}

export const useWindowDrag = () => {
  useEffect(() => {
    const handleMouseDown = async (e: MouseEvent) => {
      // Check for mini-view mode by checking DOM class
      if (!document.body.classList.contains('mini-view')) return;

      // Only handle clicks inside .container
      const container = (e.target as HTMLElement).closest('.container');
      if (!container) return;

      // Get appWindow fresh on each mousedown
      const appWindow = window.__TAURI__?.window?.getCurrentWindow();
      if (!appWindow) return;

      const target = e.target as HTMLElement;

      // Don't drag when clicking on buttons or interactive elements
      if (
        target.tagName === 'BUTTON' ||
        target.classList.contains('remove-btn') ||
        target.classList.contains('refresh-btn') ||
        target.closest('button') ||
        target.closest('.remove-btn')
      ) {
        return;
      }

      // Only left mouse button
      if (e.buttons === 1) {
        try {
          await appWindow.startDragging();
        } catch (error) {
          console.error('Failed to start dragging:', error);
        }
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);
};
