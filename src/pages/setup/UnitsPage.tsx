import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Column } from 'primereact/column';
import { confirmDialog } from 'primereact/confirmdialog';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { FilterMatchMode } from 'primereact/api';
import type { DataTableFilterMeta } from 'primereact/datatable';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';

import { useI18n } from '../../hooks/useI18n';
import { api } from '../../services/api';
import type { AppDispatch, RootState } from '../../store';
import { enqueueToast } from '../../store/uiSlice';

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

export default function UnitsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useI18n();
  const organizationId = useSelector((s: RootState) => s.user.organizationId);

  const [rows, setRows] = useState<UnitRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [mutating, setMutating] = useState(false);

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<DataTableFilterMeta>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    code: { value: null, matchMode: FilterMatchMode.CONTAINS },
    tr_name: { value: null, matchMode: FilterMatchMode.CONTAINS },
    en_name: { value: null, matchMode: FilterMatchMode.CONTAINS },
    tr_symbol: { value: null, matchMode: FilterMatchMode.CONTAINS },
    en_symbol: { value: null, matchMode: FilterMatchMode.CONTAINS }
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<UnitRow | null>(null);
  const [trName, setTrName] = useState('');
  const [enName, setEnName] = useState('');
  const [trSymbol, setTrSymbol] = useState('');
  const [enSymbol, setEnSymbol] = useState('');
  const [active, setActive] = useState(true);

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
    if (deriveCodeFromEnName(enName) === 'piece' && (trSymbol || enSymbol)) {
      setTrSymbol('');
      setEnSymbol('');
    }
  }, [enName, trSymbol, enSymbol]);

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (row: UnitRow) => {
    setEditing(row);
    setTrName(row.tr_name ?? '');
    setEnName(row.en_name ?? row.name ?? '');
    setTrSymbol(row.tr_symbol ?? row.symbol ?? '');
    setEnSymbol(row.en_symbol ?? row.symbol ?? '');
    setActive(Boolean(row.active));
    setDialogOpen(true);
  };

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

  const onDelete = (row: UnitRow) => {
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
  };

  const actionsBody = (row: UnitRow) => {
    return (
      <div className="flex items-center justify-end gap-1">
        <Button
          icon="pi pi-pencil"
          size="small"
          text
          rounded
          onClick={() => openEdit(row)}
          aria-label="Edit"
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
    if (deriveCodeFromEnName(enName) === 'piece') return true;
    const hasTrSymbol = Boolean(trSymbol.trim());
    const hasEnSymbol = Boolean(enSymbol.trim());
    return hasTrSymbol === hasEnSymbol;
  }, [trName, enName, trSymbol, enSymbol]);

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
          <IconField iconPosition="left" className="w-full sm:w-auto">
            <InputIcon className="pi pi-search text-slate-400" />
            <InputText
              value={search}
              onChange={(e) => {
                const v = e.target.value;
                setSearch(v);
                setFilters((prev) => ({ ...prev, global: { ...prev.global, value: v } }));
              }}
              placeholder={t('common.search', 'Ara')}
              className="w-full sm:w-72"
            />
          </IconField>
          <Button label={t('setup.units.new', 'Yeni Birim')} icon="pi pi-plus" size="small" onClick={openCreate} />
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
            onFilter={(e) => setFilters(e.filters)}
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

      <Dialog
        header={editing ? t('setup.units.edit', 'Birim Duzenle') : t('setup.units.new', 'Yeni Birim')}
        visible={dialogOpen}
        onHide={() => {
          setDialogOpen(false);
          resetForm();
        }}
        className="w-full max-w-lg"
      >
        <form className="grid gap-3" onSubmit={submit} autoComplete="off">
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            {t('setup.units.code_auto', 'Kod, EN ad alanindan otomatik uretilir.')}: <span className="font-semibold">{deriveCodeFromEnName(enName) || '-'}</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700">{t('setup.units.col.tr_name', 'Ad (TR)')}</span>
              <InputText value={trName} onChange={(e) => setTrName(e.target.value)} className="w-full" />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700">{t('setup.units.col.en_name', 'Ad (EN)')}</span>
              <InputText value={enName} onChange={(e) => setEnName(e.target.value)} className="w-full" />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700">{t('setup.units.col.tr_symbol', 'Sembol (TR)')}</span>
              <InputText
                value={trSymbol}
                onChange={(e) => setTrSymbol(e.target.value)}
                className="w-full"
                disabled={deriveCodeFromEnName(enName) === 'piece'}
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700">{t('setup.units.col.en_symbol', 'Sembol (EN)')}</span>
              <InputText
                value={enSymbol}
                onChange={(e) => setEnSymbol(e.target.value)}
                className="w-full"
                disabled={deriveCodeFromEnName(enName) === 'piece'}
              />
            </label>
          </div>

          {deriveCodeFromEnName(enName) === 'piece' ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              {t('setup.units.piece_symbol_note', '`piece` kodu icin symbol bos birakilmalidir.')}
            </div>
          ) : null}

          {editing ? (
            <label className="flex items-center gap-2 pt-1">
              <Checkbox inputId="unit-active" checked={active} onChange={(e) => setActive(Boolean(e.checked))} />
              <span className="text-sm text-slate-700">{t('common.active', 'Aktif')}</span>
            </label>
          ) : null}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button label={t('common.cancel', 'Vazgec')} size="small" text type="button" onClick={() => setDialogOpen(false)} />
            <Button label={t('common.save', 'Kaydet')} size="small" type="submit" loading={mutating} disabled={!canSubmit} />
          </div>
        </form>
      </Dialog>
    </div>
  );
}
