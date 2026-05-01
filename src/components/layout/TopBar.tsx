import { useLocation } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';

const PAGE_TITLES: Record<string, string> = {
  '/today': 'Today',
  '/money': 'Accounts',
  '/money/transactions': 'Transactions',
  '/money/cashflow': 'Cash Flow',
  '/money/budgets': 'Budgets',
  '/wealth': 'Net Worth',
  '/wealth/investments': 'Investments',
  '/wealth/assets': 'Assets',
  '/wealth/liabilities': 'Liabilities',
  '/wealth/insurance': 'Insurance',
  '/wealth/pensions': 'Pensions',
  '/future': 'Projection',
  '/future/goals': 'Goals',
  '/future/scenarios': 'Scenarios',
  '/future/stresstests': 'Stress Tests',
  '/future/timeline': 'Life Events',
  '/insights': 'Recommendations',
  '/insights/review': 'Monthly Review',
  '/insights/subscriptions': 'Subscriptions',
  '/library': 'Settings',
  '/library/categories': 'Categories',
  '/library/people': 'People',
  '/library/auditlog': 'Audit Log',
  '/library/export': 'Export',
};

export function TopBar({ actions }: { actions?: React.ReactNode }) {
  const { pathname } = useLocation();
  const title = PAGE_TITLES[pathname] || 'Atlas';
  const setQuickUpdateOpen = useAppStore((s) => s.setQuickUpdateOpen);
  return (
    <div className="h-14 border-b border-border bg-surface/80 backdrop-blur-md supports-[backdrop-filter]:bg-surface/70 flex items-center justify-between px-6 flex-shrink-0 sticky top-0 z-20">
      <h1 className="text-base font-bold tracking-tight text-text-primary">{title}</h1>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setQuickUpdateOpen(true)}
          aria-label="Quick update balances"
          title="Quick Update"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-text-secondary hover:bg-surface-raised hover:text-text-primary transition-colors"
        >
          <RefreshCw size={13} />
          <span className="hidden sm:inline">Quick Update</span>
        </button>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
