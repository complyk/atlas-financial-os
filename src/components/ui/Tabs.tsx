import { cn } from '../../lib/utils';
interface Tab { id: string; label: string; count?: number; }
interface TabsProps { tabs: Tab[]; activeTab: string; onChange: (id: string) => void; className?: string; }
export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
  return (
    <div className={cn('flex rounded-xl bg-surface-raised p-1 gap-1', className)} role="tablist">
      {tabs.map(tab => (
        <button key={tab.id} role="tab" aria-selected={activeTab === tab.id} onClick={() => onChange(tab.id)}
          className={cn('flex-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-150 inline-flex items-center justify-center gap-1.5',
            activeTab === tab.id ? 'bg-surface text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary')}>
          {tab.label}
          {tab.count !== undefined && <span className={cn('text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center', activeTab === tab.id ? 'bg-accent-light text-accent' : 'bg-border text-text-tertiary')}>{tab.count}</span>}
        </button>
      ))}
    </div>
  );
}
