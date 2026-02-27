import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Column } from 'primereact/column';
import { confirmDialog } from 'primereact/confirmdialog';
import { DataTable } from 'primereact/datatable';
import { FilterMatchMode } from 'primereact/api';
import type { DataTableFilterMeta } from 'primereact/datatable';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';

import SearchField from '../../components/common/SearchField';
import { useGlobalTableFilter } from '../../hooks/useGlobalTableFilter';
import { useI18n } from '../../hooks/useI18n';
import { api } from '../../services/api';
import type { AppDispatch, RootState } from '../../store';
import { enqueueToast } from '../../store/uiSlice';
import UnitAddEditDialog from './UnitAddEditDialog';

type UnitRow = {
  id: number;
  organization_id: number;
  code: string;
  name: string;
  symbol: string | null;
  tr_name?: string | null;
  en_name?: string | null;
  tr_symbol?: string | null;
  en_symbol?: string | null;
  system: boolean;
  active: boolean;
};

function deriveCodeFromEnName(enName: string) {
  return enName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 16);
}

const initialUnitFilters: DataTableFilterMeta = {
  global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  code: { value: null, matchMode: FilterMatchMode.CONTAINS },
  tr_name: { value: null, matchMode: FilterMatchMode.CONTAINS },
  en_name: { value: null, matchMode: FilterMatchMode.CONTAINS },
  tr_symbol: { value: null, matchMode: FilterMatchMode.CONTAINS },
  en_symbol: { value: null, matchMode: FilterMatchMode.CONTAINS }
};

export default function UnitsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useI18n();
  const organizationId = useSelector((s: RootState) => s.user.organizationId);

  const [rows, setRows] = useState<UnitRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [mutating, setMutating] = useState(false);

  const { search, filters, updateGlobalSearch, applyTableFilters } = useGlobalTableFilter(initialUnitFilters);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<UnitRow | null>(null);
  const [trName, setTrName] = useState('');
  const [enName, setEnName] = useState('');
  const [trSymbol, setTrSymbol] = useState('');
  const [enSymbol, setEnSymbol] = useState('');
  const [active, setActive] = useState(true);
  const derivedCode = useMemo(() => deriveCodeFromEnName(enName), [enName]);
  const isPieceUnit = derivedCode === 'piece';

  const resetForm = () => {
    setEditing(null);
    setTrName('');
    setEnName('');
    setTrSymbol('');
    setEnSymbol('');
    setActive(true);
  };

  const fetchRows = async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const response = await api.get(`/api/organizations/${organizationId}/units`);
      setRows(response.data.units ?? []);
    } catch {
      dispatch(enqueueToast({ severity: 'error', summary: 'Hata', detail: 'Birimler yuklenemedi.' }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, [organizationId]);

  useEffect(() => {
    if (isPieceUnit && (trSymbol || enSymbol)) {
      setTrSymbol('');
      setEnSymbol('');
    }
  }, [isPieceUnit, trSymbol, enSymbol]);

  const openCreate = useCallback(() => {
    resetForm();
    setDialogOpen(true);
  }, []);

  const openEdit = useCallback((row: UnitRow) => {
    setEditing(row);
    setTrName(row.tr_name ?? '');
    setEnName(row.en_name ?? row.name ?? '');
    setTrSymbol(row.tr_symbol ?? row.symbol ?? '');
    setEnSymbol(row.en_symbol ?? row.symbol ?? '');
    setActive(Boolean(row.active));
    setDialogOpen(true);
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!organizationId) return;

    const payload = {
      tr_name: trName.trim(),
      en_name: enName.trim(),
      tr_symbol: trSymbol.trim() || null,
      en_symbol: enSymbol.trim() || null,
      active
    };

    if (!payload.tr_name || !payload.en_name) return;

    setMutating(true);
    try {
      const isEdit = Boolean(editing);
      if (editing) {
        await api.patch(`/api/units/${editing.id}`, payload);
      } else {
        await api.post(`/api/organizations/${organizationId}/units`, payload);
      }

      setDialogOpen(false);
      resetForm();
      dispatch(
        enqueueToast({
          severity: 'success',
          summary: 'Basarili',
          detail: isEdit ? 'Birim guncellendi.' : 'Birim olusturuldu.'
        })
      );
      await fetchRows();
    } catch {
      dispatch(
        enqueueToast({
          severity: 'error',
          summary: 'Hata',
          detail: 'Kaydetme basarisiz. Kod benzersiz olmali, EN ad lowercase olur, symbol varsa TR/EN birlikte girilmeli.'
        })
      );
    } finally {
      setMutating(false);
    }
  };

  const onDelete = useCallback((row: UnitRow) => {
    if (!organizationId || row.system) return;

    confirmDialog({
      header: t('setup.units.confirm.delete_title', 'Birimi Pasif Et'),
      message: t('setup.units.confirm.delete_message', 'Bu birimi pasif etmek istiyor musun?'),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: t('common.delete', 'Sil'),
      rejectLabel: t('common.cancel', 'Vazgec'),
      acceptClassName: 'p-button-danger p-button-sm',
      rejectClassName: 'p-button-text p-button-sm',
      accept: async () => {
        setMutating(true);
        try {
          await api.delete(`/api/units/${row.id}`);
          dispatch(enqueueToast({ severity: 'success', summary: 'Basarili', detail: 'Birim pasif edildi.' }));
          await fetchRows();
        } catch {
          dispatch(enqueueToast({ severity: 'error', summary: 'Hata', detail: 'Birim pasif edilemedi.' }));
        } finally {
          setMutating(false);
        }
      }
    });
  }, [dispatch, organizationId, t]);

  const actionsBody = (row: UnitRow) => {
    return (
      <div className="flex items-center justify-end gap-1">
        <Button
          icon="pi pi-pencil"
          size="small"
          text
          rounded
          onClick={() => openEdit(row)}
          aria-label={t('inventory.action.edit', 'Duzenle')}
        />
        <Button
          icon="pi pi-trash"
          size="small"
          text
          rounded
          severity="danger"
          onClick={() => onDelete(row)}
          aria-label={t('common.delete', 'Sil')}
          disabled={row.system}
        />
      </div>
    );
  };

  const activeBody = (row: UnitRow) => {
    return (
      <span className={`text-xs font-semibold ${row.active ? 'text-emerald-700' : 'text-slate-500'}`}>
        {row.active ? t('common.active', 'Aktif') : t('setup.units.inactive', 'Pasif')}
      </span>
    );
  };

  const systemBody = (row: UnitRow) => {
    return <span className="text-xs text-slate-600">{row.system ? 'System' : '-'}</span>;
  };

  const canSubmit = useMemo(() => {
    const hasCore = Boolean(trName.trim() && enName.trim());
    if (!hasCore) return false;
    if (isPieceUnit) return true;
    const hasTrSymbol = Boolean(trSymbol.trim());
    const hasEnSymbol = Boolean(enSymbol.trim());
    return hasTrSymbol === hasEnSymbol;
  }, [trName, enName, isPieceUnit, trSymbol, enSymbol]);

  if (!organizationId) {
    return (
      <Message
        severity="warn"
        text={t('common.organization_missing', 'Organization bulunamadi. Lutfen tekrar giris yap.')}
        className="w-full"
      />
    );
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
          <SearchField
            value={search}
            onChange={updateGlobalSearch}
            placeholder={t('common.search', 'Ara')}
            ariaLabel={t('setup.units.search', 'Birimlerde ara')}
          />
          <Button label={t('setup.units.new', 'Yeni Birim')} icon="pi pi-plus" size="small" onClick={openCreate} aria-label={t('setup.units.new', 'Yeni Birim')} />
        </div>

        <div className="overflow-x-auto">
          <DataTable
            value={rows}
            loading={loading || mutating}
            size="small"
            emptyMessage={t('setup.units.empty', 'Birim yok.')}
            removableSort
            sortMode="multiple"
            filters={filters}
            onFilter={applyTableFilters}
            globalFilterFields={['code', 'tr_name', 'en_name', 'tr_symbol', 'en_symbol']}
            tableStyle={{ minWidth: '52rem' }}
          >
            <Column field="code" header={t('setup.units.col.code', 'Code')} sortable filter filterPlaceholder={t('common.search', 'Ara')} />
            <Column field="tr_name" header={t('setup.units.col.tr_name', 'Ad (TR)')} sortable filter filterPlaceholder={t('common.search', 'Ara')} />
            <Column field="en_name" header={t('setup.units.col.en_name', 'Ad (EN)')} sortable filter filterPlaceholder={t('common.search', 'Ara')} />
            <Column field="tr_symbol" header={t('setup.units.col.tr_symbol', 'Sembol (TR)')} sortable filter filterPlaceholder={t('common.search', 'Ara')} />
            <Column field="en_symbol" header={t('setup.units.col.en_symbol', 'Sembol (EN)')} sortable filter filterPlaceholder={t('common.search', 'Ara')} />
            <Column field="system" header={t('setup.units.col.system', 'Tip')} body={systemBody} style={{ width: '8rem' }} />
            <Column field="active" header={t('setup.units.col.active', 'Durum')} body={activeBody} style={{ width: '8rem' }} />
            <Column header="" body={actionsBody} style={{ width: '8rem' }} />
          </DataTable>
        </div>
      </div>

      <UnitAddEditDialog
        t={t}
        visible={dialogOpen}
        editing={Boolean(editing)}
        derivedCode={derivedCode}
        isPieceUnit={isPieceUnit}
        canSubmit={canSubmit}
        mutating={mutating}
        trName={trName}
        setTrName={setTrName}
        enName={enName}
        setEnName={setEnName}
        trSymbol={trSymbol}
        setTrSymbol={setTrSymbol}
        enSymbol={enSymbol}
        setEnSymbol={setEnSymbol}
        active={active}
        setActive={setActive}
        onHide={() => {
          setDialogOpen(false);
          resetForm();
        }}
        onSubmit={submit}
      />
    </div>
  );
}
