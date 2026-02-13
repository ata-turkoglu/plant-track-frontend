import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { useSettingsOutlet } from './useSettingsOutlet';

export function SettingsProductsTab(): React.JSX.Element {
  const { products, loading } = useSettingsOutlet();

  return (
    <DataTable value={products} size="small" loading={loading} stripedRows paginator rows={8}>
      <Column field="sku" header="SKU" />
      <Column field="name" header="Name" />
      <Column field="unit" header="Unit" />
      <Column field="category" header="Category" />
      <Column field="minStock" header="Min Stock" />
    </DataTable>
  );
}
