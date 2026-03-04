import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFilters } from '../context/FilterContext';
import { Property } from '../types';
import apiService from '../services/api';
import StatsBar from '../components/Layout/StatsBar';
import FilterPanel from '../components/Filters/FilterPanel';
import ScatterPlotChart from '../components/Charts/ScatterPlotChart';
import { mean } from '../utils/statistics';

const STATUS_COLORS: Record<string, string> = {
  'Active': '#3b82f6',
  'New': '#8b5cf6',
  'Price Change': '#f59e0b',
  'Pending': '#10b981',
  'Backup': '#06b6d4',
  'Coming Soon': '#ec4899',
};

export default function ActivePrice() {
  const { filters } = useFilters();

  const effectiveFilters = useMemo(() => ({
    ...filters,
    status: filters.status.length > 0
      ? filters.status
      : ['Active', 'New', 'Price Change', 'Pending', 'Backup', 'Coming Soon'],
  }), [filters]);

  const { data, isLoading } = useQuery({
    queryKey: ['properties', effectiveFilters],
    queryFn: () => apiService.getProperties(effectiveFilters),
    staleTime: 30_000,
  });

  const actives = useMemo(
    () => (data?.properties || []).filter(p =>
      ['Active', 'New', 'Price Change', 'Pending', 'Backup', 'Coming Soon'].includes(p.status) &&
      p.listPrice > 0
    ),
    [data]
  );

  const byStatus = useMemo(() => {
    const groups: Record<string, Property[]> = {};
    actives.forEach(p => {
      if (!groups[p.status]) groups[p.status] = [];
      groups[p.status].push(p);
    });
    return groups;
  }, [actives]);

  return (
    <div className="flex flex-col h-full">
      <StatsBar stats={data?.stats || null} loading={isLoading} />
      <FilterPanel />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Status summary */}
        {actives.length > 0 && (
          <div className="flex gap-3 flex-wrap">
            {Object.entries(byStatus).map(([status, props]) => (
              <div key={status} className="bg-slate-800 rounded-lg border border-slate-700 px-4 py-2.5 flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[status] || '#64748b' }} />
                <span className="text-slate-300 text-sm font-medium">{status}</span>
                <span className="text-slate-500 text-sm">({props.length})</span>
                <span className="text-slate-400 text-xs ml-1">${mean(props.map(p => p.listPrice / p.sqft)).toFixed(0)}/sqft</span>
              </div>
            ))}
          </div>
        )}

        {/* Chart */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          {isLoading ? (
            <div className="h-96 flex items-center justify-center text-slate-500">Loading data...</div>
          ) : actives.length === 0 ? (
            <div className="h-96 flex flex-col items-center justify-center text-slate-500 gap-2">
              <span className="text-4xl">🏷️</span>
              <p>No active listings match current filters</p>
            </div>
          ) : (
            <ScatterPlotChart
              title={`Active Price Analysis — ${actives.length} listings`}
              properties={actives}
              getX={p => p.sqft}
              getY={p => p.listPrice}
              getColor={p => STATUS_COLORS[p.status] || '#64748b'}
              xLabel="Square Footage"
              yLabel="List Price"
              showRegression
              showConfidenceBands
              height={500}
              legendItems={Object.entries(STATUS_COLORS)
                .filter(([status]) => byStatus[status]?.length > 0)
                .map(([status, color]) => ({
                  color,
                  label: `${status} (${byStatus[status]?.length || 0})`,
                }))}
            />
          )}
        </div>

        {/* Active market insights */}
        {actives.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InsightCard
              label="Active Listings"
              value={actives.filter(p => p.status === 'Active' || p.status === 'New').length}
              sub="Currently on market"
              color="blue"
            />
            <InsightCard
              label="Price Reductions"
              value={actives.filter(p => p.status === 'Price Change').length}
              sub={`${((actives.filter(p => p.status === 'Price Change').length / actives.length) * 100).toFixed(1)}% of active`}
              color="amber"
            />
            <InsightCard
              label="Avg List $/SqFt"
              value={`$${mean(actives.map(p => p.listPrice / p.sqft)).toFixed(0)}`}
              sub="Across all active statuses"
              color="emerald"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function InsightCard({ label, value, sub, color }: { label: string; value: string | number; sub: string; color: string }) {
  const colors: Record<string, string> = {
    blue: 'text-blue-400', amber: 'text-amber-400', emerald: 'text-emerald-400',
  };
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
      <div className="text-slate-400 text-xs mb-1">{label}</div>
      <div className={`font-bold text-2xl ${colors[color]}`}>{value}</div>
      <div className="text-slate-500 text-xs mt-1">{sub}</div>
    </div>
  );
}
