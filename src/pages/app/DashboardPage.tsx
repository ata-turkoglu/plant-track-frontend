import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { InventoryOverview } from '../../components/inventory/InventoryOverview';
import { fetchInventory, selectInventory } from '../../features/inventory/inventorySlice';
import type { AppDispatch } from '../../app/store';

export function DashboardPage(): React.JSX.Element {
  const dispatch = useDispatch<AppDispatch>();
  const { products, stock, loading, error } = useSelector(selectInventory);

  useEffect(() => {
    void dispatch(fetchInventory());
  }, [dispatch]);

  return <InventoryOverview products={products} stock={stock} loading={loading} error={error} />;
}
