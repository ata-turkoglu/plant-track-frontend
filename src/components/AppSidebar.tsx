import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Link, useLocation } from 'react-router-dom';

import type { RootState } from '../store';

const items = [
  { label: 'Dashboard', icon: 'pi pi-chart-line', to: '/' },
  { label: 'Inventory', icon: 'pi pi-arrow-right-arrow-left', to: '/inventory' },
  { label: 'Malzemeler', icon: 'pi pi-box', to: '/materials' },
  { label: 'Suppliers', icon: 'pi pi-truck', to: '/suppliers' },
  { label: 'Customers', icon: 'pi pi-users', to: '/customers' },
  { label: 'Reports', icon: 'pi pi-table', to: '/reports' },
  { label: 'Setup', icon: 'pi pi-cog', to: '/setup' }
];

type AppSidebarProps = {
  collapsedOverride?: boolean;
  onNavigate?: () => void;
};

export default function AppSidebar({ collapsedOverride, onNavigate }: AppSidebarProps) {
  const collapsedFromStore = useSelector((state: RootState) => state.ui.sidebarCollapsed);
  const location = useLocation();

  const collapsed = collapsedOverride ?? collapsedFromStore;
  const widthClass = useMemo(() => (collapsed ? 'w-16' : 'w-60'), [collapsed]);

  return (
    <aside className={`${widthClass} sidebar-shadow-right border-r border-slate-200 bg-slate-100 transition-all duration-200`}>
      <nav className="flex h-full flex-col gap-1.5 p-3">
        {items.map((item) => {
          const active = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);
          const isBottom = item.to === '/setup';
          return (
            <Link
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              onClick={() => onNavigate?.()}
              className={[
                'group no-underline flex items-center gap-3 rounded-xl py-2 text-sm transition-all',
                collapsed ? 'justify-center px-2' : 'px-3',
                active
                  ? 'bg-slate-50 text-slate-900 shadow-sm ring-1 ring-slate-200'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800',
                isBottom ? 'mt-auto' : ''
              ].join(' ')}
            >
              <span
                className={[
                  'inline-flex h-9 w-9 items-center justify-center rounded-xl transition-colors',
                  active ? 'text-slate-700' : 'text-slate-500 group-hover:text-slate-700'
                ].join(' ')}
                aria-hidden
              >
                <i className={`${item.icon} text-base`} />
              </span>
              {!collapsed && <span className="truncate font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
