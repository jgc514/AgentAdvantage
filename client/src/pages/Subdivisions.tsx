import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFilters } from '../context/FilterContext';
import apiService from '../services/api';
import StatsBar from '../components/Layout/StatsBar';
import FilterPanel from '../components/Filters/FilterPanel';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import { groupBy, mean, formatFullCurrency } from '../utils/statistics';

export default function Subdivisions() {
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

  const subdivisionData = useMemo(() => {
    const bySubdivision = groupBy(sold, p => p.subdivision);
    return Object.entries(bySubdivision)
      .map(([subdivision, props]) => ({
        subdivision,
        avgPpsqft: mean(props.map(p => p.pricePerSqft)),
        count: props.length,
        avgSold: mean(props.map(p => p.trueSoldPrice)),
        avgDOM: mean(props.map(p => p.daysOnMarket)),
        avgSqft: mean(props.map(p => p.sqft)),
        totalVolume: props.reduce((s, p) => s + p.trueSoldPrice, 0),
        schoolDistrict: props[0]?.schoolDistrict || '',
      }))
      .filter(s => s.count >= 1)
      .sort((a, b) => b.avgPpsqft - a.avgPpsqft);
  }, [sold]);

  const maxPpsqft = subdivisionData[0]?.avgPpsqft || 1;

  const GRAD_COLORS = [
    '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe',
    '#dbeafe', '#e0f2fe', '#bae6fd', '#7dd3fc', '#38bdf8', '#0ea5e9',
    '#0284c7', '#0369a1',
  ];

  return (
    <div className="flex flex-col h-full">
      <StatsBar stats={data?.stats || null} loading={isLoading} />
      <FilterPanel />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <p className="text-slate-400 text-sm">
            Average price per square foot by subdivision, sorted in descending order.
            This gives a quick snapshot of which subdivisions command premium pricing
            within your searched area. Useful for buyer and seller consultations.
          </p>
        </div>

        {isLoading ? (
          <div className="h-96 flex items-center justify-center text-slate-500">Loading data...</div>
        ) : sold.length === 0 ? (
          <div className="h-96 flex flex-col items-center justify-center text-slate-500 gap-2">
            <span className="text-4xl">🏘️</span>
            <p>No sold properties match current filters</p>
          </div>
        ) : (
          <>
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold text-sm">Avg $/SqFt by Subdivision — {subdivisionData.length} subdivisions</h3>
                <span className="text-slate-400 text-xs">{sold.length} sold properties</span>
              </div>
              <ResponsiveContainer width="100%" height={Math.max(400, subdivisionData.length * 36)}>
                <BarChart
                  data={subdivisionData}
                  layout="vertical"
                  margin={{ top: 5, right: 90, bottom: 5, left: 150 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                  <XAxis
                    type="number"
                    tickFormatter={v => `$${v.toFixed(0)}`}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    stroke="#334155"
                  />
                  <YAxis
                    dataKey="subdivision"
                    type="category"
                    width={145}
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    stroke="#334155"
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9' }}
                    formatter={(v: number, _name, item) => {
                      const p = item.payload as { count: number; avgSold: number; avgDOM: number };
                      return [
                        `$${v.toFixed(2)}/sqft | ${p.count} sales | Avg ${formatFullCurrency(p.avgSold)} | ${p.avgDOM.toFixed(0)} DOM`,
                        'Stats',
                      ];
                    }}
                  />
                  <Bar dataKey="avgPpsqft" radius={[0, 4, 4, 0]}>
                    {subdivisionData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={GRAD_COLORS[i % GRAD_COLORS.length]}
                        fillOpacity={0.85}
                      />
                    ))}
                    <LabelList
                      dataKey="avgPpsqft"
                      position="right"
                      formatter={(v: number) => `$${v.toFixed(0)}`}
                      style={{ fill: '#94a3b8', fontSize: 11 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Data table */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-900 border-b border-slate-700">
                  <tr>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Rank</th>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Subdivision</th>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">School District</th>
                    <th className="text-right px-4 py-3 text-slate-400 font-medium">Avg $/SqFt</th>
                    <th className="text-right px-4 py-3 text-slate-400 font-medium">Avg Sold</th>
                    <th className="text-right px-4 py-3 text-slate-400 font-medium">Avg DOM</th>
                    <th className="text-right px-4 py-3 text-slate-400 font-medium">Sales</th>
                    <th className="text-right px-4 py-3 text-slate-400 font-medium">Total Volume</th>
                  </tr>
                </thead>
                <tbody>
                  {subdivisionData.map((s, i) => (
                    <tr key={s.subdivision} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3 text-slate-400 text-xs">#{i + 1}</td>
                      <td className="px-4 py-3 text-white font-medium">{s.subdivision}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{s.schoolDistrict}</td>
                      <td className="px-4 py-3 text-emerald-400 font-bold text-right">${s.avgPpsqft.toFixed(2)}</td>
                      <td className="px-4 py-3 text-slate-300 text-right">{formatFullCurrency(s.avgSold)}</td>
                      <td className="px-4 py-3 text-slate-400 text-right">{s.avgDOM.toFixed(0)}d</td>
                      <td className="px-4 py-3 text-slate-400 text-right">{s.count}</td>
                      <td className="px-4 py-3 text-sky-400 text-right text-xs">${(s.totalVolume / 1_000_000).toFixed(1)}M</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
