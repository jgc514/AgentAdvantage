import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFilters } from '../context/FilterContext';
import apiService from '../services/api';
import StatsBar from '../components/Layout/StatsBar';
import FilterPanel from '../components/Filters/FilterPanel';
import ScatterPlotChart from '../components/Charts/ScatterPlotChart';

const STATUS_COLORS: Record<string, string> = {
  'Active': '#3b82f6',
  'New': '#8b5cf6',
  'Price Change': '#f59e0b',
  'Pending': '#10b981',
  'Backup': '#06b6d4',
  'Coming Soon': '#ec4899',
  'Expired': '#ef4444',
};

export default function ActiveDOM() {
  const { filters } = useFilters();

  const effectiveFilters = useMemo(() => ({
    ...filters,
    status: filters.status.length > 0
      ? filters.status
      : ['Active', 'New', 'Price Change', 'Pending', 'Expired'],
  }), [filters]);

  const { data, isLoading } = useQuery({
    queryKey: ['properties', effectiveFilters],
    queryFn: () => apiService.getProperties(effectiveFilters),
    staleTime: 30_000,
  });

  const actives = useMemo(
    () => (data?.properties || []).filter(p => p.listPrice > 0 && p.daysOnMarket >= 0),
    [data]
  );

  return (
    <div className="flex flex-col h-full">
      <StatsBar stats={data?.stats || null} loading={isLoading} />
      <FilterPanel />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <p className="text-slate-400 text-sm">
            This dashboard plots <strong className="text-white">Days on Market</strong> vs{' '}
            <strong className="text-white">List Price</strong>, color-coded by status.
            Properties sitting longer with high prices indicate overpricing. The regression line
            reveals the DOM vs price relationship — useful for identifying stale inventory.
          </p>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          {isLoading ? (
            <div className="h-96 flex items-center justify-center text-slate-500">Loading data...</div>
          ) : actives.length === 0 ? (
            <div className="h-96 flex flex-col items-center justify-center text-slate-500 gap-2">
              <span className="text-4xl">📅</span>
              <p>No listings match current filters</p>
            </div>
          ) : (
            <ScatterPlotChart
              title={`Active Price vs Days on Market — ${actives.length} listings`}
              properties={actives}
              getX={p => p.daysOnMarket}
              getY={p => p.listPrice}
              getColor={p => STATUS_COLORS[p.status] || '#64748b'}
              xLabel="Days on Market (DOM)"
              yLabel="List Price"
              formatX={v => `${Math.round(v)}d`}
              showRegression
              showConfidenceBands
              height={500}
              legendItems={[...new Set(actives.map(p => p.status))].map(s => ({
                color: STATUS_COLORS[s] || '#64748b',
                label: s,
              }))}
            />
          )}
        </div>

        {actives.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Under 30 DOM', filter: (p: typeof actives[0]) => p.daysOnMarket < 30, color: 'emerald' },
              { label: '30-60 DOM', filter: (p: typeof actives[0]) => p.daysOnMarket >= 30 && p.daysOnMarket < 60, color: 'sky' },
              { label: '60-90 DOM', filter: (p: typeof actives[0]) => p.daysOnMarket >= 60 && p.daysOnMarket < 90, color: 'amber' },
              { label: '90+ DOM', filter: (p: typeof actives[0]) => p.daysOnMarket >= 90, color: 'rose' },
            ].map(bucket => {
              const props = actives.filter(bucket.filter);
              const colors: Record<string, string> = { emerald: 'text-emerald-400', sky: 'text-sky-400', amber: 'text-amber-400', rose: 'text-rose-400' };
              return (
                <div key={bucket.label} className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                  <div className="text-slate-400 text-xs mb-1">{bucket.label}</div>
                  <div className={`font-bold text-2xl ${colors[bucket.color]}`}>{props.length}</div>
                  <div className="text-slate-500 text-xs mt-1">{props.length > 0 ? `Avg $${(props.reduce((s,p)=>s+p.listPrice,0)/props.length/1000).toFixed(0)}K` : 'No data'}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
