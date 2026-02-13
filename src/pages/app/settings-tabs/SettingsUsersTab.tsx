import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import type { AuthUser } from '../../../services/authApi';
import { useSettingsOutlet } from './useSettingsOutlet';

export function SettingsUsersTab(): React.JSX.Element {
  const {
    users,
    loading,
    userTabError,
    canManageUsers,
    userActionLoading,
    openCreateUserDialog,
    openEditUserDialog,
    deactivateUser
  } = useSettingsOutlet();

  return (
    <>
      {userTabError ? <Message severity="warn" text={userTabError} className="mb-3" /> : null}
      <div className="mb-3 flex justify-end">
        <Button
          type="button"
          label="New User"
          icon="pi pi-user-plus"
          size="small"
          onClick={openCreateUserDialog}
          disabled={!canManageUsers}
        />
      </div>

      <DataTable value={users} size="small" loading={loading} stripedRows paginator rows={8}>
        <Column field="email" header="Email" />
        <Column header="Name" body={(row: AuthUser) => `${row.firstName} ${row.lastName}`} />
        <Column field="role" header="Role" />
        <Column
          header="Status"
          body={(row: AuthUser) => (
            <Tag value={row.isActive ? 'Active' : 'Inactive'} severity={row.isActive ? 'success' : 'danger'} />
          )}
        />
        <Column
          header="Actions"
          body={(row: AuthUser) => (
            <div className="flex gap-2">
              <Button
                type="button"
                icon="pi pi-pencil"
                size="small"
                text
                severity="secondary"
                disabled={!canManageUsers}
                onClick={() => openEditUserDialog(row)}
              />
              <Button
                type="button"
                icon="pi pi-trash"
                size="small"
                text
                severity="danger"
                disabled={!canManageUsers || !row.isActive || userActionLoading}
                onClick={() => void deactivateUser(row)}
              />
            </div>
          )}
        />
      </DataTable>
    </>
  );
}
