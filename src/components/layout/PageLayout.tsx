import { TopBar } from './TopBar';

interface PageLayoutProps { actions?: React.ReactNode; children: React.ReactNode; className?: string; }

export function PageLayout({ actions, children, className }: PageLayoutProps) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar actions={actions} />
      <div className="flex-1 overflow-y-auto">
        <div className={className ?? 'p-6'}>{children}</div>
      </div>
    </div>
  );
}
