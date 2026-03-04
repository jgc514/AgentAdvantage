import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFilters } from '../context/FilterContext';
import apiService from '../services/api';
import StatsBar from '../components/Layout/StatsBar';
import FilterPanel from '../components/Filters/FilterPanel';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { mean } from '../utils/statistics';

export default function ListSoldRatio() {
  const { filters } = useFilters();

  const effectiveFilters = useMemo(() => ({
    ...filters,
    status: ['Sold'] as const,
  }), [filters]);

  const { data, isLoading } = useQuery({
    queryKey: ['properties', effectiveFilters],
    queryFn: () => apiService.getProperties(effectiveFilters as never),
    staleTime: 30_000,
  });

  const sold = useMemo(
    () => (data?.properties || []).filter(p => p.status === 'Sold' && p.trueSoldPrice > 0),
    [data]
  );

  const noPriceChange = useMemo(() => sold.filter(p => p.priceChanges === 0), [sold]);
  const withPriceChange = useMemo(() => sold.filter(p => p.priceChanges > 0), [sold]);

  const noChangeRatio = noPriceChange.length > 0
    ? mean(noPriceChange.map(p => p.soldPrice / p.originalListPrice)) : 0;
  const withChangeRatio = withPriceChange.length > 0
    ? mean(withPriceChange.map(p => p.soldPrice / p.originalListPrice)) : 0;
  const noDom = mean(noPriceChange.map(p => p.daysOnMarket));
  const withDom = mean(withPriceChange.map(p => p.daysOnMarket));
  const noConcessions = mean(noPriceChange.map(p => p.sellerConcessions));
  const withConcessions = mean(withPriceChange.map(p => p.sellerConcessions));
  const noListPpsqft = mean(noPriceChange.map(p => p.originalListPrice / p.sqft));
  const noSoldPpsqft = mean(noPriceChange.map(p => p.pricePerSqft));
  const withListPpsqft = mean(withPriceChange.map(p => p.originalListPrice / p.sqft));
  const withSoldPpsqft = mean(withPriceChange.map(p => p.pricePerSqft));

  const noPriceData = [
    { category: 'Avg List $/SqFt', value: parseFloat(noListPpsqft.toFixed(2)), color: '#3b82f6' },
    { category: 'Avg Sold $/SqFt', value: parseFloat(noSoldPpsqft.toFixed(2)), color: '#10b981' },
  ];

  const withPriceData = [
    { category: 'Avg List $/SqFt', value: parseFloat(withListPpsqft.toFixed(2)), color: '#f59e0b' },
    { category: 'Avg Sold $/SqFt', value: parseFloat(withSoldPpsqft.toFixed(2)), color: '#ef4444' },
  ];

  const priceChangeDist = useMemo(() => {
    const counts: Record<number, number> = {};
    sold.forEach(p => { counts[p.priceChanges] = (counts[p.priceChanges] || 0) + 1; });
    return Object.entries(counts)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([changes, count]) => ({
        changes: `${changes} change${Number(changes) !== 1 ? 's' : ''}`,
        count,
        avgRatio: mean(sold.filter(p => p.priceChanges === Number(changes)).map(p => (p.soldPrice / p.originalListPrice) * 100)),
      }));
  }, [sold]);

  return (
    <div className="flex flex-col h-full">
      <StatsBar stats={data?.stats || null} loading={isLoading} />
      <FilterPanel />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {isLoading ? (
          <div className="h-96 flex items-center justify-center text-slate-500">Loading data...</div>
        ) : sold.length === 0 ? (
          <div className="h-96 flex flex-col items-center justify-center text-slate-500 gap-2">
            <span className="text-4xl">⚖️</span>
            <p>No sold properties match current filters</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-6">
              <ComparisonPanel
                title="No Price Change"
                count={noPriceChange.length}
                ratio={noChangeRatio}
                dom={noDom}
                concessions={noConcessions}
                color="blue"
              />
              <ComparisonPanel
                title="One or More Price Changes"
                count={withPriceChange.length}
                ratio={withChangeRatio}
                dom={withDom}
                concessions={withConcessions}
                color="amber"
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
                <h3 className="text-white font-semibold text-sm mb-1">No Price Change: List vs Sold $/SqFt</h3>
                <p className="text-slate-400 text-xs mb-4">{noPriceChange.length} properties</p>
                <ChartPanel data={noPriceData} />
                <div className="text-center mt-3">
                  <span className="text-slate-400 text-sm">List:Sold Ratio: </span>
                  <span className="text-blue-400 font-bold text-lg">{(noChangeRatio * 100).toFixed(1)}%</span>
                </div>
              </div>

              <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
                <h3 className="text-white font-semibold text-sm mb-1">With Price Changes: List vs Sold $/SqFt</h3>
                <p className="text-slate-400 text-xs mb-4">{withPriceChange.length} properties</p>
                <ChartPanel data={withPriceData} />
                <div className="text-center mt-3">
                  <span className="text-slate-400 text-sm">List:Sold Ratio: </span>
                  <span className="text-amber-400 font-bold text-lg">{(withChangeRatio * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
              <h3 className="text-white font-semibold text-sm mb-4">List:Sold Ratio by Number of Price Changes</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={priceChangeDist} margin={{ top: 10, right: 20, bottom: 5, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="changes" tick={{ fill: '#94a3b8', fontSize: 12 }} stroke="#334155" />
                  <YAxis
                    tickFormatter={v => `${Number(v).toFixed(0)}%`}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    stroke="#334155"
                    domain={['auto', 'auto']}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9' }}
                    formatter={(v: number, _name, item) => [
                      `${v.toFixed(2)}% (${(item.payload as { count: number }).count} sales)`,
                      'Avg List:Sold %'
                    ]}
                  />
                  <ReferenceLine y={100} stroke="#64748b" strokeDasharray="4 2" label={{ value: '100% = List Price', fill: '#64748b', fontSize: 10 }} />
                  <Bar dataKey="avgRatio" name="List:Sold %" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ComparisonPanel({
  title, count, ratio, dom, concessions, color,
}: {
  title: string; count: number; ratio: number; dom: number; concessions: number; color: string;
}) {
  const borderColors: Record<string, string> = { blue: 'border-blue-800/50 bg-blue-950/20', amber: 'border-amber-800/50 bg-amber-950/20' };
  const textColors: Record<string, string> = { blue: 'text-blue-400', amber: 'text-amber-400' };
  return (
    <div className={`rounded-xl border p-5 ${borderColors[color]}`}>
      <h3 className="text-white font-semibold text-sm mb-3">{title}</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-slate-400 text-xs">Properties</div>
          <div className={`font-bold text-2xl ${textColors[color]}`}>{count}</div>
        </div>
        <div>
          <div className="text-slate-400 text-xs">List:Sold Ratio</div>
          <div className={`font-bold text-2xl ${textColors[color]}`}>{(ratio * 100).toFixed(1)}%</div>
        </div>
        <div>
          <div className="text-slate-400 text-xs">Avg DOM</div>
          <div className="text-slate-300 font-semibold text-lg">{dom.toFixed(0)} days</div>
        </div>
        <div>
          <div className="text-slate-400 text-xs">Avg Concessions</div>
          <div className="text-rose-400 font-semibold text-lg">${(concessions / 1000).toFixed(1)}K</div>
        </div>
      </div>
    </div>
  );
}

function ChartPanel({ data }: { data: { category: string; value: number; color: string }[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey="category" tick={{ fill: '#94a3b8', fontSize: 11 }} stroke="#334155" />
        <YAxis tickFormatter={v => `$${Number(v).toFixed(0)}`} tick={{ fill: '#64748b', fontSize: 11 }} stroke="#334155" />
        <Tooltip
          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9' }}
          formatter={(v: number) => [`$${Number(v).toFixed(2)}/sqft`]}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="#6366f1" />
      </BarChart>
    </ResponsiveContainer>
  );
}
