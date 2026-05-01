import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Home, Wallet, ArrowLeftRight, BarChart2, PieChart,
  TrendingUp, LineChart, Building2, CreditCard, Shield, Landmark,
  Telescope, Target, GitBranch, Zap, CalendarRange,
  Lightbulb, FileText, RefreshCw, Settings, Tag, Users,
  ClipboardList, Download, Sun, Moon, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { cn } from '../../lib/utils';

interface NavItem { label: string; to: string; icon: React.ReactNode; end?: boolean; }
interface NavSection { title: string; items: NavItem[]; }

const NAV: NavSection[] = [
  { title: '', items: [{ label: 'Today', to: '/today', icon: <Home size={16} />, end: true }] },
  { title: 'Money', items: [
    { label: 'Accounts', to: '/money', icon: <Wallet size={16} />, end: true },
    { label: 'Transactions', to: '/money/transactions', icon: <ArrowLeftRight size={16} /> },
    { label: 'Cash Flow', to: '/money/cashflow', icon: <BarChart2 size={16} /> },
    { label: 'Budgets', to: '/money/budgets', icon: <PieChart size={16} /> },
  ]},
  { title: 'Wealth', items: [
    { label: 'Net Worth', to: '/wealth', icon: <TrendingUp size={16} />, end: true },
    { label: 'Investments', to: '/wealth/investments', icon: <LineChart size={16} /> },
    { label: 'Assets', to: '/wealth/assets', icon: <Building2 size={16} /> },
    { label: 'Liabilities', to: '/wealth/liabilities', icon: <CreditCard size={16} /> },
    { label: 'Insurance', to: '/wealth/insurance', icon: <Shield size={16} /> },
    { label: 'Pensions', to: '/wealth/pensions', icon: <Landmark size={16} /> },
  ]},
  { title: 'Future', items: [
    { label: 'Projection', to: '/future', icon: <Telescope size={16} />, end: true },
    { label: 'Goals', to: '/future/goals', icon: <Target size={16} /> },
    { label: 'Scenarios', to: '/future/scenarios', icon: <GitBranch size={16} /> },
    { label: 'Stress Tests', to: '/future/stresstests', icon: <Zap size={16} /> },
    { label: 'Timeline', to: '/future/timeline', icon: <CalendarRange size={16} /> },
  ]},
  { title: 'Insights', items: [
    { label: 'Recommendations', to: '/insights', icon: <Lightbulb size={16} />, end: true },
    { label: 'Monthly Review', to: '/insights/review', icon: <FileText size={16} /> },
    { label: 'Subscriptions', to: '/insights/subscriptions', icon: <RefreshCw size={16} /> },
  ]},
  { title: 'Library', items: [
    { label: 'Settings', to: '/library', icon: <Settings size={16} />, end: true },
    { label: 'Categories', to: '/library/categories', icon: <Tag size={16} /> },
    { label: 'People', to: '/library/people', icon: <Users size={16} /> },
    { label: 'Audit Log', to: '/library/auditlog', icon: <ClipboardList size={16} /> },
    { label: 'Export', to: '/library/export', icon: <Download size={16} /> },
  ]},
];

export function Sidebar() {
  const { resolvedTheme, setTheme, sidebarCollapsed, setSidebarCollapsed } = useAppStore();
  const collapsed = sidebarCollapsed;

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      className="hidden md:flex flex-col h-full bg-surface border-r border-border flex-shrink-0 overflow-hidden"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-border flex-shrink-0">
        <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
          <MapPin size={16} className="text-white" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="font-semibold text-text-primary text-base whitespace-nowrap">
              Atlas
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {NAV.map((section, si) => (
          <div key={si} className={si > 0 ? 'pt-3' : ''}>
            <AnimatePresence>
              {!collapsed && section.title && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
                  {section.title}
                </motion.p>
              )}
            </AnimatePresence>
            {section.items.map(item => (
              <NavLink
                key={item.to} to={item.to} end={item.end}
                className={({ isActive }) => cn(
                  'relative flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors duration-150 group',
                  'before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:rounded-r-full before:bg-accent before:transition-all before:duration-200',
                  isActive
                    ? 'bg-surface-raised/60 text-text-primary font-semibold before:h-5 before:opacity-100'
                    : 'text-text-secondary hover:bg-surface-raised hover:text-text-primary before:h-0 before:opacity-0'
                )}
                title={collapsed ? item.label : undefined}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="whitespace-nowrap">
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="p-2 border-t border-border space-y-1 flex-shrink-0">
        <button
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          aria-label="Toggle theme"
          className="flex items-center gap-2.5 w-full px-2 py-2 rounded-lg text-sm text-text-secondary hover:bg-surface-raised hover:text-text-primary transition-colors"
        >
          {resolvedTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          <AnimatePresence>
            {!collapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="whitespace-nowrap text-xs">
                {resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode'}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
        <button
          onClick={() => setSidebarCollapsed(!collapsed)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="flex items-center gap-2.5 w-full px-2 py-2 rounded-lg text-sm text-text-secondary hover:bg-surface-raised hover:text-text-primary transition-colors"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          <AnimatePresence>
            {!collapsed && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="whitespace-nowrap text-xs">Collapse</motion.span>}
          </AnimatePresence>
        </button>
        {!collapsed && <p className="px-2 py-1 text-[10px] text-text-tertiary">v1.0.0</p>}
      </div>
    </motion.aside>
  );
}
