import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import { OrganizationChart } from 'primereact/organizationchart';
import type { TreeNode } from 'primereact/treenode';
import { useSettingsOutlet } from './useSettingsOutlet';

export function SettingsOrganizationsTab(): React.JSX.Element {
  const {
    organizationTabError,
    selectedOrganization,
    canManageOrganizations,
    organizationActionLoading,
    openEditOrganizationDialog,
    deactivateOrganization,
    openCreateOrganizationDialog,
    clearOrganizationSelection,
    organizationChartNodes,
    onOrganizationNodeSelect
  } = useSettingsOutlet();

  return (
    <>
      {organizationTabError ? <Message severity="warn" text={organizationTabError} className="mb-3" /> : null}
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-sm text-slate-600">
          {selectedOrganization
            ? `Secili organization: ${selectedOrganization.code} - ${selectedOrganization.name}`
            : 'Chart uzerinden organization secerek duzenleme/silme yapabilirsin.'}
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            label="Edit Selected"
            icon="pi pi-pencil"
            size="small"
            severity="secondary"
            onClick={() => selectedOrganization && openEditOrganizationDialog(selectedOrganization)}
            disabled={!canManageOrganizations || !selectedOrganization}
          />
          <Button
            type="button"
            label="Delete Selected"
            icon="pi pi-trash"
            size="small"
            severity="danger"
            onClick={() => selectedOrganization && void deactivateOrganization(selectedOrganization)}
            disabled={
              !canManageOrganizations ||
              !selectedOrganization ||
              !selectedOrganization.isActive ||
              organizationActionLoading
            }
          />
          <Button
            type="button"
            label="New Organization"
            icon="pi pi-plus"
            size="small"
            onClick={openCreateOrganizationDialog}
            disabled={!canManageOrganizations}
          />
        </div>
      </div>

      <div className="rounded-md border border-slate-200 bg-white p-3">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Organization Chart</h3>
        <Button type="button" label="Clear Selection" size="small" text onClick={clearOrganizationSelection} />
        <OrganizationChart
          value={organizationChartNodes}
          className="w-full"
          selectionMode="single"
          onNodeSelect={(event) => {
            const data = (event.node as TreeNode | null | undefined)?.data as
              | { type?: string; organizationId?: number }
              | undefined;
            if (!data?.organizationId) {
              return;
            }
            onOrganizationNodeSelect(data.organizationId);
          }}
        />
      </div>
    </>
  );
}
