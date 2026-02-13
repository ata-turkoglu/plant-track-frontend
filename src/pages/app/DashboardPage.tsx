import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Header } from '../../components/layout/Header';
import { Sidebar } from '../../components/layout/Sidebar';
import { InventoryOverview } from '../../components/inventory/InventoryOverview';
import { fetchInventory, selectInventory } from '../../features/inventory/inventorySlice';
import type { AppDispatch } from '../../app/store';

export function DashboardPage(): React.JSX.Element {
  const dispatch = useDispatch<AppDispatch>();
  const { products, stock, loading, error, lastUpdated } = useSelector(selectInventory);

  useEffect(() => {
    void dispatch(fetchInventory());
  }, [dispatch]);

  return (
    <div className="min-h-screen bg-shell text-slate md:flex">
      <Sidebar />

      <div className="flex min-h-screen flex-1 flex-col">
        <Header
          title="Inventory Dashboard"
          lastUpdated={lastUpdated}
        />

        <main className="flex-1 bg-slate-50/70 p-6">
          <InventoryOverview products={products} stock={stock} loading={loading} error={error} />
        </main>
      </div>
    </div>
  );
}
