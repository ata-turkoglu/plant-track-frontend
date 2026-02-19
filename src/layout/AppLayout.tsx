import { Outlet } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from 'primereact/button';

import AppHeader from '../components/AppHeader';
import AppSidebar from '../components/AppSidebar';
import type { RootState } from '../store';
import { closeMobileSidebar, toggleMobileSidebar } from '../store/uiSlice';
import { useMediaQuery } from '../hooks/useMediaQuery';

export default function AppLayout() {
  const dispatch = useDispatch();
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const mobileSidebarOpen = useSelector((s: RootState) => s.ui.mobileSidebarOpen);
  const sidebarCollapsed = useSelector((s: RootState) => s.ui.sidebarCollapsed);
  const desktopContentOffset = sidebarCollapsed ? 'md:pl-16' : 'md:pl-60';

  return (
    <div className="h-screen overflow-hidden">
      <AppHeader />
      {isDesktop ? (
        <div className={`fixed left-0 top-0 z-50 h-screen pt-16 transition-all duration-200 ${sidebarCollapsed ? 'w-16' : 'w-60'}`}>
          <AppSidebar />
        </div>
      ) : mobileSidebarOpen ? (
        <div className="fixed inset-x-0 bottom-0 top-16 z-40">
          <button
            type="button"
            className="absolute inset-0 cursor-default bg-slate-900/20"
            aria-label="Close menu"
            onClick={() => dispatch(closeMobileSidebar())}
          />
          <div className="absolute inset-y-0 left-0 w-72 shadow-xl">
            <AppSidebar collapsedOverride={false} onNavigate={() => dispatch(closeMobileSidebar())} />
          </div>
        </div>
      ) : null}

      <main className={`h-screen pt-16 ${isDesktop ? desktopContentOffset : ''}`}>
        {!isDesktop && !mobileSidebarOpen ? (
          <Button
            icon="pi pi-bars"
            rounded
            text
            size="small"
            aria-label="Open menu"
            className="fixed left-3 top-20 z-30"
            onClick={() => dispatch(toggleMobileSidebar())}
          />
        ) : null}
        <div className="h-full overflow-auto p-3 sm:p-4">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
