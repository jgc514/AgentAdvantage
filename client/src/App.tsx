import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { FilterProvider } from './context/FilterContext';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import Login from './pages/Login';
import SoldPriceAnalysis from './pages/SoldPriceAnalysis';
import ExpiredCanceled from './pages/ExpiredCanceled';
import AmenitiesDashboard from './pages/Amenities';
import Outlier from './pages/Outlier';
import StreetStats from './pages/StreetStats';
import Stories from './pages/Stories';
import ActivePrice from './pages/ActivePrice';
import ActiveDOM from './pages/ActiveDOM';
import ListSoldRatio from './pages/ListSoldRatio';
import Subdivisions from './pages/Subdivisions';

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Sold Price Analysis', subtitle: 'SqFt vs True Sold Price scatter plot with regression & CI bands' },
  '/expired-canceled': { title: 'Expired / Canceled Analysis', subtitle: 'Visual comparison of sold vs failed-to-sell listings' },
  '/amenities': { title: 'Amenities Impact Dashboard', subtitle: 'Real-world $/sqft impact of property amenities' },
  '/outlier': { title: 'Am I an Outlier?', subtitle: 'SqFt & price distribution histograms' },
  '/street-stats': { title: 'Street Stats', subtitle: 'Avg $/sqft by street in descending order' },
  '/stories': { title: 'Stories Comparison', subtitle: '1-story vs 2-story vs 3-story $/sqft analysis' },
  '/active-price': { title: 'Active Price Analysis', subtitle: 'Active, new, and price-changed listings vs sqft' },
  '/active-dom': { title: 'Active Price vs DOM', subtitle: 'Days on market vs active price by status' },
  '/list-sold-ratio': { title: 'List:Sold Ratio Dashboard', subtitle: 'Price change impact on sold-to-list performance' },
  '/subdivisions': { title: 'Subdivision Stats', subtitle: 'Avg $/sqft by subdivision in descending order' },
};

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function AppLayout({ pagePath }: { pagePath: string }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const meta = PAGE_META[pagePath] || { title: 'Agent Advantage', subtitle: '' };

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <Sidebar collapsed={sidebarCollapsed} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header
          title={meta.title}
          subtitle={meta.subtitle}
          onToggleSidebar={() => setSidebarCollapsed(v => !v)}
          sidebarCollapsed={sidebarCollapsed}
        />
        <main className="flex-1 overflow-hidden flex flex-col">
          <Routes>
            <Route path="/" element={<SoldPriceAnalysis />} />
            <Route path="/expired-canceled" element={<ExpiredCanceled />} />
            <Route path="/amenities" element={<AmenitiesDashboard />} />
            <Route path="/outlier" element={<Outlier />} />
            <Route path="/street-stats" element={<StreetStats />} />
            <Route path="/stories" element={<Stories />} />
            <Route path="/active-price" element={<ActivePrice />} />
            <Route path="/active-dom" element={<ActiveDOM />} />
            <Route path="/list-sold-ratio" element={<ListSoldRatio />} />
            <Route path="/subdivisions" element={<Subdivisions />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function PageTracker({ children }: { children: (path: string) => React.ReactNode }) {
  const path = window.location.pathname;
  return <>{children(path)}</>;
}

export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
      <Route
        path="/*"
        element={
          <RequireAuth>
            <FilterProvider>
              <PageTracker>
                {path => <AppLayout pagePath={path} />}
              </PageTracker>
            </FilterProvider>
          </RequireAuth>
        }
      />
    </Routes>
  );
}
