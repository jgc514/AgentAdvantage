import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFilters } from '../context/FilterContext';
import apiService from '../services/api';
import StatsBar from '../components/Layout/StatsBar';
import FilterPanel from '../components/Filters/FilterPanel';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import { histogramBins, formatCurrency } from '../utils/statistics';

export default function Outlier() {
  const { filters } = useFilters();

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

  const sqftBins = useMemo(() => histogramBins(sold, p => p.sqft, 12), [sold]);
  const priceBins = useMemo(() => histogramBins(sold, p => p.trueSoldPrice, 12), [sold]);

  const sqftData = sqftBins.map(b => ({
    label: `${Math.round(b.min).toLocaleString()}-${Math.round(b.max).toLocaleString()}`,
    count: b.count,
    min: b.min,
    max: b.max,
  }));

  const priceData = priceBins.map(b => ({
    label: `${formatCurrency(b.min)}-${formatCurrency(b.max)}`,
    count: b.count,
    min: b.min,
    max: b.max,
  }));

  const avgSqft = sold.length > 0 ? sold.reduce((s, p) => s + p.sqft, 0) / sold.length : 0;
  const avgPrice = sold.length > 0 ? sold.reduce((s, p) => s + p.trueSoldPrice, 0) / sold.length : 0;

  // Find which bin the average falls in for highlighting
  const avgSqftBinIdx = sqftBins.findIndex(b => b.min <= avgSqft && b.max > avgSqft);
  const avgPriceBinIdx = priceBins.findIndex(b => b.min <= avgPrice && b.max > avgPrice);

  return (
    <div className="flex flex-col h-full">
      <StatsBar stats={data?.stats || null} loading={isLoading} />
      <FilterPanel />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="bg-slate-800 rounded-xl border border-amber-800/40 p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🎯</span>
            <div>
              <h3 className="text-amber-400 font-semibold text-sm mb-1">Am I an Outlier?</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                These histograms show how sold properties distribute by square footage and price.
                The tallest bars represent where the market is most active — helping sellers and agents
                quickly see if a subject property is in the sweet spot or an outlier.
                <span className="text-sky-400"> Blue bars</span> highlight the most common market ranges.
              </p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="h-96 flex items-center justify-center text-slate-500">Loading data...</div>
        ) : sold.length === 0 ? (
          <div className="h-96 flex flex-col items-center justify-center text-slate-500 gap-2">
            <span className="text-4xl">🎯</span>
            <p>No sold properties match current filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* SqFt histogram */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
              <h3 className="text-white font-semibold text-sm mb-1">Square Footage Distribution</h3>
              <p className="text-slate-400 text-xs mb-4">Number of sold homes by size range</p>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={sqftData} margin={{ top: 10, right: 10, bottom: 60, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    stroke="#334155"
                    angle={-35}
                    textAnchor="end"
                  />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} stroke="#334155" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9' }}
                    formatter={(v: number) => [v, 'Properties']}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {sqftData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={i === avgSqftBinIdx ? '#38bdf8' : i === sqftData.reduce((max, d, idx) => d.count > sqftData[max].count ? idx : max, 0) ? '#3b82f6' : '#1d4ed8'}
                        fillOpacity={0.85}
                      />
                    ))}
                  </Bar>
                  <ReferenceLine
                    x={sqftData[avgSqftBinIdx]?.label}
                    stroke="#f59e0b"
                    strokeDasharray="4 2"
                    label={{ value: `Avg: ${Math.round(avgSqft).toLocaleString()} sqft`, fill: '#f59e0b', fontSize: 10, position: 'top' }}
                  />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 flex gap-4 text-xs text-slate-400">
                <span>Average: <strong className="text-amber-400">{Math.round(avgSqft).toLocaleString()} sqft</strong></span>
                <span>Range: <strong className="text-slate-300">{Math.min(...sold.map(p=>p.sqft)).toLocaleString()} – {Math.max(...sold.map(p=>p.sqft)).toLocaleString()} sqft</strong></span>
              </div>
            </div>

            {/* Price histogram */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
              <h3 className="text-white font-semibold text-sm mb-1">Sold Price Distribution</h3>
              <p className="text-slate-400 text-xs mb-4">Number of sold homes by price range</p>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={priceData} margin={{ top: 10, right: 10, bottom: 60, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    stroke="#334155"
                    angle={-35}
                    textAnchor="end"
                  />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} stroke="#334155" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9' }}
                    formatter={(v: number) => [v, 'Properties']}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {priceData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={i === avgPriceBinIdx ? '#34d399' : i === priceData.reduce((max, d, idx) => d.count > priceData[max].count ? idx : max, 0) ? '#10b981' : '#065f46'}
                        fillOpacity={0.85}
                      />
                    ))}
                  </Bar>
                  <ReferenceLine
                    x={priceData[avgPriceBinIdx]?.label}
                    stroke="#f59e0b"
                    strokeDasharray="4 2"
                    label={{ value: `Avg: $${(avgPrice/1000).toFixed(0)}K`, fill: '#f59e0b', fontSize: 10, position: 'top' }}
                  />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 flex gap-4 text-xs text-slate-400">
                <span>Average: <strong className="text-amber-400">${(avgPrice/1000).toFixed(0)}K</strong></span>
                <span>Range: <strong className="text-slate-300">${(Math.min(...sold.map(p=>p.trueSoldPrice))/1000).toFixed(0)}K – ${(Math.max(...sold.map(p=>p.trueSoldPrice))/1000).toFixed(0)}K</strong></span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
