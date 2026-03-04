import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFilters } from '../context/FilterContext';
import { Amenities as AmenitiesType, Property } from '../types';
import apiService from '../services/api';
import StatsBar from '../components/Layout/StatsBar';
import FilterPanel from '../components/Filters/FilterPanel';
import ScatterPlotChart from '../components/Charts/ScatterPlotChart';
import { formatFullCurrency, mean } from '../utils/statistics';

type AmenityKey = keyof AmenitiesType;

const AMENITY_OPTIONS: { key: AmenityKey; label: string; withColor: string; withoutColor: string }[] = [
  { key: 'pool', label: 'Pool', withColor: '#3b82f6', withoutColor: '#94a3b8' },
  { key: 'adu', label: 'ADU', withColor: '#8b5cf6', withoutColor: '#94a3b8' },
  { key: 'shop', label: 'Shop', withColor: '#f59e0b', withoutColor: '#94a3b8' },
  { key: 'pond', label: 'Pond', withColor: '#06b6d4', withoutColor: '#94a3b8' },
  { key: 'fireplace', label: 'Fireplace', withColor: '#ef4444', withoutColor: '#94a3b8' },
  { key: 'hotTub', label: 'Hot Tub', withColor: '#ec4899', withoutColor: '#94a3b8' },
  { key: 'solarPanels', label: 'Solar Panels', withColor: '#f97316', withoutColor: '#94a3b8' },
  { key: 'outdoorKitchen', label: 'Outdoor Kitchen', withColor: '#10b981', withoutColor: '#94a3b8' },
  { key: 'greenbeltView', label: 'Greenbelt View', withColor: '#22c55e', withoutColor: '#94a3b8' },
  { key: 'waterView', label: 'Water View', withColor: '#0ea5e9', withoutColor: '#94a3b8' },
];

export default function AmenitiesDashboard() {
  const { filters } = useFilters();
  const [selectedAmenity, setSelectedAmenity] = useState<AmenityKey>('pool');

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

  const amenityOption = AMENITY_OPTIONS.find(a => a.key === selectedAmenity)!;

  const withAmenity = useMemo(() => sold.filter(p => p.amenities[selectedAmenity]), [sold, selectedAmenity]);
  const withoutAmenity = useMemo(() => sold.filter(p => !p.amenities[selectedAmenity]), [sold, selectedAmenity]);

  const avgPpsqftWith = useMemo(() => mean(withAmenity.map(p => p.pricePerSqft)), [withAmenity]);
  const avgPpsqftWithout = useMemo(() => mean(withoutAmenity.map(p => p.pricePerSqft)), [withoutAmenity]);
  const ppsqftDiff = avgPpsqftWith - avgPpsqftWithout;
  const ppsqftDiffPct = avgPpsqftWithout > 0 ? (ppsqftDiff / avgPpsqftWithout * 100) : 0;

  const avgSoldWith = useMemo(() => mean(withAmenity.map(p => p.trueSoldPrice)), [withAmenity]);
  const avgSoldWithout = useMemo(() => mean(withoutAmenity.map(p => p.trueSoldPrice)), [withoutAmenity]);

  const getColor = (p: Property) =>
    p.amenities[selectedAmenity] ? amenityOption.withColor : amenityOption.withoutColor;

  return (
    <div className="flex flex-col h-full">
      <StatsBar stats={data?.stats || null} loading={isLoading} />
      <FilterPanel />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Amenity selector */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          <h3 className="text-white font-semibold text-sm mb-3">Select Amenity to Analyze</h3>
          <div className="flex flex-wrap gap-2">
            {AMENITY_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => setSelectedAmenity(opt.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                  selectedAmenity === opt.key
                    ? 'border-transparent text-white'
                    : 'border-slate-600 text-slate-400 hover:text-white hover:border-slate-500'
                }`}
                style={selectedAmenity === opt.key ? { backgroundColor: opt.withColor + '33', borderColor: opt.withColor, color: opt.withColor } : {}}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Impact stats */}
        {sold.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ImpactCard
              label={`With ${amenityOption.label}`}
              count={withAmenity.length}
              avgPpsqft={avgPpsqftWith}
              avgSold={avgSoldWith}
              color={amenityOption.withColor}
            />
            <ImpactCard
              label={`Without ${amenityOption.label}`}
              count={withoutAmenity.length}
              avgPpsqft={avgPpsqftWithout}
              avgSold={avgSoldWithout}
              color={amenityOption.withoutColor}
            />
            <div className="col-span-2 bg-slate-800 rounded-xl border border-slate-700 p-4 flex items-center gap-6">
              <div>
                <div className="text-slate-400 text-xs mb-1">$/SqFt Impact</div>
                <div className={`text-2xl font-bold ${ppsqftDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {ppsqftDiff >= 0 ? '+' : ''}{ppsqftDiff.toFixed(2)}/sqft
                </div>
              </div>
              <div>
                <div className="text-slate-400 text-xs mb-1">Premium</div>
                <div className={`text-2xl font-bold ${ppsqftDiffPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {ppsqftDiffPct >= 0 ? '+' : ''}{ppsqftDiffPct.toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-slate-400 text-xs mb-1">Avg Sold Difference</div>
                <div className={`text-lg font-bold ${avgSoldWith - avgSoldWithout >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {avgSoldWith - avgSoldWithout >= 0 ? '+' : ''}{formatFullCurrency(avgSoldWith - avgSoldWithout)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Chart */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          {isLoading ? (
            <div className="h-96 flex items-center justify-center text-slate-500">Loading data...</div>
          ) : sold.length === 0 ? (
            <div className="h-96 flex flex-col items-center justify-center text-slate-500 gap-2">
              <span className="text-4xl">🏊</span>
              <p>No sold properties match current filters</p>
            </div>
          ) : (
            <ScatterPlotChart
              title={`Amenities Impact: ${amenityOption.label} — ${sold.length} properties`}
              properties={sold}
              getX={p => p.sqft}
              getY={p => p.trueSoldPrice}
              getColor={getColor}
              xLabel="Square Footage"
              yLabel="True Sold Price"
              showRegression
              showConfidenceBands
              height={480}
              legendItems={[
                { color: amenityOption.withColor, label: `With ${amenityOption.label} (${withAmenity.length})` },
                { color: amenityOption.withoutColor, label: `Without ${amenityOption.label} (${withoutAmenity.length})` },
                { color: '#22d3ee', label: 'Regression Trend' },
                { color: '#3b82f6', label: '95% CI Band' },
              ]}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ImpactCard({
  label, count, avgPpsqft, avgSold, color,
}: {
  label: string; count: number; avgPpsqft: number; avgSold: number; color: string;
}) {
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        <span className="text-white font-medium text-sm">{label}</span>
      </div>
      <div className="space-y-2">
        <div>
          <div className="text-slate-500 text-xs">Properties</div>
          <div className="text-white font-bold text-lg">{count}</div>
        </div>
        <div>
          <div className="text-slate-500 text-xs">Avg $/SqFt</div>
          <div className="font-bold text-base" style={{ color }}>${avgPpsqft.toFixed(0)}</div>
        </div>
        <div>
          <div className="text-slate-500 text-xs">Avg Sold Price</div>
          <div className="text-slate-300 text-sm">{formatFullCurrency(avgSold)}</div>
        </div>
      </div>
    </div>
  );
}
