import { Outlet } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

import AppHeader from '../components/AppHeader';
import AppSidebar from '../components/AppSidebar';
import type { RootState } from '../store';
import { closeMobileSidebar } from '../store/uiSlice';
import { useMediaQuery } from '../hooks/useMediaQuery';

export default function AppLayout() {
  const dispatch = useDispatch();
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const mobileSidebarOpen = useSelector((s: RootState) => s.ui.mobileSidebarOpen);

  return (
    <div className="flex h-screen flex-col">
      <AppHeader />
      <div className="flex min-w-0 flex-1 flex-row">
        {isDesktop ? (
          <AppSidebar />
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

        <main className="flex-1 overflow-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
