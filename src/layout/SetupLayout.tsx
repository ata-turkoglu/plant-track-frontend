import { useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { TabMenu } from 'primereact/tabmenu';
import type { MenuItem } from 'primereact/menuitem';
import { useI18n } from '../hooks/useI18n';

export default function SetupLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();

  const items: MenuItem[] = useMemo(
    () => [
      {
        label: t('setup.tab.organization', 'Organization'),
        icon: 'pi pi-sitemap',
        command: () => navigate('/setup/organization')
      },
      {
        label: t('setup.tab.warehouses', 'Warehouse'),
        icon: 'pi pi-box',
        command: () => navigate('/setup/warehouses')
      },
      {
        label: t('setup.tab.item_groups', 'Malzeme Gruplari'),
        icon: 'pi pi-clone',
        command: () => navigate('/setup/item-groups')
      },
      {
        label: t('setup.tab.asset_types', 'Asset Types'),
        icon: 'pi pi-tags',
        command: () => navigate('/setup/asset-types')
      },
      {
        label: t('setup.tab.translations', 'Translations'),
        icon: 'pi pi-language',
        command: () => navigate('/setup/translations')
      },
      {
        label: t('setup.tab.units', 'Units'),
        icon: 'pi pi-calculator',
        command: () => navigate('/setup/units')
      }
    ],
    [navigate, t]
  );

  const activeIndex = useMemo(() => {
    if (location.pathname.startsWith('/setup/organization')) return 0;
    if (location.pathname.startsWith('/setup/warehouses')) return 1;
    if (location.pathname.startsWith('/setup/item-groups')) return 2;
    if (location.pathname.startsWith('/setup/asset-types')) return 3;
    if (location.pathname.startsWith('/setup/translations')) return 4;
    if (location.pathname.startsWith('/setup/units')) return 5;
    return 0;
  }, [location.pathname]);

  return (
    <div className="mx-auto flex w-full flex-col">
      <div className="flex min-h-0 flex-col rounded-xl border border-slate-200 bg-white">
        <div className="shrink-0 border-b border-slate-200 pb-5">
          <TabMenu model={items} activeIndex={activeIndex} className="p-component-sm" />
        </div>
        <div className="relative min-h-0 flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
