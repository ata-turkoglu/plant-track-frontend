import { useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { TabMenu } from 'primereact/tabmenu';
import type { MenuItem } from 'primereact/menuitem';

export default function SetupLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const items: MenuItem[] = useMemo(
    () => [
      {
        label: 'Organization',
        icon: 'pi pi-sitemap',
        command: () => navigate('/setup/organization')
      },
      {
        label: 'Warehouse',
        icon: 'pi pi-box',
        command: () => navigate('/setup/warehouses')
      }
    ],
    [navigate]
  );

  const activeIndex = useMemo(() => {
    if (location.pathname.startsWith('/setup/organization')) return 0;
    if (location.pathname.startsWith('/setup/warehouses')) return 1;
    return 0;
  }, [location.pathname]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-3 py-2">
          <TabMenu model={items} activeIndex={activeIndex} className="p-component-sm" />
        </div>
        <div className="p-4">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
