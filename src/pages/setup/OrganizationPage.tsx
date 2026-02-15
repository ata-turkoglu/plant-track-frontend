import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { OrganizationChart } from 'primereact/organizationchart';
import { Button } from 'primereact/button';
import { confirmDialog } from 'primereact/confirmdialog';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import type { TreeNode } from 'primereact/treenode';

import { api } from '../../services/api';
import type { RootState } from '../../store';

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
  const organizationId = useSelector((s: RootState) => s.user.organizationId);
  const organizationNameFromStore = useSelector((s: RootState) => s.user.organizationName);

  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [orgName, setOrgName] = useState(organizationNameFromStore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'edit-org' | 'add-location' | 'edit-location'>('add-location');
  const [dialogName, setDialogName] = useState('');
  const [dialogTarget, setDialogTarget] = useState<{ kind: NodeKind; id: number } | null>(null);
  const [dialogParentId, setDialogParentId] = useState<number | null>(null);

  useEffect(() => {
    setOrgName(organizationNameFromStore);
  }, [organizationNameFromStore]);

  useEffect(() => {
    if (!organizationId) return;
    setLoading(true);
    setError('');

    Promise.all([
      api.get(`/api/organizations/${organizationId}`),
      api.get(`/api/organizations/${organizationId}/locations`)
    ])
      .then(([orgRes, locRes]) => {
        setOrgName(orgRes.data.organization?.name ?? orgName);
        setLocations(locRes.data.locations ?? []);
      })
      .catch(() => setError('Organization bilgileri yüklenemedi.'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

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
      rejectLabel: 'Vazgec',
      acceptClassName: 'p-button-danger p-button-sm',
      rejectClassName: 'p-button-text p-button-sm',
      accept: async () => {
        setError('');
        try {
          await api.delete(`/api/locations/${id}`);
          setLocations((prev) => prev.filter((l) => l.id !== id));
        } catch {
          // 409 = has children
          setError('Lokasyon silinemedi. Alt lokasyonları varsa önce onları sil.');
        }
      }
    });
  };

  const submitDialog = async () => {
    if (!organizationId) return;
    const name = dialogName.trim();
    if (!name) return;

    setLoading(true);
    setError('');
    try {
      if (dialogMode === 'edit-org') {
        const res = await api.patch(`/api/organizations/${organizationId}`, { name });
        setOrgName(res.data.organization?.name ?? name);
      } else if (dialogMode === 'add-location') {
        const res = await api.post(`/api/organizations/${organizationId}/locations`, {
          name,
          parent_id: dialogParentId
        });
        const created: LocationRow = res.data.location;
        setLocations((prev) => [...prev, created]);
      } else if (dialogMode === 'edit-location') {
        const id = dialogTarget?.id;
        if (!id) return;
        const res = await api.patch(`/api/locations/${id}`, { name });
        const updated: LocationRow = res.data.location;
        setLocations((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      }
      setDialogOpen(false);
    } catch {
      setError('İşlem başarısız. Lütfen tekrar dene.');
    } finally {
      setLoading(false);
    }
  };

  const nodeTemplate = (node: TreeNode) => {
    const data = node.data as ChartNodeData | undefined;
    if (!data) return null;

    if (data.kind === 'organization') {
      return (
        <div className="rounded-lg border border-slate-200 bg-white text-center">
          <div className="flex flex-col items-center">
            <div className="max-w-[180px] truncate text-[13px] font-semibold text-slate-900">{data.name}</div>
            <div className="text-[11px] text-slate-500">Organization (root)</div>
          </div>
          <div className="mt-2 flex items-center justify-center gap-0.5">
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
      );
    }

    return (
      <div className="rounded-lg border border-slate-200 bg-white text-center">
        <div className="flex flex-col items-center">
          <div className="max-w-[180px] truncate text-[13px] font-semibold text-slate-900">{data.name}</div>
          <div className="text-[11px] text-slate-500">Location</div>
        </div>
        <div className="mt-2 flex items-center justify-center gap-0.5">
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
    );
  };

  if (!organizationId) {
    return <Message severity="warn" text="Organization bulunamadı. Lütfen tekrar giriş yap." className="w-full" />;
  }

  return (
    <div className="grid gap-4">
      {error ? <Message severity="error" text={error} className="w-full" /> : null}

      <div className="overflow-auto rounded-xl border border-slate-200 bg-white p-4">
        <OrganizationChart value={value} nodeTemplate={nodeTemplate} />
      </div>

      <Dialog
        header={
          dialogMode === 'edit-org'
            ? 'Edit Organization'
            : dialogMode === 'add-location'
              ? 'Add Location'
              : 'Edit Location'
        }
        visible={dialogOpen}
        onHide={() => setDialogOpen(false)}
        className="w-full max-w-lg"
      >
        <div className="grid gap-3">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Name</span>
            <InputText value={dialogName} onChange={(e) => setDialogName(e.target.value)} className="w-full" />
          </label>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button label="Cancel" size="small" text onClick={() => setDialogOpen(false)} />
            <Button label="Save" size="small" onClick={submitDialog} loading={loading} />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
