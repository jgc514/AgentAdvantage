import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFilters } from '../context/FilterContext';
import { Property } from '../types';
import apiService from '../services/api';
import StatsBar from '../components/Layout/StatsBar';
import FilterPanel from '../components/Filters/FilterPanel';
import ScatterPlotChart from '../components/Charts/ScatterPlotChart';

const STATUS_COLORS: Record<string, string> = {
  Sold: '#10b981', Active: '#3b82f6', New: '#6366f1', 'Price Change': '#f59e0b',
  Pending: '#8b5cf6', Expired: '#ef4444', Canceled: '#f97316', Withdrawn: '#eab308',
};

export default function SoldPriceAnalysis() {
  const { filters } = useFilters();
  const [subjectSqft, setSubjectSqft] = useState('');
  const [subjectPriceMin, setSubjectPriceMin] = useState('');
  const [subjectPriceMax, setSubjectPriceMax] = useState('');

  const effectiveFilters = useMemo(() => ({
    ...filters,
    status: filters.status.length > 0 ? filters.status : ['Sold'],
  }), [filters]);

  const { data, isLoading } = useQuery({
    queryKey: ['properties', effectiveFilters],
    queryFn: () => apiService.getProperties(effectiveFilters),
    staleTime: 30_000,
  });

  const sold = useMemo(
    () => (data?.properties || []).filter(p => p.status === 'Sold' && p.trueSoldPrice > 0),
    [data]
  );

  return (
    <div className="flex flex-col h-full">
      <StatsBar stats={data?.stats || null} loading={isLoading} />
      <FilterPanel />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Subject property inputs */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
            <span className="text-amber-400">⊕</span> Subject Property Overlay
          </h3>
          <div className="flex gap-4 flex-wrap">
            <div>
              <label className="filter-section-label block mb-1">Subject SqFt</label>
              <input
                type="number"
                placeholder="e.g. 2200"
                value={subjectSqft}
                onChange={e => setSubjectSqft(e.target.value)}
                className="filter-input w-40"
              />
            </div>
            <div>
              <label className="filter-section-label block mb-1">Projected Price Min ($)</label>
              <input
                type="number"
                placeholder="e.g. 450000"
                value={subjectPriceMin}
                onChange={e => setSubjectPriceMin(e.target.value)}
                className="filter-input w-40"
              />
            </div>
            <div>
              <label className="filter-section-label block mb-1">Projected Price Max ($)</label>
              <input
                type="number"
                placeholder="e.g. 520000"
                value={subjectPriceMax}
                onChange={e => setSubjectPriceMax(e.target.value)}
                className="filter-input w-40"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => { setSubjectSqft(''); setSubjectPriceMin(''); setSubjectPriceMax(''); }}
                className="filter-input text-slate-400 hover:text-white"
              >
                Clear
              </button>
            </div>
          </div>
          {subjectSqft && (
            <p className="text-slate-400 text-xs mt-2">
              Dashed vertical line marks subject sqft. Amber band shows projected price range.
              95% confidence bands shown in blue.
            </p>
          )}
        </div>

        {/* Chart */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          {isLoading ? (
            <div className="h-96 flex items-center justify-center text-slate-500">Loading data...</div>
          ) : sold.length === 0 ? (
            <div className="h-96 flex flex-col items-center justify-center text-slate-500 gap-2">
              <span className="text-4xl">📊</span>
              <p>No sold properties match current filters</p>
            </div>
          ) : (
            <ScatterPlotChart
              title={`Sold Price Analysis — ${sold.length} properties`}
              properties={sold}
              getX={p => p.sqft}
              getY={p => p.trueSoldPrice}
              getColor={p => STATUS_COLORS[p.status] || '#10b981'}
              xLabel="Square Footage"
              yLabel="True Sold Price"
              showRegression
              showConfidenceBands
              subjectSqft={subjectSqft ? Number(subjectSqft) : undefined}
              subjectPriceMin={subjectPriceMin ? Number(subjectPriceMin) : undefined}
              subjectPriceMax={subjectPriceMax ? Number(subjectPriceMax) : undefined}
              height={500}
              legendItems={[
                { color: '#10b981', label: 'Sold (True Price)' },
                { color: '#22d3ee', label: 'Regression Trend' },
                { color: '#3b82f6', label: '95% Confidence Band' },
                ...(subjectSqft ? [{ color: '#f59e0b', label: 'Subject Property' }] : []),
              ]}
            />
          )}
        </div>

        {/* Summary stats breakdown */}
        {sold.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Properties Plotted" value={String(sold.length)} color="sky" />
            <StatCard label="Avg True Sold Price" value={`$${(sold.reduce((s, p) => s + p.trueSoldPrice, 0) / sold.length / 1000).toFixed(0)}K`} color="emerald" />
            <StatCard label="Avg $/SqFt" value={`$${(sold.reduce((s, p) => s + p.pricePerSqft, 0) / sold.length).toFixed(0)}`} color="violet" />
            <StatCard label="Avg Concessions" value={`$${(sold.reduce((s, p) => s + p.sellerConcessions, 0) / sold.length / 1000).toFixed(1)}K`} color="amber" />
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    sky: 'border-sky-800 bg-sky-950/30', emerald: 'border-emerald-800 bg-emerald-950/30',
    violet: 'border-violet-800 bg-violet-950/30', amber: 'border-amber-800 bg-amber-950/30',
  };
  const textColors: Record<string, string> = {
    sky: 'text-sky-400', emerald: 'text-emerald-400', violet: 'text-violet-400', amber: 'text-amber-400',
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <div className="text-slate-400 text-xs mb-1">{label}</div>
      <div className={`font-bold text-xl ${textColors[color]}`}>{value}</div>
    </div>
  );
}
