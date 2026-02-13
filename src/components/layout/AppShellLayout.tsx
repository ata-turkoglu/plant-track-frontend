import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

const resolveTitle = (pathname: string): string => {
  if (pathname === '/stock/new') return 'New Transaction';
  if (pathname.startsWith('/stock')) return 'Stock Ledger';
  if (pathname.startsWith('/products')) return 'Products';
  if (pathname.startsWith('/settings')) return 'Settings';
  return 'Inventory Dashboard';
};

export function AppShellLayout(): React.JSX.Element {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-shell text-slate md:flex">
      <Sidebar />

      <div className="flex min-h-screen flex-1 flex-col">
        <Header title={resolveTitle(location.pathname)} lastUpdated={null} />
        <main className="flex-1 bg-slate-50/70 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
