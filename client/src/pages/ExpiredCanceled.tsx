import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFilters } from '../context/FilterContext';
import { Property } from '../types';
import apiService from '../services/api';
import StatsBar from '../components/Layout/StatsBar';
import FilterPanel from '../components/Filters/FilterPanel';
import ScatterPlotChart from '../components/Charts/ScatterPlotChart';

const STATUS_COLORS: Record<string, string> = {
  Sold: '#6b7280',        // gray
  Expired: '#ef4444',    // red
  Canceled: '#f97316',   // orange
  Withdrawn: '#eab308',  // yellow
};

export default function ExpiredCanceled() {
  const { filters } = useFilters();

  const effectiveFilters = useMemo(() => ({
    ...filters,
    status: filters.status.length > 0 ? filters.status : ['Sold', 'Expired', 'Canceled', 'Withdrawn'],
  }), [filters]);

  const { data, isLoading } = useQuery({
    queryKey: ['properties', effectiveFilters],
    queryFn: () => apiService.getProperties(effectiveFilters),
    staleTime: 30_000,
  });

  const properties = useMemo(() => {
    const all = data?.properties || [];
    return all.filter(p =>
      ['Sold', 'Expired', 'Canceled', 'Withdrawn'].includes(p.status) &&
      (p.trueSoldPrice > 0 || p.listPrice > 0)
    );
  }, [data]);

  const counts = useMemo(() => ({
    sold: properties.filter(p => p.status === 'Sold').length,
    expired: properties.filter(p => p.status === 'Expired').length,
    canceled: properties.filter(p => p.status === 'Canceled').length,
    withdrawn: properties.filter(p => p.status === 'Withdrawn').length,
  }), [properties]);

  return (
    <div className="flex flex-col h-full">
      <StatsBar stats={data?.stats || null} loading={isLoading} />
      <FilterPanel />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Explainer */}
        <div className="bg-slate-800 rounded-xl border border-amber-800/40 p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <h3 className="text-amber-400 font-semibold text-sm mb-1">Pricing Strategy Visual</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                This dashboard shows sellers what happens when a property is overpriced.
                <strong className="text-white"> Gray dots</strong> = sold properties (success).
                <strong className="text-red-400"> Red</strong> = expired,
                <strong className="text-orange-400"> orange</strong> = canceled,
                <strong className="text-yellow-400"> yellow</strong> = withdrawn.
                Properties clustering above the regression line typically failed to sell.
              </p>
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MiniStat label="Sold" value={counts.sold} color="#6b7280" />
          <MiniStat label="Expired" value={counts.expired} color="#ef4444" />
          <MiniStat label="Canceled" value={counts.canceled} color="#f97316" />
          <MiniStat label="Withdrawn" value={counts.withdrawn} color="#eab308" />
        </div>

        {/* Chart */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          {isLoading ? (
            <div className="h-96 flex items-center justify-center text-slate-500">Loading data...</div>
          ) : properties.length === 0 ? (
            <div className="h-96 flex flex-col items-center justify-center text-slate-500 gap-2">
              <span className="text-4xl">🚫</span>
              <p>No properties match current filters</p>
            </div>
          ) : (
            <ScatterPlotChart
              title={`Expired / Canceled Analysis — ${properties.length} properties`}
              properties={properties}
              getX={p => p.sqft}
              getY={p => p.status === 'Sold' ? p.trueSoldPrice : p.listPrice}
              getColor={p => STATUS_COLORS[p.status] || '#6b7280'}
              xLabel="Square Footage"
              yLabel="List Price / Sold Price"
              showRegression
              showConfidenceBands
              height={500}
              legendItems={[
                { color: '#6b7280', label: 'Sold (gray - success)' },
                { color: '#ef4444', label: 'Expired' },
                { color: '#f97316', label: 'Canceled' },
                { color: '#eab308', label: 'Withdrawn' },
                { color: '#22d3ee', label: 'Regression Trend' },
                { color: '#3b82f6', label: '95% CI Bands' },
              ]}
            />
          )}
        </div>

        <InsightBox counts={counts} />
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-slate-400 text-xs">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  );
}

function InsightBox({ counts }: { counts: { sold: number; expired: number; canceled: number; withdrawn: number } }) {
  const total = counts.sold + counts.expired + counts.canceled + counts.withdrawn;
  const failRate = total > 0 ? ((counts.expired + counts.canceled + counts.withdrawn) / total * 100).toFixed(1) : '0';
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
      <h3 className="text-white font-semibold text-sm mb-3">Market Intelligence</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-3 bg-slate-900 rounded-lg">
          <div className="text-slate-400 text-xs mb-1">Failure Rate</div>
          <div className="text-rose-400 font-bold text-2xl">{failRate}%</div>
          <div className="text-slate-500 text-xs mt-1">of listings did not sell</div>
        </div>
        <div className="p-3 bg-slate-900 rounded-lg">
          <div className="text-slate-400 text-xs mb-1">Key Insight</div>
          <div className="text-amber-400 font-semibold text-sm leading-snug">
            Properties above the trend line are priced to fail
          </div>
        </div>
        <div className="p-3 bg-slate-900 rounded-lg">
          <div className="text-slate-400 text-xs mb-1">Seller Takeaway</div>
          <div className="text-emerald-400 font-semibold text-sm leading-snug">
            List within the 95% CI band for highest success probability
          </div>
        </div>
      </div>
    </div>
  );
}
