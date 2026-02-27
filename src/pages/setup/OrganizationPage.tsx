import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { OrganizationChart } from 'primereact/organizationchart';
import { Button } from 'primereact/button';
import { confirmDialog } from 'primereact/confirmdialog';
import { Message } from 'primereact/message';
import type { TreeNode } from 'primereact/treenode';

import type { AppDispatch, RootState } from '../../store';
import {
  createLocation,
  deleteLocation,
  fetchOrganizationSetup,
  updateLocation,
  updateOrganizationName
} from '../../store/setupSlice';
import OrganizationLocationAddEditDialog from './OrganizationLocationAddEditDialog';

type NodeKind = 'organization' | 'location';

type OrgNodeData = {
  kind: 'organization';
  id: number;
  name: string;
};

type LocationNodeData = {
  kind: 'location';
  id: number;
  parentId: number | null;
  name: string;
};

type ChartNodeData = OrgNodeData | LocationNodeData;

type LocationRow = {
  id: number;
  organization_id: number;
  parent_id: number | null;
  name: string;
};

function buildTree(organizationId: number, organizationName: string, locations: LocationRow[]): TreeNode[] {
  const root: TreeNode = {
    key: `org-${organizationId}`,
    expanded: true,
    data: { kind: 'organization', id: organizationId, name: organizationName } satisfies OrgNodeData,
    children: []
  };

  const map = new Map<number, TreeNode>();
  for (const loc of locations) {
    map.set(loc.id, {
      key: `loc-${loc.id}`,
      expanded: true,
      data: { kind: 'location', id: loc.id, parentId: loc.parent_id, name: loc.name } satisfies LocationNodeData,
      children: []
    });
  }

  for (const loc of locations) {
    const node = map.get(loc.id);
    if (!node) continue;
    if (!loc.parent_id) {
      root.children?.push(node);
      continue;
    }
    const parent = map.get(loc.parent_id);
    if (parent) {
      parent.children = parent.children ?? [];
      parent.children.push(node);
    } else {
      root.children?.push(node);
    }
  }

  return [root];
}

export default function OrganizationPage() {
  const dispatch = useDispatch<AppDispatch>();
  const organizationId = useSelector((s: RootState) => s.user.organizationId);
  const organizationNameFromStore = useSelector((s: RootState) => s.user.organizationName);
  const { organizationName: setupOrganizationName, locations, loading: fetchLoading, mutating } = useSelector(
    (s: RootState) => s.setup
  );
  const orgName = setupOrganizationName || organizationNameFromStore;
  const loading = fetchLoading || mutating;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'edit-org' | 'add-location' | 'edit-location'>('add-location');
  const [dialogName, setDialogName] = useState('');
  const [dialogTarget, setDialogTarget] = useState<{ kind: NodeKind; id: number } | null>(null);
  const [dialogParentId, setDialogParentId] = useState<number | null>(null);
  const [selectedNodeKey, setSelectedNodeKey] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId) return;
    dispatch(
      fetchOrganizationSetup({
        organizationId,
        fallbackOrganizationName: organizationNameFromStore
      })
    );
  }, [dispatch, organizationId, organizationNameFromStore]);

  const value = useMemo(() => {
    if (!organizationId) return [];
    return buildTree(organizationId, orgName || 'Organization', locations);
  }, [organizationId, orgName, locations]);

  const openEditOrg = () => {
    if (!organizationId) return;
    setDialogMode('edit-org');
    setDialogTarget({ kind: 'organization', id: organizationId });
    setDialogName(orgName || '');
    setDialogParentId(null);
    setDialogOpen(true);
  };

  const openAddLocation = (parentId: number | null) => {
    setDialogMode('add-location');
    setDialogTarget(null);
    setDialogName('');
    setDialogParentId(parentId);
    setDialogOpen(true);
  };

  const openEditLocation = (id: number, currentName: string) => {
    setDialogMode('edit-location');
    setDialogTarget({ kind: 'location', id });
    setDialogName(currentName);
    setDialogParentId(null);
    setDialogOpen(true);
  };

  const onDeleteLocation = (id: number) => {
    confirmDialog({
      header: 'Lokasyon Sil',
      message: 'Bu lokasyonu silmek istiyor musun?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sil',
      rejectLabel: 'Vazgeç',
      acceptClassName: 'p-button-danger p-button-sm',
      rejectClassName: 'p-button-text p-button-sm',
      accept: async () => {
        try {
          await dispatch(deleteLocation({ id })).unwrap();
        } catch {
        }
      }
    });
  };

  const submitDialog = async () => {
    if (!organizationId) return;
    const name = dialogName.trim();
    if (!name) return;

    try {
      if (dialogMode === 'edit-org') {
        await dispatch(updateOrganizationName({ organizationId, name })).unwrap();
      } else if (dialogMode === 'add-location') {
        await dispatch(createLocation({ organizationId, name, parentId: dialogParentId })).unwrap();
      } else if (dialogMode === 'edit-location') {
        const id = dialogTarget?.id;
        if (!id) return;
        await dispatch(updateLocation({ id, name })).unwrap();
      }
      setDialogOpen(false);
    } catch {
    }
  };

  const toggleSelectedNode = (nodeKey: string) => {
    setSelectedNodeKey((prev) => (prev === nodeKey ? null : nodeKey));
  };

  const nodeTemplate = (node: TreeNode) => {
    const data = node.data as ChartNodeData | undefined;
    if (!data) return null;
    const nodeKey = String(node.key ?? '');
    const isSelected = selectedNodeKey === nodeKey;

    if (data.kind === 'organization') {
      return (
        <div
          className={`select-none cursor-pointer rounded-lg border bg-white text-center transition ${isSelected ? 'border-brand-500' : 'border-slate-200'}`}
          onClick={() => toggleSelectedNode(nodeKey)}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') toggleSelectedNode(nodeKey);
          }}
        >
          <div className="flex flex-col items-center">
            <div className="max-w-[180px] truncate text-[13px] font-semibold text-slate-900">{data.name}</div>
            <div className="text-[11px] text-slate-500">Organization (root)</div>
          </div>
          <div
            className={[
              'overflow-hidden transition-all duration-200 ease-out',
              isSelected ? 'mt-2 max-h-12 opacity-100 translate-y-0' : 'mt-0 max-h-0 opacity-0 -translate-y-1 pointer-events-none'
            ].join(' ')}
          >
            <div className="flex items-center justify-center gap-0.5">
              <Button
                icon="pi pi-plus"
                size="small"
                text
                rounded
                aria-label="Add location"
                onClick={() => openAddLocation(null)}
              />
              <Button
                icon="pi pi-pencil"
                size="small"
                text
                rounded
                aria-label="Edit organization"
                onClick={openEditOrg}
              />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        className={`select-none cursor-pointer rounded-lg border bg-white text-center transition ${isSelected ? 'border-brand-500' : 'border-slate-200'}`}
        onClick={() => toggleSelectedNode(nodeKey)}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') toggleSelectedNode(nodeKey);
        }}
      >
        <div className="flex flex-col items-center">
          <div className="max-w-[180px] truncate text-[13px] font-semibold text-slate-900">{data.name}</div>
          <div className="text-[11px] text-slate-500">Location</div>
        </div>
        <div
          className={[
            'overflow-hidden transition-all duration-200 ease-out',
            isSelected ? 'mt-2 max-h-12 opacity-100 translate-y-0' : 'mt-0 max-h-0 opacity-0 -translate-y-1 pointer-events-none'
          ].join(' ')}
        >
          <div className="flex items-center justify-center gap-0.5">
            <Button
              icon="pi pi-plus"
              size="small"
              text
              rounded
              aria-label="Add child location"
              onClick={() => openAddLocation(data.id)}
            />
            <Button
              icon="pi pi-pencil"
              size="small"
              text
              rounded
              aria-label="Edit location"
              onClick={() => openEditLocation(data.id, data.name)}
            />
            <Button
              icon="pi pi-trash"
              size="small"
              text
              rounded
              severity="danger"
              aria-label="Delete location"
              onClick={() => onDeleteLocation(data.id)}
            />
          </div>
        </div>
      </div>
    );
  };

  if (!organizationId) {
    return <Message severity="warn" text="Organization bulunamadı. Lütfen tekrar giriş yap." className="w-full" />;
  }

  return (
    <div className="grid gap-4">
      <div className="overflow-auto rounded-xl border border-slate-200 bg-white p-4">
        <OrganizationChart value={value} nodeTemplate={nodeTemplate} />
      </div>

      <OrganizationLocationAddEditDialog
        header={dialogMode === 'edit-org' ? 'Edit Organization' : dialogMode === 'add-location' ? 'Add Location' : 'Edit Location'}
        visible={dialogOpen}
        loading={loading}
        name={dialogName}
        setName={setDialogName}
        onHide={() => setDialogOpen(false)}
        onSave={submitDialog}
      />
    </div>
  );
}
