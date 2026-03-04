import { StatsResult } from '../../types';
import { formatFullCurrency, formatNumber, pct } from '../../utils/statistics';

interface StatsBarProps {
  stats: StatsResult | null;
  loading?: boolean;
}

export default function StatsBar({ stats, loading }: StatsBarProps) {
  const items = stats
    ? [
        { label: 'Avg Sold Price', value: formatFullCurrency(stats.avgSoldPrice), color: 'text-emerald-400' },
        { label: 'Avg $/SqFt', value: `$${stats.avgPricePerSqft.toFixed(2)}`, color: 'text-sky-400' },
        { label: 'Median Sold', value: formatFullCurrency(stats.medianSoldPrice), color: 'text-violet-400' },
        { label: 'Avg DOM', value: `${stats.avgDOM} days`, color: 'text-amber-400' },
        { label: 'List:Sold Ratio', value: pct(stats.listSoldRatio), color: 'text-rose-400' },
        { label: 'Months Inventory', value: `${stats.monthsInventory}mo`, color: 'text-orange-400' },
        { label: 'Total Volume', value: `$${(stats.totalVolume / 1_000_000).toFixed(1)}M`, color: 'text-teal-400' },
        { label: 'Properties', value: formatNumber(stats.totalProperties), color: 'text-slate-300' },
      ]
    : [];

  if (loading) {
    return (
      <div className="bg-slate-900 border-b border-slate-700 px-6 py-3 flex gap-6 overflow-x-auto">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 animate-pulse">
            <div className="h-3 w-16 bg-slate-700 rounded mb-1.5" />
            <div className="h-5 w-20 bg-slate-700 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border-b border-slate-700 px-6 py-3 flex gap-6 overflow-x-auto scrollbar-none">
      {items.map(item => (
        <div key={item.label} className="flex-shrink-0">
          <div className="text-xs text-slate-500 font-medium mb-0.5 whitespace-nowrap">{item.label}</div>
          <div className={`text-sm font-bold whitespace-nowrap ${item.color}`}>{item.value}</div>
        </div>
      ))}
      {!stats && !loading && (
        <div className="text-slate-500 text-sm py-1">No data for current filters</div>
      )}
    </div>
  );
}
