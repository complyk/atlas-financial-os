import { useLocation } from 'react-router-dom';

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
  return (
    <div className="h-14 border-b border-border bg-surface flex items-center justify-between px-6 flex-shrink-0">
      <h1 className="text-base font-semibold text-text-primary">{title}</h1>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
