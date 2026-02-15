import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Link, useLocation } from 'react-router-dom';

import type { RootState } from '../store';

const items = [
  { label: 'Dashboard', icon: 'pi pi-chart-line', to: '/' },
  { label: 'Inventory', icon: 'pi pi-arrow-right-arrow-left', to: '/inventory' },
  { label: 'Reports', icon: 'pi pi-table', to: '/reports' },
  { label: 'Setup', icon: 'pi pi-cog', to: '/setup' }
];

export default function AppSidebar() {
  const collapsed = useSelector((state: RootState) => state.ui.sidebarCollapsed);
  const location = useLocation();

  const widthClass = useMemo(() => (collapsed ? 'w-16' : 'w-52'), [collapsed]);

  return (
    <aside className={`${widthClass} border-r border-slate-200 bg-white transition-all duration-200`}>
      <nav className="flex h-full flex-col gap-2 p-3">
        {items.map((item) => {
          const active = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);
          const isBottom = item.to === '/setup';
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`no-underline flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              } ${isBottom ? 'mt-auto' : ''}`}
            >
              <i className={`${item.icon} text-base`} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
