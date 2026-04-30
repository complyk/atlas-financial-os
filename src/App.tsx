import { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Sidebar } from './components/layout/Sidebar';
import { MobileNav } from './components/layout/MobileNav';
import { useAppStore } from './stores/useAppStore';

// Lazy load pages
const Today = lazy(() => import('./pages/Today/index'));
const MoneyAccounts = lazy(() => import('./pages/Money/Accounts'));
const MoneyTransactions = lazy(() => import('./pages/Money/Transactions'));
const MoneyCashFlow = lazy(() => import('./pages/Money/CashFlow'));
const WealthIndex = lazy(() => import('./pages/Wealth/NetWorth'));
const WealthInvestments = lazy(() => import('./pages/Wealth/Investments'));
const WealthAssets = lazy(() => import('./pages/Wealth/Assets'));
const WealthLiabilities = lazy(() => import('./pages/Wealth/Liabilities'));
const WealthInsurance = lazy(() => import('./pages/Wealth/Insurance'));
const WealthPensions = lazy(() => import('./pages/Wealth/Pensions'));
const FutureProjection = lazy(() => import('./pages/Future/Projection'));
const FutureGoals = lazy(() => import('./pages/Future/Goals'));
const FutureScenarios = lazy(() => import('./pages/Future/Scenarios'));
const FutureStressTests = lazy(() => import('./pages/Future/StressTests'));
const FutureTimeline = lazy(() => import('./pages/Future/Timeline'));
const InsightsRecommendations = lazy(() => import('./pages/Insights/Recommendations'));
const InsightsReview = lazy(() => import('./pages/Insights/MonthlyReview'));
const InsightsSubs = lazy(() => import('./pages/Insights/Subscriptions'));
const LibrarySettings = lazy(() => import('./pages/Library/Settings'));
const LibraryCategories = lazy(() => import('./pages/Library/Categories'));
const LibraryPeople = lazy(() => import('./pages/Library/People'));
const LibraryAuditLog = lazy(() => import('./pages/Library/AuditLog'));
const LibraryExport = lazy(() => import('./pages/Library/Export'));

function ComingSoon({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="text-4xl mb-4">🚧</div>
      <h2 className="text-lg font-semibold text-text-primary mb-2">{name}</h2>
      <p className="text-sm text-text-secondary">This page is coming soon.</p>
    </div>
  );
}

const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: 0.28, ease: [0.4, 0, 0.2, 1] }
};

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div key={location.pathname} {...pageTransition} className="h-full">
        <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>}>
          <Routes location={location}>
            <Route path="/" element={<Navigate to="/today" replace />} />
            <Route path="/today" element={<Today />} />
            <Route path="/money" element={<MoneyAccounts />} />
            <Route path="/money/transactions" element={<MoneyTransactions />} />
            <Route path="/money/cashflow" element={<MoneyCashFlow />} />
            <Route path="/money/budgets" element={<ComingSoon name="Budgets" />} />
            <Route path="/wealth" element={<WealthIndex />} />
            <Route path="/wealth/investments" element={<WealthInvestments />} />
            <Route path="/wealth/assets" element={<WealthAssets />} />
            <Route path="/wealth/liabilities" element={<WealthLiabilities />} />
            <Route path="/wealth/insurance" element={<WealthInsurance />} />
            <Route path="/wealth/pensions" element={<WealthPensions />} />
            <Route path="/future" element={<FutureProjection />} />
            <Route path="/future/goals" element={<FutureGoals />} />
            <Route path="/future/scenarios" element={<FutureScenarios />} />
            <Route path="/future/stresstests" element={<FutureStressTests />} />
            <Route path="/future/timeline" element={<FutureTimeline />} />
            <Route path="/insights" element={<InsightsRecommendations />} />
            <Route path="/insights/review" element={<InsightsReview />} />
            <Route path="/insights/subscriptions" element={<InsightsSubs />} />
            <Route path="/library" element={<LibrarySettings />} />
            <Route path="/library/categories" element={<LibraryCategories />} />
            <Route path="/library/people" element={<LibraryPeople />} />
            <Route path="/library/auditlog" element={<LibraryAuditLog />} />
            <Route path="/library/export" element={<LibraryExport />} />
            <Route path="*" element={<Navigate to="/today" replace />} />
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  const { resolveTheme } = useAppStore();
  useEffect(() => {
    resolveTheme();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', resolveTheme);
    return () => mq.removeEventListener('change', resolveTheme);
  }, [resolveTheme]);

  return (
    <BrowserRouter>
      <div className="flex h-screen bg-background overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <AnimatedRoutes />
          <MobileNav />
        </div>
      </div>
    </BrowserRouter>
  );
}
