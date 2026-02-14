import { Outlet } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import AppSidebar from '../components/AppSidebar';

export default function AppLayout() {
  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <AppHeader />
      <div className="flex min-w-0 flex-1 flex-row">
      <AppSidebar />
        <main className="flex-1 overflow-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
