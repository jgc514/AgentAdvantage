import { useEffect, useState } from 'react';
import { useFilters } from '../../context/FilterContext';
import { useQuery } from '@tanstack/react-query';
import apiService from '../../services/api';
import { PropertyStatus, Amenities } from '../../types';

const ALL_STATUSES: PropertyStatus[] = [
  'Sold', 'Active', 'New', 'Price Change', 'Pending',
  'Expired', 'Canceled', 'Withdrawn', 'Backup', 'Coming Soon',
];

const AMENITY_LABELS: { key: keyof Amenities; label: string }[] = [
  { key: 'pool', label: 'Pool' },
  { key: 'adu', label: 'ADU / Guest House' },
  { key: 'shop', label: 'Shop / Garage Workshop' },
  { key: 'pond', label: 'Pond' },
  { key: 'fireplace', label: 'Fireplace' },
  { key: 'hotTub', label: 'Hot Tub' },
  { key: 'solarPanels', label: 'Solar Panels' },
  { key: 'coveredPatio', label: 'Covered Patio' },
  { key: 'outdoorKitchen', label: 'Outdoor Kitchen' },
  { key: 'guestHouse', label: 'Guest House' },
  { key: 'barnOrStable', label: 'Barn / Stable' },
  { key: 'waterFeature', label: 'Water Feature' },
  { key: 'greenbeltView', label: 'Greenbelt View' },
  { key: 'waterView', label: 'Water View' },
];

export default function FilterPanel() {
  const { filters, isOpen, setFilter, toggleStatus, toggleStory, toggleAmenity } = useFilters();
  const { data: meta } = useQuery({ queryKey: ['meta'], queryFn: apiService.getMeta });

  if (!isOpen) return null;

  return (
    <div className="bg-slate-850 border-b border-slate-700 overflow-y-auto" style={{ maxHeight: '480px' }}>
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

        {/* MLS Status */}
        <div>
          <label className="filter-section-label">MLS Status</label>
          <div className="grid grid-cols-2 gap-1 mt-1.5">
            {ALL_STATUSES.map(s => (
              <label key={s} className="flex items-center gap-1.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={filters.status.includes(s)}
                  onChange={() => toggleStatus(s)}
                  className="rounded border-slate-600 bg-slate-800 text-brand-500 focus:ring-brand-500 focus:ring-offset-slate-900"
                />
                <span className="text-xs text-slate-300 group-hover:text-white transition-colors">{s}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="filter-section-label">Location</label>
          <div className="space-y-2 mt-1.5">
            <FilterMultiSelect
              label="Zip Codes"
              options={meta?.zipCodes || []}
              selected={filters.zipCodes}
              onChange={v => setFilter('zipCodes', v)}
            />
            <FilterMultiSelect
              label="School Districts"
              options={meta?.schoolDistricts || []}
              selected={filters.schoolDistricts}
              onChange={v => setFilter('schoolDistricts', v)}
            />
            <FilterMultiSelect
              label="Neighborhoods"
              options={meta?.neighborhoods || []}
              selected={filters.neighborhoods}
              onChange={v => setFilter('neighborhoods', v)}
            />
            <FilterMultiSelect
              label="Subdivisions"
              options={meta?.subdivisions || []}
              selected={filters.subdivisions}
              onChange={v => setFilter('subdivisions', v)}
            />
          </div>
        </div>

        {/* Property Details */}
        <div>
          <label className="filter-section-label">Property Details</label>
          <div className="space-y-2 mt-1.5">
            <RangeInput label="SqFt" minKey="minSqft" maxKey="maxSqft" />
            <RangeInput label="Price ($)" minKey="minPrice" maxKey="maxPrice" />
            <RangeInput label="Bedrooms" minKey="minBedrooms" maxKey="maxBedrooms" />
            <div>
              <span className="text-xs text-slate-400 block mb-1">Min Bathrooms</span>
              <input
                type="number"
                min="0"
                max="10"
                step="0.5"
                value={filters.minBathrooms}
                onChange={e => setFilter('minBathrooms', e.target.value)}
                className="filter-input w-full"
                placeholder="e.g. 2"
              />
            </div>
            <RangeInput label="Lot Size (acres)" minKey="minLotSize" maxKey="maxLotSize" />
            <RangeInput label="Year Built" minKey="minYearBuilt" maxKey="maxYearBuilt" />
          </div>
        </div>

        {/* Stories / New Construction / Dates */}
        <div>
          <label className="filter-section-label">Stories</label>
          <div className="flex gap-2 mt-1.5">
            {[1, 2, 3].map(n => (
              <label key={n} className="flex items-center gap-1.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={filters.stories.includes(n)}
                  onChange={() => toggleStory(n)}
                  className="rounded border-slate-600 bg-slate-800 text-brand-500 focus:ring-brand-500"
                />
                <span className="text-xs text-slate-300 group-hover:text-white">{n}</span>
              </label>
            ))}
          </div>

          <label className="filter-section-label mt-4">Construction Type</label>
          <div className="flex gap-4 mt-1.5">
            {(['', 'true', 'false'] as const).map(v => (
              <label key={v} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="newConstruction"
                  value={v}
                  checked={filters.newConstruction === v}
                  onChange={() => setFilter('newConstruction', v)}
                  className="text-brand-500"
                />
                <span className="text-xs text-slate-300">{v === '' ? 'All' : v === 'true' ? 'New' : 'Pre-Owned'}</span>
              </label>
            ))}
          </div>

          <label className="filter-section-label mt-4">Date Range</label>
          <div className="space-y-2 mt-1.5">
            <div>
              <span className="text-xs text-slate-500">From</span>
              <input type="date" value={filters.startDate} onChange={e => setFilter('startDate', e.target.value)} className="filter-input w-full mt-0.5" />
            </div>
            <div>
              <span className="text-xs text-slate-500">To</span>
              <input type="date" value={filters.endDate} onChange={e => setFilter('endDate', e.target.value)} className="filter-input w-full mt-0.5" />
            </div>
          </div>

          <label className="filter-section-label mt-4">Amenities</label>
          <div className="grid grid-cols-2 gap-1 mt-1.5">
            {AMENITY_LABELS.map(({ key, label }) => (
              <label key={key} className="flex items-center gap-1.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={!!filters.amenities[key]}
                  onChange={() => toggleAmenity(key)}
                  className="rounded border-slate-600 bg-slate-800 text-brand-500 focus:ring-brand-500"
                />
                <span className="text-xs text-slate-300 group-hover:text-white transition-colors">{label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterMultiSelect({
  label, options, selected, onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <span className="text-xs text-slate-400">{label}</span>
      <button
        onClick={() => setOpen(!open)}
        className="filter-input w-full text-left flex items-center justify-between mt-0.5"
      >
        <span className="truncate">
          {selected.length === 0 ? 'All' : selected.length === 1 ? selected[0] : `${selected.length} selected`}
        </span>
        <svg className={`w-3 h-3 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="mt-1 max-h-40 overflow-y-auto bg-slate-800 rounded-lg border border-slate-600 p-2 space-y-1 z-10">
          {options.map(opt => (
            <label key={opt} className="flex items-center gap-2 cursor-pointer hover:bg-slate-700 px-1.5 py-0.5 rounded">
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => onChange(selected.includes(opt) ? selected.filter(x => x !== opt) : [...selected, opt])}
                className="rounded border-slate-600 bg-slate-700 text-brand-500"
              />
              <span className="text-xs text-slate-300">{opt}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function RangeInput({ label, minKey, maxKey }: { label: string; minKey: keyof import('../../types').Filters; maxKey: keyof import('../../types').Filters }) {
  const { filters, setFilter } = useFilters();
  return (
    <div>
      <span className="text-xs text-slate-400 block">{label}</span>
      <div className="flex gap-1 mt-0.5">
        <input
          type="number"
          placeholder="Min"
          value={filters[minKey] as string}
          onChange={e => setFilter(minKey, e.target.value as never)}
          className="filter-input w-full"
        />
        <input
          type="number"
          placeholder="Max"
          value={filters[maxKey] as string}
          onChange={e => setFilter(maxKey, e.target.value as never)}
          className="filter-input w-full"
        />
      </div>
    </div>
  );
}
