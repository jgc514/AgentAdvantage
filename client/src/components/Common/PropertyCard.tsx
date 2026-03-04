import { Property } from '../../types';
import { formatFullCurrency } from '../../utils/statistics';

const STATUS_COLORS: Record<string, string> = {
  Sold: '#10b981',
  Active: '#3b82f6',
  New: '#6366f1',
  'Price Change': '#f59e0b',
  Pending: '#8b5cf6',
  Expired: '#ef4444',
  Canceled: '#f97316',
  Withdrawn: '#eab308',
  Backup: '#06b6d4',
  'Coming Soon': '#ec4899',
};

export default function PropertyCard({ property: p }: { property: Property }) {
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-xl shadow-2xl p-4 w-72 pointer-events-none">
      {p.images?.[0] && (
        <img
          src={p.images[0]}
          alt={p.address}
          className="w-full h-32 object-cover rounded-lg mb-3"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      )}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="text-white font-semibold text-sm leading-tight flex-1">{p.address}</div>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: (STATUS_COLORS[p.status] || '#64748b') + '22', color: STATUS_COLORS[p.status] || '#94a3b8' }}
        >
          {p.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
        <Stat label="Sold Price" value={formatFullCurrency(p.trueSoldPrice || p.soldPrice || p.listPrice)} highlight />
        <Stat label="$/SqFt" value={`$${p.pricePerSqft.toFixed(0)}`} highlight />
        <Stat label="SqFt" value={p.sqft.toLocaleString()} />
        <Stat label="Lot" value={`${p.lotSize} ac`} />
        <Stat label="Bed/Bath" value={`${p.bedrooms}bd / ${p.bathrooms}ba`} />
        <Stat label="Stories" value={String(p.stories)} />
        {p.sellerConcessions > 0 && (
          <Stat label="Concessions" value={formatFullCurrency(p.sellerConcessions)} className="text-rose-400" />
        )}
        {p.daysOnMarket > 0 && <Stat label="DOM" value={`${p.daysOnMarket} days`} />}
        <Stat label="Year Built" value={String(p.yearBuilt)} />
        <Stat label="MLS #" value={p.mlsNumber} />
      </div>

      {p.amenities && (
        <div className="mt-2 flex flex-wrap gap-1">
          {p.amenities.pool && <Tag label="Pool" />}
          {p.amenities.adu && <Tag label="ADU" />}
          {p.amenities.shop && <Tag label="Shop" />}
          {p.amenities.pond && <Tag label="Pond" />}
        </div>
      )}

      <p className="mt-2 text-xs text-slate-500">Click to view MLS listing</p>
    </div>
  );
}

function Stat({ label, value, highlight, className }: { label: string; value: string; highlight?: boolean; className?: string }) {
  return (
    <div>
      <span className="text-slate-500">{label}: </span>
      <span className={highlight ? 'text-emerald-400 font-semibold' : `text-slate-300 ${className || ''}`}>{value}</span>
    </div>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <span className="bg-slate-700 text-slate-300 text-xs px-1.5 py-0.5 rounded">{label}</span>
  );
}
