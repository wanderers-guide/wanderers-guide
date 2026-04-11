import { useRef } from 'react';

export function useSwipeGesture(options: {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
}) {
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    touchStart.current = null;

    if (Math.abs(dx) < (options.threshold ?? 50)) return;
    if (Math.abs(dx) < Math.abs(dy)) return; // primarily vertical — ignore

    if (dx < 0) options.onSwipeLeft?.();
    else options.onSwipeRight?.();
  };

  return { onTouchStart, onTouchEnd };
}
