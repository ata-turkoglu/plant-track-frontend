import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Tag } from 'primereact/tag';
import type { MachineRow } from '../SettingsPage';
import { useSettingsOutlet } from './useSettingsOutlet';

export function SettingsMachinesTab(): React.JSX.Element {
  const { machines } = useSettingsOutlet();

  return (
    <DataTable value={machines} size="small" stripedRows paginator rows={8}>
      <Column field="code" header="Code" />
      <Column field="name" header="Name" />
      <Column field="organizationUnitCode" header="Organization Unit" />
      <Column
        header="Status"
        body={(row: MachineRow) => (
          <Tag
            value={row.status}
            severity={row.status === 'running' ? 'success' : row.status === 'maintenance' ? 'warning' : 'danger'}
          />
        )}
      />
    </DataTable>
  );
}
