import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFilters } from '../context/FilterContext';
import apiService from '../services/api';
import StatsBar from '../components/Layout/StatsBar';
import FilterPanel from '../components/Filters/FilterPanel';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, Cell,
} from 'recharts';
import { groupBy, mean, formatFullCurrency } from '../utils/statistics';

const STORY_COLORS = { 1: '#3b82f6', 2: '#10b981', 3: '#f59e0b' };
const STORY_LABELS = { 1: '1-Story', 2: '2-Story', 3: '3-Story' };

export default function Stories() {
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

  const byStories = useMemo(() => {
    const groups = groupBy(sold, p => String(p.stories));
    return [1, 2, 3].map(n => {
      const props = groups[String(n)] || [];
      return {
        stories: n,
        label: STORY_LABELS[n as keyof typeof STORY_LABELS],
        count: props.length,
        avgPpsqft: mean(props.map(p => p.pricePerSqft)),
        avgSold: mean(props.map(p => p.trueSoldPrice)),
        avgSqft: mean(props.map(p => p.sqft)),
        avgDOM: mean(props.map(p => p.daysOnMarket)),
        avgListSold: mean(props.filter(p => p.soldPrice > 0).map(p => p.soldPrice / p.originalListPrice)),
      };
    }).filter(g => g.count > 0);
  }, [sold]);

  const newByStories = useMemo(() => {
    const newConst = sold.filter(p => p.newConstruction);
    const preOwned = sold.filter(p => !p.newConstruction);
    return [1, 2, 3].map(n => ({
      stories: n,
      label: STORY_LABELS[n as keyof typeof STORY_LABELS],
      newConstruction: mean(newConst.filter(p => p.stories === n).map(p => p.pricePerSqft)),
      preOwned: mean(preOwned.filter(p => p.stories === n).map(p => p.pricePerSqft)),
    })).filter(d => d.newConstruction > 0 || d.preOwned > 0);
  }, [sold]);

  const radarData = byStories.map(g => ({
    subject: g.label,
    '$/SqFt': Math.round(g.avgPpsqft),
    'Avg DOM': Math.round(g.avgDOM),
    'List:Sold%': Math.round(g.avgListSold * 100),
  }));

  return (
    <div className="flex flex-col h-full">
      <StatsBar stats={data?.stats || null} loading={isLoading} />
      <FilterPanel />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {isLoading ? (
          <div className="h-96 flex items-center justify-center text-slate-500">Loading data...</div>
        ) : sold.length === 0 ? (
          <div className="h-96 flex flex-col items-center justify-center text-slate-500 gap-2">
            <span className="text-4xl">🏢</span>
            <p>No sold properties match current filters</p>
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {byStories.map(g => (
                <div key={g.stories} className="bg-slate-800 rounded-xl border border-slate-700 p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
                      style={{ backgroundColor: STORY_COLORS[g.stories as keyof typeof STORY_COLORS] + '33', color: STORY_COLORS[g.stories as keyof typeof STORY_COLORS] }}>
                      {g.stories}
                    </div>
                    <div>
                      <div className="text-white font-semibold">{g.label}</div>
                      <div className="text-slate-400 text-xs">{g.count} sold</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Metric label="Avg $/SqFt" value={`$${g.avgPpsqft.toFixed(0)}`} color={STORY_COLORS[g.stories as keyof typeof STORY_COLORS]} />
                    <Metric label="Avg Sold" value={`$${(g.avgSold/1000).toFixed(0)}K`} />
                    <Metric label="Avg SqFt" value={g.avgSqft.toFixed(0)} />
                    <Metric label="Avg DOM" value={`${g.avgDOM.toFixed(0)}d`} />
                    <Metric label="List:Sold" value={`${(g.avgListSold * 100).toFixed(1)}%`} />
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* $/SqFt comparison bar chart */}
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
                <h3 className="text-white font-semibold text-sm mb-4">Avg $/SqFt by Story Count</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={byStories} margin={{ top: 10, right: 20, bottom: 5, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 12 }} stroke="#334155" />
                    <YAxis tickFormatter={v => `$${v}`} tick={{ fill: '#64748b', fontSize: 11 }} stroke="#334155" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9' }}
                      formatter={(v: number) => [`$${v.toFixed(2)}/sqft`, 'Avg $/SqFt']}
                    />
                    <Bar dataKey="avgPpsqft" radius={[6, 6, 0, 0]} fill="#3b82f6">
                      {byStories.map(g => (
                        <Cell key={g.stories} fill={STORY_COLORS[g.stories as keyof typeof STORY_COLORS]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* New vs Pre-Owned */}
              {newByStories.length > 0 && (
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
                  <h3 className="text-white font-semibold text-sm mb-4">New Construction vs Pre-Owned $/SqFt</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={newByStories} margin={{ top: 10, right: 20, bottom: 5, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 12 }} stroke="#334155" />
                      <YAxis tickFormatter={v => `$${v}`} tick={{ fill: '#64748b', fontSize: 11 }} stroke="#334155" />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9' }}
                        formatter={(v: number) => [`$${v.toFixed(2)}/sqft`]}
                      />
                      <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
                      <Bar dataKey="newConstruction" name="New Construction" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="preOwned" name="Pre-Owned" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div className="text-slate-500 text-xs">{label}</div>
      <div className="font-semibold text-sm" style={{ color: color || '#e2e8f0' }}>{value}</div>
    </div>
  );
}
