import { useEffect, useMemo, useState } from 'react';
import moment from 'moment';
import { useLocation, useNavigate } from 'react-router-dom';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Header } from '../../components/layout/Header';
import { Sidebar } from '../../components/layout/Sidebar';
import { OnHandWidget } from '../../components/inventory/OnHandWidget';
import { inventoryApi } from '../../services/inventoryApi';
import type { Product, StockTransaction, Warehouse } from '../../types/inventory';

interface LocationState {
  toast?: string;
}

export function StockPage(): React.JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as LocationState;
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [ledger, setLedger] = useState<StockTransaction[]>([]);
  const [productId, setProductId] = useState<number | undefined>(undefined);
  const [warehouseId, setWarehouseId] = useState<number | undefined>(undefined);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onHand, setOnHand] = useState<number | null>(null);

  const lastUpdated = useMemo(() => new Date().toISOString(), []);

  const fetchLedger = async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await inventoryApi.getLedger({ productId, warehouseId, from: from || undefined, to: to || undefined });
      setLedger(rows);
    } catch {
      setError('Failed to load stock ledger.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadMasterData = async () => {
      try {
        const [productsData, warehousesData] = await Promise.all([
          inventoryApi.listProducts(),
          inventoryApi.listWarehouses()
        ]);
        setProducts(productsData);
        setWarehouses(warehousesData);
      } catch {
        setError('Failed to load products/warehouses.');
      }
    };

    void loadMasterData();
    void fetchLedger();
  }, []);

  useEffect(() => {
    const loadOnHand = async () => {
      if (!productId || !warehouseId) {
        setOnHand(null);
        return;
      }

      try {
        const rows = await inventoryApi.getOnHand({ productId, warehouseId });
        setOnHand(rows[0]?.quantityOnHand ?? 0);
      } catch {
        setOnHand(null);
      }
    };

    void loadOnHand();
  }, [productId, warehouseId]);

  return (
    <div className="min-h-screen bg-shell text-slate md:flex">
      <Sidebar />

      <div className="flex min-h-screen flex-1 flex-col">
        <Header title="Stock Ledger" lastUpdated={lastUpdated} />

        <main className="flex-1 space-y-4 bg-slate-50/70 p-6">
          {state.toast ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {state.toast}
            </div>
          ) : null}

          <section className="rounded-xl border border-slate-200 bg-panel p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Filters</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/stock/new')}
                  className="rounded-md bg-brand-700 px-3 py-2 text-sm font-semibold text-white"
                >
                  New Transaction
                </button>
                <button
                  type="button"
                  onClick={() => void fetchLedger()}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800"
                >
                  Apply
                </button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <label className="flex flex-col gap-1 text-sm">
                Product
                <select
                  value={productId ?? ''}
                  onChange={(e) => setProductId(e.target.value ? Number(e.target.value) : undefined)}
                  className="rounded-md border border-slate-300 px-3 py-2"
                >
                  <option value="">All products</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.sku} - {product.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm">
                Warehouse
                <select
                  value={warehouseId ?? ''}
                  onChange={(e) => setWarehouseId(e.target.value ? Number(e.target.value) : undefined)}
                  className="rounded-md border border-slate-300 px-3 py-2"
                >
                  <option value="">All warehouses</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.code} - {warehouse.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm">
                From
                <input
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  type="date"
                  className="rounded-md border border-slate-300 px-3 py-2"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm">
                To
                <input
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  type="date"
                  className="rounded-md border border-slate-300 px-3 py-2"
                />
              </label>
            </div>
          </section>

          <OnHandWidget quantityOnHand={onHand} />

          <section className="rounded-xl border border-slate-200 bg-panel p-4 shadow-sm">
            {error ? <p className="text-sm text-red-700">{error}</p> : null}
            <DataTable value={ledger} stripedRows size="small" paginator rows={12} loading={loading}>
              <Column header="Date" body={(row: StockTransaction) => moment(row.createdAt).format('YYYY-MM-DD HH:mm')} />
              <Column field="type" header="Type" />
              <Column field="direction" header="Direction" />
              <Column header="Product" body={(row: StockTransaction) => row.productName ?? row.productId} />
              <Column header="Warehouse" body={(row: StockTransaction) => row.warehouseCode ?? row.warehouseId} />
              <Column header="Qty" body={(row: StockTransaction) => `${row.quantity} ${row.unit}`} />
              <Column header="Reference" body={(row: StockTransaction) => `${row.referenceType ?? '-'} / ${row.referenceId ?? '-'}`} />
              <Column field="note" header="Note" />
              <Column field="createdBy" header="Created By" />
            </DataTable>
          </section>
        </main>
      </div>
    </div>
  );
}
