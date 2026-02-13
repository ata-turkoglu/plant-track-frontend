import { ArrowUpRight, Boxes, LayoutDashboard, PackagePlus, PackageSearch, Settings } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { label: 'Dashboard', hint: 'Inventory snapshot', icon: LayoutDashboard, to: '/' },
  { label: 'Products', hint: 'Catalog and details', icon: Boxes, to: '/products' },
  { label: 'Stock Ledger', hint: 'Movements and filters', icon: PackageSearch, to: '/stock' },
  { label: 'New Entry', hint: 'Create movement', icon: PackagePlus, to: '/stock/new' },
  { label: 'Settings', hint: 'Workspace preferences', icon: Settings, to: '/settings' }
];

export function Sidebar(): React.JSX.Element {
  return (
    <aside className="hidden h-screen min-h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-slate-100 shadow-sm md:flex">
      <div className="px-5 pt-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 overflow-hidden rounded-xl bg-linear-to-br from-brand-500 to-brand-700 shadow-card">
            <img src="/assets/logo.webp" alt="PlantTrack logo" className="h-10 w-10 object-cover" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Workspace</p>
            <p className="text-sm font-semibold text-slate-900">Navigation</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2">
        <ul className="mt-3 space-y-2">
          {navItems.map(({ label, hint, icon: Icon, to }) => (
            <li key={label}>
              <NavLink to={to} end className="block">
                {({ isActive }) => (
                  <div
                    className={[
                      'group relative flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left transition',
                      isActive
                        ? 'border-brand-50 bg-brand-100/80'
                        : 'border-transparent hover:-translate-y-0.5 hover:border-brand-200 hover:bg-brand-50/60',
                    ].join(' ')}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-lg">
                        <Icon className="h-5 w-5 text-slate-800" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-900">{label}</p>
                        <p className="text-xs text-slate-500">{hint}</p>
                      </div>
                    </div>
                  </div>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
