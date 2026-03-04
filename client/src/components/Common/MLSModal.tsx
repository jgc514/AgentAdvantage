import { useState } from 'react';
import { Property } from '../../types';
import { formatFullCurrency } from '../../utils/statistics';

const STATUS_COLORS: Record<string, string> = {
  Sold: '#10b981', Active: '#3b82f6', New: '#6366f1', 'Price Change': '#f59e0b',
  Pending: '#8b5cf6', Expired: '#ef4444', Canceled: '#f97316', Withdrawn: '#eab308',
  Backup: '#06b6d4', 'Coming Soon': '#ec4899',
};

export default function MLSModal({ property: p, onClose }: { property: Property; onClose: () => void }) {
  const [imgIdx, setImgIdx] = useState(0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Image gallery */}
        <div className="relative">
          {p.images?.length > 0 ? (
            <img
              src={p.images[imgIdx]}
              alt={`${p.address} photo ${imgIdx + 1}`}
              className="w-full h-64 object-cover rounded-t-2xl"
              onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/800x400/1e293b/475569?text=No+Image'; }}
            />
          ) : (
            <div className="w-full h-64 bg-slate-800 rounded-t-2xl flex items-center justify-center text-slate-500">No Images</div>
          )}
          {p.images?.length > 1 && (
            <div className="absolute bottom-2 right-2 flex gap-1">
              {p.images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setImgIdx(i)}
                  className={`w-2 h-2 rounded-full transition-colors ${i === imgIdx ? 'bg-white' : 'bg-white/40'}`}
                />
              ))}
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-sm text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
          <div
            className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold"
            style={{ backgroundColor: (STATUS_COLORS[p.status] || '#64748b') + 'cc', color: 'white' }}
          >
            {p.status}
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-white font-bold text-xl">{p.address}</h2>
              <p className="text-slate-400 text-sm mt-0.5">{p.subdivision} · {p.schoolDistrict}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-emerald-400 font-bold text-xl">
                {formatFullCurrency(p.trueSoldPrice || p.soldPrice || p.listPrice)}
              </div>
              <div className="text-slate-400 text-xs">${p.pricePerSqft.toFixed(0)}/sqft</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-5">
            <MLSStat label="MLS #" value={p.mlsNumber} />
            <MLSStat label="Bedrooms" value={String(p.bedrooms)} />
            <MLSStat label="Bathrooms" value={String(p.bathrooms)} />
            <MLSStat label="Sq Ft" value={p.sqft.toLocaleString()} />
            <MLSStat label="Lot Size" value={`${p.lotSize} acres`} />
            <MLSStat label="Year Built" value={String(p.yearBuilt)} />
            <MLSStat label="Stories" value={String(p.stories)} />
            <MLSStat label="Garage" value={`${p.garageSpaces} car`} />
            <MLSStat label="DOM" value={`${p.daysOnMarket} days`} />
          </div>

          {p.status === 'Sold' && (
            <div className="grid grid-cols-2 gap-4 mb-5 p-4 bg-slate-800 rounded-xl">
              <MLSStat label="List Price" value={formatFullCurrency(p.originalListPrice)} />
              <MLSStat label="Sold Price" value={formatFullCurrency(p.soldPrice)} />
              {p.sellerConcessions > 0 && (
                <MLSStat label="Seller Concessions" value={formatFullCurrency(p.sellerConcessions)} valueClass="text-rose-400" />
              )}
              <MLSStat label="True Sold Price" value={formatFullCurrency(p.trueSoldPrice)} valueClass="text-emerald-400" />
              <MLSStat label="Price Changes" value={String(p.priceChanges)} />
              {p.soldDate && <MLSStat label="Sold Date" value={p.soldDate} />}
              <MLSStat label="List:Sold Ratio" value={p.soldPrice > 0 ? `${((p.soldPrice / p.originalListPrice) * 100).toFixed(1)}%` : 'N/A'} />
            </div>
          )}

          <div className="mb-4">
            <h3 className="text-slate-300 font-semibold text-sm mb-2">Amenities</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(p.amenities).map(([key, val]) =>
                val ? (
                  <span key={key} className="bg-brand-900 text-brand-300 border border-brand-700 text-xs px-2.5 py-1 rounded-full">
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                  </span>
                ) : null
              )}
            </div>
          </div>

          <div>
            <h3 className="text-slate-300 font-semibold text-sm mb-2">Description</h3>
            <p className="text-slate-400 text-sm leading-relaxed">{p.description}</p>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-700 flex items-center justify-between">
            <div className="text-slate-500 text-xs">Listed: {p.listDate}</div>
            <div className="flex items-center gap-1">
              <span className={`text-xs font-semibold ${p.newConstruction ? 'text-brand-400' : 'text-slate-400'}`}>
                {p.newConstruction ? '🏗️ New Construction' : '🏠 Pre-Owned'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MLSStat({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="bg-slate-800/50 rounded-lg p-2.5">
      <div className="text-slate-500 text-xs mb-0.5">{label}</div>
      <div className={`text-sm font-semibold ${valueClass || 'text-white'}`}>{value}</div>
    </div>
  );
}
