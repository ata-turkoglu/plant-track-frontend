import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { Avatar } from 'primereact/avatar';
import { Button } from 'primereact/button';
import { Menu } from 'primereact/menu';
import type { Menu as MenuType } from 'primereact/menu';

import type { RootState } from '../store';
import { closeMobileSidebar, toggleMobileSidebar, toggleSidebar } from '../store/uiSlice';
import { logout } from '../store/userSlice';
import { useMediaQuery } from '../hooks/useMediaQuery';

export default function AppHeader() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const menuRef = useRef<MenuType>(null);
  const user = useSelector((state: RootState) => state.user);
  const sidebarCollapsed = useSelector((state: RootState) => state.ui.sidebarCollapsed);
  const isDesktop = useMediaQuery('(min-width: 768px)');

  useEffect(() => {
    if (isDesktop) dispatch(closeMobileSidebar());
  }, [dispatch, isDesktop]);

  const pageTitle = (() => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard';
    if (path.startsWith('/inventory')) return 'Inventory';
    if (path.startsWith('/materials')) return 'Malzemeler';
    if (path.startsWith('/reports')) return 'Reports';
    if (path === '/setup') return 'Setup';
    if (path.startsWith('/setup/organization')) return 'Setup / Organization';
    if (path.startsWith('/setup/warehouses')) return 'Setup / Warehouses';
    if (path.startsWith('/setup')) return 'Setup';
    return '';
  })();

  const menuItems = [
    {
      label: 'Profile',
      icon: 'pi pi-user'
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
    <header className="grid h-16 grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 shadow-md">
      <div className="flex items-center gap-3">
        <Button
          icon={isDesktop ? (sidebarCollapsed ? 'pi pi-angle-right' : 'pi pi-angle-left') : 'pi pi-bars'}
          rounded
          text
          aria-label={isDesktop ? 'Collapse sidebar' : 'Open menu'}
          onClick={() => {
            if (isDesktop) dispatch(toggleSidebar());
            else dispatch(toggleMobileSidebar());
          }}
          className='cursor-pointer'
        />
        <img src="/images/logo.webp" alt="PlantTrack" className="h-8 w-8 rounded-md object-cover" />
        <span className="text-sm font-semibold text-slate-900">PlantTrack</span>
      </div>

      <div className="min-w-0 text-center">
        {pageTitle ? (
          <span className="block truncate text-sm font-semibold text-slate-800">{pageTitle}</span>
        ) : null}
      </div>

      <div className="flex items-center gap-3 justify-self-end">
        <button
          type="button"
          className="group border-none cursor-pointer inline-flex items-center gap-2 rounded-full bg-white/70 px-2 py-1 shadow-md transition-colors hover:bg-white hover:shadow"
          onClick={(event) => menuRef.current?.toggle(event)}
          aria-controls="user_menu"
          aria-haspopup
        >
          <Avatar
            label={(user.name?.[0] ?? 'U').toUpperCase()}
            shape="circle"
            className="h-8 w-8 bg-brand-500 text-white"
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
