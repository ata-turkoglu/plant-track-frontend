import { useEffect } from 'react';
import moment from 'moment';
import { AlertTriangle, LoaderCircle } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { Header } from '../../components/layout/Header';
import { Sidebar } from '../../components/layout/Sidebar';
import { fetchInventory, selectInventory } from '../../features/inventory/inventorySlice';
import type { AppDispatch } from '../../app/store';
import type { Product } from '../../types/inventory';

function stockSeverity(value: number): 'success' | 'warning' | 'danger' {
  if (value > 20) return 'success';
  if (value > 0) return 'warning';
  return 'danger';
}

export function ProductsPage(): React.JSX.Element {
  const dispatch = useDispatch<AppDispatch>();
  const { products, loading, error, lastUpdated } = useSelector(selectInventory);

  useEffect(() => {
    void dispatch(fetchInventory());
  }, [dispatch]);

  return (
    <div className="min-h-screen bg-shell text-slate md:flex">
      <Sidebar />

      <div className="flex min-h-screen flex-1 flex-col">
        <Header
          title="Products"
          lastUpdated={lastUpdated}
        />

        <main className="flex-1 bg-slate-50/70 p-6">
          {loading ? (
            <div className="flex h-56 items-center justify-center gap-3 rounded-xl border border-slate-200 bg-panel text-slate-600">
              <LoaderCircle className="animate-spin" size={20} />
              <span>Loading products...</span>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">
              <div className="mb-3 flex items-center gap-2 font-medium">
                <AlertTriangle size={18} />
                <span>Unable to load products</span>
              </div>
              <p className="text-sm">{error}</p>
            </div>
          ) : (
            <section className="rounded-xl border border-slate-200 bg-panel p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate">All Products</h2>
              </div>

              {products.length === 0 ? (
                <Message severity="warn" text="No products found." />
              ) : (
                <DataTable value={products} stripedRows size="small" paginator rows={8}>
                  <Column field="sku" header="SKU" />
                  <Column field="name" header="Name" />
                  <Column field="unit" header="Unit" />
                  <Column
                    header="Stock"
                    body={(row: Product) => {
                      const quantity = Number(row.stockQuantity ?? 0);
                      return <Tag value={quantity} severity={stockSeverity(quantity)} />;
                    }}
                  />
                  <Column
                    header="Updated"
                    body={(row: Product) => moment(row.updatedAt).format('MMM D, YYYY HH:mm')}
                  />
                </DataTable>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
