import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFilters } from '../context/FilterContext';
import apiService from '../services/api';
import StatsBar from '../components/Layout/StatsBar';
import FilterPanel from '../components/Filters/FilterPanel';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import { groupBy, mean } from '../utils/statistics';

export default function StreetStats() {
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

  const streetData = useMemo(() => {
    const byStreet = groupBy(sold, p => p.street);
    return Object.entries(byStreet)
      .map(([street, props]) => ({
        street,
        avgPpsqft: mean(props.map(p => p.pricePerSqft)),
        count: props.length,
        avgSold: mean(props.map(p => p.trueSoldPrice)),
      }))
      .filter(s => s.count >= 1)
      .sort((a, b) => b.avgPpsqft - a.avgPpsqft);
  }, [sold]);

  const maxPpsqft = streetData[0]?.avgPpsqft || 1;

  return (
    <div className="flex flex-col h-full">
      <StatsBar stats={data?.stats || null} loading={isLoading} />
      <FilterPanel />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <p className="text-slate-400 text-sm">
            Average price per square foot by street, sorted in descending order.
            Helps identify premium streets within a neighborhood or zip code.
            Each bar shows the average $/sqft of all sold homes on that street.
          </p>
        </div>

        {isLoading ? (
          <div className="h-96 flex items-center justify-center text-slate-500">Loading data...</div>
        ) : sold.length === 0 ? (
          <div className="h-96 flex flex-col items-center justify-center text-slate-500 gap-2">
            <span className="text-4xl">🛣️</span>
            <p>No sold properties match current filters</p>
          </div>
        ) : (
          <>
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold text-sm">Avg $/SqFt by Street — {streetData.length} streets</h3>
                <span className="text-slate-400 text-xs">{sold.length} sold properties</span>
              </div>
              <ResponsiveContainer width="100%" height={Math.max(400, streetData.length * 32)}>
                <BarChart
                  data={streetData}
                  layout="vertical"
                  margin={{ top: 5, right: 80, bottom: 5, left: 140 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                  <XAxis
                    type="number"
                    tickFormatter={v => `$${v.toFixed(0)}`}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    stroke="#334155"
                  />
                  <YAxis
                    dataKey="street"
                    type="category"
                    width={130}
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    stroke="#334155"
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9' }}
                    formatter={(v: number, _name, item) => [
                      `$${v.toFixed(2)}/sqft (${(item.payload as { count: number }).count} sold)`,
                      'Avg $/SqFt'
                    ]}
                  />
                  <Bar dataKey="avgPpsqft" radius={[0, 4, 4, 0]}>
                    {streetData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={`hsl(${220 - (i / streetData.length) * 60}, 80%, ${55 - (i / streetData.length) * 15}%)`}
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

            {/* Table */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-900 border-b border-slate-700">
                  <tr>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Rank</th>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Street</th>
                    <th className="text-right px-4 py-3 text-slate-400 font-medium">Avg $/SqFt</th>
                    <th className="text-right px-4 py-3 text-slate-400 font-medium">Avg Sold</th>
                    <th className="text-right px-4 py-3 text-slate-400 font-medium">Sales</th>
                    <th className="text-right px-4 py-3 text-slate-400 font-medium">Index</th>
                  </tr>
                </thead>
                <tbody>
                  {streetData.map((s, i) => (
                    <tr key={s.street} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3 text-slate-400 text-xs">#{i + 1}</td>
                      <td className="px-4 py-3 text-white font-medium">{s.street}</td>
                      <td className="px-4 py-3 text-emerald-400 font-bold text-right">${s.avgPpsqft.toFixed(2)}</td>
                      <td className="px-4 py-3 text-slate-300 text-right">${(s.avgSold/1000).toFixed(0)}K</td>
                      <td className="px-4 py-3 text-slate-400 text-right">{s.count}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="h-1.5 rounded-full bg-slate-700 w-20 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400"
                              style={{ width: `${(s.avgPpsqft / maxPpsqft) * 100}%` }}
                            />
                          </div>
                          <span className="text-slate-400 text-xs w-10 text-right">
                            {((s.avgPpsqft / maxPpsqft) * 100).toFixed(0)}
                          </span>
                        </div>
                      </td>
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
