import { useState } from 'react';
import { cn } from '../../lib/utils';
interface TooltipProps { content: string; children: React.ReactNode; side?: 'top' | 'bottom' | 'left' | 'right'; }
export function Tooltip({ content, children, side = 'top' }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const positions = { top: 'bottom-full left-1/2 -translate-x-1/2 mb-2', bottom: 'top-full left-1/2 -translate-x-1/2 mt-2', left: 'right-full top-1/2 -translate-y-1/2 mr-2', right: 'left-full top-1/2 -translate-y-1/2 ml-2' };
  return (
    <div className="relative inline-flex" onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
      {children}
      {visible && <div className={cn('absolute z-50 px-2 py-1 text-xs text-white bg-gray-900 dark:bg-gray-700 rounded-lg whitespace-nowrap pointer-events-none shadow-lg', positions[side])}>{content}</div>}
    </div>
  );
}
