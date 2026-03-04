import { useFilters } from '../../context/FilterContext';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
}

export default function Header({ title, subtitle, onToggleSidebar, sidebarCollapsed }: HeaderProps) {
  const { setIsOpen, isOpen, resetFilters, filters } = useFilters();
  const activeFiltersCount = [
    filters.status.length,
    filters.zipCodes.length,
    filters.schoolDistricts.length,
    filters.neighborhoods.length,
    filters.subdivisions.length,
    filters.minSqft ? 1 : 0,
    filters.maxSqft ? 1 : 0,
    filters.minPrice ? 1 : 0,
    filters.maxPrice ? 1 : 0,
    filters.stories.length,
    Object.values(filters.amenities).filter(Boolean).length,
    filters.newConstruction ? 1 : 0,
    filters.startDate ? 1 : 0,
    filters.endDate ? 1 : 0,
    filters.radiusMiles ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <header className="bg-slate-900 border-b border-slate-700 px-6 py-4 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="text-slate-400 hover:text-white transition-colors"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div>
          <h1 className="text-white font-bold text-lg leading-tight">{title}</h1>
          {subtitle && <p className="text-slate-400 text-xs mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {activeFiltersCount > 0 && (
          <button
            onClick={resetFilters}
            className="text-xs text-slate-400 hover:text-white border border-slate-600 hover:border-slate-400 px-3 py-1.5 rounded-lg transition-colors"
          >
            Clear filters ({activeFiltersCount})
          </button>
        )}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            isOpen ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
          </svg>
          Filters
          {activeFiltersCount > 0 && (
            <span className="bg-brand-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
