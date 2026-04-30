import { NavLink } from 'react-router-dom';
import { Home, Wallet, TrendingUp, Telescope, Lightbulb } from 'lucide-react';
import { cn } from '../../lib/utils';

const TABS = [
  { label: 'Today', to: '/today', icon: <Home size={20} />, end: true },
  { label: 'Money', to: '/money', icon: <Wallet size={20} />, end: true },
  { label: 'Wealth', to: '/wealth', icon: <TrendingUp size={20} />, end: true },
  { label: 'Future', to: '/future', icon: <Telescope size={20} />, end: true },
  { label: 'Insights', to: '/insights', icon: <Lightbulb size={20} />, end: true },
];

export function MobileNav() {
  return (
    <nav className="md:hidden flex items-center border-t border-border bg-surface h-16 flex-shrink-0">
      {TABS.map(tab => (
        <NavLink key={tab.to} to={tab.to} end={tab.end}
          className={({ isActive }) => cn(
            'flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
            isActive ? 'text-accent' : 'text-text-tertiary'
          )}>
          {tab.icon}
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
