import { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useLocation } from 'react-router-dom';
import { Button } from 'primereact/button';

import type { RootState } from '../store';
import { toggleSidebar } from '../store/uiSlice';
import { useMediaQuery } from '../hooks/useMediaQuery';

const items = [
  { label: 'Ana Sayfa', icon: 'pi pi-chart-line', to: '/' },
  { label: 'Stok Hareketleri', icon: 'pi pi-arrow-right-arrow-left', to: '/inventory' },
  { label: 'Malzemeler', icon: 'pi pi-box', to: '/materials' },
  { label: 'Tedarikçiler', icon: 'pi pi-truck', to: '/suppliers' },
  { label: 'Müşteriler', icon: 'pi pi-users', to: '/customers' },
  { label: 'Raporlar', icon: 'pi pi-table', to: '/reports' },
  { label: 'Ayarlar', icon: 'pi pi-cog', to: '/setup' }
];

type AppSidebarProps = {
  collapsedOverride?: boolean;
  onNavigate?: () => void;
};

export default function AppSidebar({ collapsedOverride, onNavigate }: AppSidebarProps) {
  const dispatch = useDispatch();
  const collapsedFromStore = useSelector((state: RootState) => state.ui.sidebarCollapsed);
  const location = useLocation();
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const collapsed = collapsedOverride ?? collapsedFromStore;
  const widthClass = useMemo(() => (collapsed ? 'w-16' : 'w-60'), [collapsed]);

  return (
    <aside className={`${widthClass} relative sidebar-shadow-right border-r border-slate-300 bg-neutral-200 transition-all duration-200`}>
      {isDesktop ? (
        <Button
          icon={collapsed ? 'pi pi-angle-right' : 'pi pi-angle-left'}
          rounded
          aria-label="Collapse sidebar"
          onClick={() => dispatch(toggleSidebar())}
          className="!absolute -right-3 -top-3 z-20 !h-6 !w-6 !border !border-slate-200 !bg-neutral-300 !text-slate-600 shadow-sm hover:!bg-white"
        />
      ) : null}
      <nav className="flex h-full flex-col gap-1.5 p-3">
        {!isDesktop ? (
          <div className="flex justify-end">
            <Button icon="pi pi-times" rounded text size="small" aria-label="Close menu" onClick={() => onNavigate?.()} />
          </div>
        ) : null}
        {items.map((item) => {
          const active = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);
          const isBottom = item.to === '/setup';
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => onNavigate?.()}
              className={[
                'group relative no-underline flex items-center gap-3 rounded-xl border py-2 text-sm transition-all',
                collapsed ? 'justify-center px-2' : 'px-3',
                active
                  ? 'border-2 border-sky-500 bg-white text-slate-900 shadow-sm'
                  : 'border border-slate-100 text-slate-600 hover:bg-slate-50 hover:text-slate-800',
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
                {collapsed && (
                  <span
                    className="pointer-events-none absolute left-full z-[1000] ml-2 hidden whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white shadow-lg group-hover:block group-focus-visible:block"
                    role="tooltip"
                  >
                    {item.label}
                  </span>
                )}
              </Link>
          );
        })}
      </nav>
    </aside>
  );
}
