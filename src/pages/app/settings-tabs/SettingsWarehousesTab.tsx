import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { useSettingsOutlet } from './useSettingsOutlet';

export function SettingsWarehousesTab(): React.JSX.Element {
  const { warehouses, loading } = useSettingsOutlet();

  return (
    <DataTable value={warehouses} size="small" loading={loading} stripedRows paginator rows={8}>
      <Column field="code" header="Code" />
      <Column field="name" header="Name" />
      <Column field="createdAt" header="Created At" />
    </DataTable>
  );
}
