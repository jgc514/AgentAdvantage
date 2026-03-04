import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import CsvUploadButton from './CsvUploadButton';

const navItems = [
  { path: '/', label: 'Sold Price Analysis', icon: '📈' },
  { path: '/expired-canceled', label: 'Expired / Canceled', icon: '🚫' },
  { path: '/amenities', label: 'Amenities Impact', icon: '🏊' },
  { path: '/outlier', label: 'Am I an Outlier?', icon: '🎯' },
  { path: '/street-stats', label: 'Street Stats', icon: '🛣️' },
  { path: '/stories', label: 'Stories Comparison', icon: '🏢' },
  { path: '/active-price', label: 'Active Price Analysis', icon: '🏷️' },
  { path: '/active-dom', label: 'Active Price vs DOM', icon: '📅' },
  { path: '/list-sold-ratio', label: 'List:Sold Ratio', icon: '⚖️' },
  { path: '/subdivisions', label: 'Subdivision Stats', icon: '🏘️' },
];

export default function Sidebar({ collapsed }: { collapsed: boolean }) {
  const { user, logout } = useAuth();

  return (
    <aside
      className={`flex flex-col bg-slate-900 border-r border-slate-700 transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      } h-full overflow-hidden`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-700">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold text-sm">
          AA
        </div>
        {!collapsed && (
          <div>
            <div className="text-white font-bold text-sm leading-tight">Agent Advantage</div>
            <div className="text-slate-400 text-xs">Real Estate Analytics</div>
          </div>
        )}
      </div>

      {/* CSV Import — always visible below logo */}
      <div className="border-b border-slate-700 py-2">
        <CsvUploadButton collapsed={collapsed} />
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <div className={`px-3 mb-2 ${collapsed ? 'hidden' : ''}`}>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Dashboards</span>
        </div>
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg mb-0.5 transition-colors text-sm ${
                isActive
                  ? 'bg-brand-700 text-white font-medium'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <span className="text-base flex-shrink-0">{item.icon}</span>
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-slate-700 p-3 flex-shrink-0">
        <div className={`flex items-center gap-3 px-2 py-2 rounded-lg ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
            {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-medium truncate">{user?.name}</div>
              <div className="text-slate-400 text-xs capitalize">{user?.role}</div>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={logout}
              className="text-slate-500 hover:text-white transition-colors ml-auto"
              title="Sign out"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
