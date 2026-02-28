import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Avatar } from 'primereact/avatar';
import { Menu } from 'primereact/menu';
import type { Menu as MenuType } from 'primereact/menu';

import type { AppDispatch, RootState } from '../store';
import { closeMobileSidebar } from '../store/uiSlice';
import { logout } from '../store/userSlice';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useI18n } from '../hooks/useI18n';

export default function AppHeader() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();
  const menuRef = useRef<MenuType>(null);
  const user = useSelector((state: RootState) => state.user);
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const { t } = useI18n();
  useEffect(() => {
    if (isDesktop) dispatch(closeMobileSidebar());
  }, [dispatch, isDesktop]);

  const pageTitle = (() => {
    const path = location.pathname;
    if (path === '/') return t('nav.dashboard', 'Dashboard');
    if (path.startsWith('/inventory')) return t('nav.inventory', 'Inventory');
    if (path.startsWith('/materials')) return t('nav.materials', 'Materials');
    if (path.startsWith('/assets')) return t('nav.assets', 'Assets');
    if (path.startsWith('/suppliers')) return t('nav.suppliers', 'Suppliers');
    if (path.startsWith('/customers')) return t('nav.customers', 'Customers');
    if (path.startsWith('/reports')) return t('nav.reports', 'Reports');
    if (path.startsWith('/profile')) return t('nav.profile', 'Profile');
    if (path === '/setup') return t('nav.settings', 'Settings');
    if (path.startsWith('/setup/organization')) return `${t('nav.settings', 'Settings')} / ${t('setup.tab.organization', 'Organization')}`;
    if (path.startsWith('/setup/warehouses')) return `${t('nav.settings', 'Settings')} / ${t('setup.tab.warehouses', 'Warehouses')}`;
    if (path.startsWith('/setup/asset-cards')) return `${t('nav.settings', 'Settings')} / ${t('setup.tab.asset_types', 'Asset Cards')}`;
    if (path.startsWith('/setup/translations')) return `${t('nav.settings', 'Settings')} / ${t('setup.tab.translations', 'Translations')}`;
    if (path.startsWith('/setup/units')) return `${t('nav.settings', 'Settings')} / ${t('setup.tab.units', 'Units')}`;
    if (path.startsWith('/setup')) return t('nav.settings', 'Settings');
    return '';
  })();

  const menuItems = [
    {
      label: 'Profile',
      icon: 'pi pi-user',
      command: () => navigate('/profile')
    },
    {
      label: 'Logout',
      icon: 'pi pi-sign-out',
      command: () => {
        dispatch(logout());
        navigate('/auth/login');
      }
    }
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-50 grid h-16 grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-slate-300 bg-neutral-200 px-4 shadow-sm">
      <div className="flex items-center gap-3">
        <Link to="/" aria-label="Go to dashboard" className="inline-flex">
          <img src="/images/logo.webp" alt="PlantTrack" className="h-9 w-9 rounded-md object-cover" />
        </Link>
        <span className="text-sm font-semibold text-slate-900" style={{ textShadow: '0 1px 2px rgba(15, 23, 42, 0.18)' }}>
          PlantTrack
        </span>
      </div>

      <div className="min-w-0 text-center">
        {pageTitle ? (
          <span className="block truncate text-md font-semibold text-slate-800">{pageTitle}</span>
        ) : null}
      </div>

      <div className="flex items-center gap-3 justify-self-end">
        <button
          type="button"
          className="group border-none cursor-pointer inline-flex items-center gap-2 rounded-full bg-slate-50 px-2 py-1 shadow-sm transition-colors hover:bg-white hover:shadow-sm"
          onClick={(event) => menuRef.current?.toggle(event)}
          aria-controls="user_menu"
          aria-haspopup
        >
          <Avatar
            label={(user.name?.[0] ?? 'U').toUpperCase()}
            shape="circle"
            className="h-8 w-8 bg-slate-300 text-slate-700"
          />
          <div className="hidden min-w-0 flex-col text-left md:flex">
            <span className="max-w-[160px] truncate text-xs font-semibold text-slate-900">{user.name}</span>
            <span className="max-w-[160px] truncate text-[11px] text-slate-600">{user.role}</span>
          </div>
          <i className="pi pi-chevron-down text-[11px] text-slate-500 transition-transform group-hover:text-slate-700" />
        </button>
        <Menu model={menuItems} popup popupAlignment="right" id="user_menu" ref={menuRef} />
      </div>
    </header>
  );
}
