import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OnHandWidget } from '../../components/inventory/OnHandWidget';
import { inventoryApi } from '../../services/inventoryApi';
import type { Product, Warehouse } from '../../types/inventory';

type FormType = 'IN' | 'OUT' | 'ADJUST' | 'TRANSFER';

export function NewTransactionPage(): React.JSX.Element {
  const navigate = useNavigate();
  const [type, setType] = useState<FormType>('IN');
  const [adjustDirection, setAdjustDirection] = useState<'IN' | 'OUT'>('IN');
  const [productId, setProductId] = useState<number | null>(null);
  const [warehouseId, setWarehouseId] = useState<number | null>(null);
  const [destinationWarehouseId, setDestinationWarehouseId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState<string>('0');
  const [referenceType, setReferenceType] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [note, setNote] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentOnHand, setCurrentOnHand] = useState<number | null>(null);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === productId) ?? null,
    [products, productId]
  );

  const quantityNumber = Number(quantity);

  const effectiveDirection: 'IN' | 'OUT' = useMemo(() => {
    if (type === 'OUT') return 'OUT';
    if (type === 'IN') return 'IN';
    if (type === 'ADJUST') return adjustDirection;
    return 'OUT';
  }, [adjustDirection, type]);

  const resultingOnHand = useMemo(() => {
    if (currentOnHand === null || !Number.isFinite(quantityNumber) || quantityNumber <= 0) {
      return null;
    }

    const base = type === 'TRANSFER' ? 'OUT' : effectiveDirection;
    return base === 'IN' ? currentOnHand + quantityNumber : currentOnHand - quantityNumber;
  }, [currentOnHand, effectiveDirection, quantityNumber, type]);

  const isValid = useMemo(() => {
    const common = Boolean(productId && warehouseId && Number.isFinite(quantityNumber) && quantityNumber > 0);
    if (!common) return false;
    if (type === 'TRANSFER') {
      return Boolean(destinationWarehouseId && destinationWarehouseId !== warehouseId);
    }
    return true;
  }, [destinationWarehouseId, productId, quantityNumber, type, warehouseId]);

  useEffect(() => {
    const loadMasterData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [productsData, warehousesData] = await Promise.all([
          inventoryApi.listProducts(),
          inventoryApi.listWarehouses()
        ]);
        setProducts(productsData);
        setWarehouses(warehousesData);
      } catch {
        setError('Failed to load products and warehouses.');
      } finally {
        setLoading(false);
      }
    };

    void loadMasterData();
  }, []);

  useEffect(() => {
    const loadOnHand = async () => {
      if (!productId || !warehouseId) {
        setCurrentOnHand(null);
        return;
      }

      try {
        const rows = await inventoryApi.getOnHand({ productId, warehouseId });
        setCurrentOnHand(rows[0]?.quantityOnHand ?? 0);
      } catch {
        setCurrentOnHand(null);
      }
    };

    void loadOnHand();
  }, [productId, warehouseId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValid || !productId || !warehouseId) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      if (type === 'TRANSFER') {
        await inventoryApi.createTransfer({
          productId,
          sourceWarehouseId: warehouseId,
          destinationWarehouseId: destinationWarehouseId as number,
          quantity: quantityNumber,
          referenceType: referenceType || undefined,
          referenceId: referenceId || undefined,
          note: note || undefined
        });
      } else {
        await inventoryApi.createTransaction({
          productId,
          warehouseId,
          type,
          quantity: quantityNumber,
          direction: type === 'ADJUST' ? adjustDirection : undefined,
          referenceType: referenceType || undefined,
          referenceId: referenceId || undefined,
          note: note || undefined
        });
      }

      navigate('/stock', {
        state: {
          toast: type === 'TRANSFER' ? 'Transfer completed.' : 'Transaction created.'
        }
      });
    } catch {
      setError('Failed to create transaction.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <section className="rounded-xl border border-slate-200 bg-panel p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            Type
            <select value={type} onChange={(e) => setType(e.target.value as FormType)} className="rounded-md border border-slate-300 px-3 py-2">
              <option value="IN">IN</option>
              <option value="OUT">OUT</option>
              <option value="ADJUST">ADJUST</option>
              <option value="TRANSFER">TRANSFER</option>
            </select>
          </label>

          {type === 'ADJUST' ? (
            <label className="flex flex-col gap-1 text-sm">
              Adjust Direction
              <select
                value={adjustDirection}
                onChange={(e) => setAdjustDirection(e.target.value as 'IN' | 'OUT')}
                className="rounded-md border border-slate-300 px-3 py-2"
              >
                <option value="IN">IN</option>
                <option value="OUT">OUT</option>
              </select>
            </label>
          ) : (
            <div />
          )}

          <label className="flex flex-col gap-1 text-sm">
            Product
            <select
              value={productId ?? ''}
              onChange={(e) => setProductId(e.target.value ? Number(e.target.value) : null)}
              className="rounded-md border border-slate-300 px-3 py-2"
              disabled={loading}
            >
              <option value="">Select product</option>
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
              onChange={(e) => setWarehouseId(e.target.value ? Number(e.target.value) : null)}
              className="rounded-md border border-slate-300 px-3 py-2"
              disabled={loading}
            >
              <option value="">Select warehouse</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.code} - {warehouse.name}
                </option>
              ))}
            </select>
          </label>

          {type === 'TRANSFER' ? (
            <label className="flex flex-col gap-1 text-sm">
              Destination Warehouse
              <select
                value={destinationWarehouseId ?? ''}
                onChange={(e) => setDestinationWarehouseId(e.target.value ? Number(e.target.value) : null)}
                className="rounded-md border border-slate-300 px-3 py-2"
              >
                <option value="">Select destination</option>
                {warehouses
                  .filter((warehouse) => warehouse.id !== warehouseId)
                  .map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.code} - {warehouse.name}
                    </option>
                  ))}
              </select>
            </label>
          ) : (
            <div />
          )}

          <label className="flex flex-col gap-1 text-sm">
            Quantity
            <input
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2"
              type="number"
              min="0.0001"
              step="0.0001"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Unit
            <input value={selectedProduct?.unit ?? ''} readOnly className="rounded-md border border-slate-200 bg-slate-100 px-3 py-2" />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Reference Type
            <input value={referenceType} onChange={(e) => setReferenceType(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2" />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Reference ID
            <input value={referenceId} onChange={(e) => setReferenceId(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2" />
          </label>
        </div>
        <label className="mt-4 flex flex-col gap-1 text-sm">
          Note
          <textarea value={note} onChange={(e) => setNote(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2" rows={3} />
        </label>
      </section>

      <OnHandWidget quantityOnHand={currentOnHand} resultingOnHand={resultingOnHand} />

      {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <button
        type="submit"
        disabled={!isValid || submitting}
        className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? 'Saving...' : 'Create Transaction'}
      </button>
    </form>
  );
}
