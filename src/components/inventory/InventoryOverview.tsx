import moment from 'moment';
import { AlertTriangle, LoaderCircle } from 'lucide-react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import type { Product, StockItem } from '../../types/inventory';

interface InventoryOverviewProps {
  products: Product[];
  stock: StockItem[];
  loading: boolean;
  error: string | null;
}

function stockSeverity(value: number): 'success' | 'warning' | 'danger' {
  if (value > 20) return 'success';
  if (value > 0) return 'warning';
  return 'danger';
}

export function InventoryOverview({ products, stock, loading, error }: InventoryOverviewProps): React.JSX.Element {
  const totalUnits = stock.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0);

  if (loading) {
    return (
      <div className="flex h-56 items-center justify-center gap-3 rounded-xl border border-slate-200 bg-panel text-slate-600">
        <LoaderCircle className="animate-spin" size={20} />
        <span>Loading data from API...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">
        <div className="mb-3 flex items-center gap-2 font-medium">
          <AlertTriangle size={18} />
          <span>Unable to load inventory</span>
        </div>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-panel p-4 shadow-sm">
          <p className="text-sm text-slate-500">Products</p>
          <p className="mt-1 text-2xl font-semibold text-slate">{products.length}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-panel p-4 shadow-sm">
          <p className="text-sm text-slate-500">Total Units</p>
          <p className="mt-1 text-2xl font-semibold text-slate">{totalUnits}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-panel p-4 shadow-sm">
          <p className="text-sm text-slate-500">Out of Stock</p>
          <p className="mt-1 text-2xl font-semibold text-slate">
            {stock.filter((item) => Number(item.quantity) === 0).length}
          </p>
        </article>
      </section>

      <section className="rounded-xl border border-slate-200 bg-panel p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate">Products</h2>
        </div>

        {products.length === 0 ? (
          <Message severity="warn" text="No products found." />
        ) : (
          <DataTable value={products} stripedRows size="small" paginator rows={5}>
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

      <section className="rounded-xl border border-slate-200 bg-panel p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate">Stock Levels</h2>
        </div>

        {stock.length === 0 ? (
          <Message severity="warn" text="No stock rows found." />
        ) : (
          <DataTable value={stock} stripedRows size="small" paginator rows={5}>
            <Column field="sku" header="SKU" />
            <Column field="name" header="Name" />
            <Column
              header="Quantity"
              body={(row: StockItem) => {
                const quantity = Number(row.quantity);
                return <Tag value={quantity} severity={stockSeverity(quantity)} />;
              }}
            />
            <Column
              header="Last Movement"
              body={(row: StockItem) =>
                row.updatedAt ? moment(row.updatedAt).fromNow() : 'No movement yet'
              }
            />
          </DataTable>
        )}
      </section>
    </div>
  );
}
