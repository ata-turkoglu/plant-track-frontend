import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { confirmDialog } from 'primereact/confirmdialog';
import { DataTable } from 'primereact/datatable';
import type { DataTableFilterMeta } from 'primereact/datatable';
import { FilterMatchMode } from 'primereact/api';
import { Message } from 'primereact/message';

import SearchField from '../../components/common/SearchField';
import { useGlobalTableFilter } from '../../hooks/useGlobalTableFilter';
import { useI18n } from '../../hooks/useI18n';
import { api } from '../../services/api';
import type { AppDispatch, RootState } from '../../store';
import { enqueueToast } from '../../store/uiSlice';
import AssetTypeAddEditDialog, { type AssetCardRow } from '../../components/assetTypes/AssetTypeAddEditDialog';

function getApiErrorMessage(err: unknown): string | null {
  const maybe = err as { response?: { data?: { message?: unknown } } };
  const message = maybe?.response?.data?.message;
  return typeof message === 'string' && message.trim() ? message : null;
}

const initialFilters: DataTableFilterMeta = {
  global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  code: { value: null, matchMode: FilterMatchMode.CONTAINS },
  name: { value: null, matchMode: FilterMatchMode.CONTAINS }
};

export default function AssetTypesPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useI18n();
  const organizationId = useSelector((s: RootState) => s.user.organizationId);

  const [rows, setRows] = useState<AssetCardRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [mutating, setMutating] = useState(false);

  const { search, filters, updateGlobalSearch, applyTableFilters } = useGlobalTableFilter(initialFilters);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AssetCardRow | null>(null);

  const fetchRows = async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const response = await api.get(`/api/organizations/${organizationId}/asset-cards`);
      setRows((response.data.assetCards ?? []) as AssetCardRow[]);
    } catch (err: unknown) {
      const message = getApiErrorMessage(err);
      dispatch(
        enqueueToast({
          severity: 'error',
          summary: t('common.error', 'Hata'),
          detail: message ? `${t('asset_types.load_failed', 'Tipler yuklenemedi.')}\n${message}` : t('asset_types.load_failed', 'Tipler yuklenemedi.')
        })
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const openCreate = useCallback(() => {
    setEditing(null);
    setDialogOpen(true);
  }, []);

  const openEdit = useCallback((row: AssetCardRow) => {
    setEditing(row);
    setDialogOpen(true);
  }, []);

  const onDelete = useCallback(
    (row: AssetCardRow) => {
      if (!organizationId) return;

      confirmDialog({
        header: t('asset_types.confirm.delete_title', 'Tip Sil'),
        message: t('asset_types.confirm.delete_message', 'Bu tipi silmek istiyor musun?'),
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: t('common.delete', 'Sil'),
        rejectLabel: t('common.cancel', 'Vazgec'),
        acceptClassName: 'p-button-danger p-button-sm',
        rejectClassName: 'p-button-text p-button-sm',
        accept: async () => {
          setMutating(true);
          try {
            await api.delete(`/api/organizations/${organizationId}/asset-cards/${row.id}`);
            dispatch(enqueueToast({ severity: 'success', summary: t('common.success', 'Basarili'), detail: t('asset_types.deleted', 'Tip silindi.') }));
            await fetchRows();
          } catch (err: unknown) {
            const status = (err as { response?: { status?: number } })?.response?.status;
            if (status === 409) {
              dispatch(enqueueToast({ severity: 'warn', summary: t('common.warning', 'Uyari'), detail: t('asset_types.in_use', 'Tip kullanimda, silinemez.') }));
              return;
            }
            const message = getApiErrorMessage(err);
            dispatch(
              enqueueToast({
                severity: 'error',
                summary: t('common.error', 'Hata'),
                detail: message ? `${t('asset_types.delete_failed', 'Tip silinemedi.')}\n${message}` : t('asset_types.delete_failed', 'Tip silinemedi.')
              })
            );
          } finally {
            setMutating(false);
          }
        }
      });
    },
    [dispatch, organizationId, t]
  );

  const actionsBody = (row: AssetCardRow) => {
    return (
      <div className="flex items-center justify-end gap-1">
        <Button icon="pi pi-pencil" size="small" text rounded onClick={() => openEdit(row)} aria-label={t('inventory.action.edit', 'Duzenle')} />
        <Button icon="pi pi-trash" size="small" text rounded severity="danger" onClick={() => onDelete(row)} aria-label={t('common.delete', 'Sil')} />
      </div>
    );
  };

  const activeBody = (row: AssetCardRow) => {
    return (
      <span className={`text-xs font-semibold ${row.active ? 'text-emerald-700' : 'text-slate-500'}`}>
        {row.active ? t('common.active', 'Aktif') : t('common.inactive', 'Pasif')}
      </span>
    );
  };

  if (!organizationId) {
    return <Message severity="warn" text={t('common.organization_missing', 'Organization bulunamadi. Lutfen tekrar giris yap.')} className="w-full" />;
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
          <SearchField
            value={search}
            onChange={updateGlobalSearch}
            placeholder={t('common.search', 'Ara')}
            ariaLabel={t('asset_types.search', 'Kartlarda ara')}
            inputClassName="w-full p-inputtext-sm sm:w-72"
          />
          <Button label={t('asset_types.new', 'Yeni Kart')} icon="pi pi-plus" size="small" onClick={openCreate} aria-label={t('asset_types.new', 'Yeni Kart')} />
        </div>

        <div className="overflow-x-auto">
          <DataTable
            value={rows}
            loading={loading || mutating}
            size="small"
            emptyMessage={t('asset_types.empty', 'Kart yok.')}
            removableSort
            sortMode="multiple"
            filters={filters}
            onFilter={applyTableFilters}
            globalFilterFields={['code', 'name']}
            tableStyle={{ minWidth: '36rem' }}
          >
            <Column field="code" header={t('common.code', 'Kod')} sortable filter filterPlaceholder={t('common.search', 'Ara')} style={{ width: '12rem' }} />
            <Column field="name" header={t('common.name', 'Isim')} sortable filter filterPlaceholder={t('common.search', 'Ara')} />
            <Column field="active" header={t('common.active', 'Aktif')} body={activeBody} style={{ width: '9rem' }} />
            <Column header="" body={actionsBody} style={{ width: '8rem' }} />
          </DataTable>
        </div>
      </div>

      <AssetTypeAddEditDialog
        organizationId={organizationId}
        visible={dialogOpen}
        onHide={() => setDialogOpen(false)}
        editing={editing}
        onSaved={() => void fetchRows()}
      />
    </div>
  );
}
