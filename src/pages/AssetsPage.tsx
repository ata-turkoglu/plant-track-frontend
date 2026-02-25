import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Column } from 'primereact/column';
import { confirmDialog } from 'primereact/confirmdialog';
import { DataTable } from 'primereact/datatable';
import type { DataTableFilterMeta } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { FilterMatchMode } from 'primereact/api';
import { useNavigate } from 'react-router-dom';

import type { AppDispatch, RootState } from '../store';
import { api } from '../services/api';
import { useI18n } from '../hooks/useI18n';
import { enqueueToast } from '../store/uiSlice';
import { fetchOrganizationSetup } from '../store/setupSlice';
import AssetTypeUpsertDialog from '../components/assetTypes/AssetTypeUpsertDialog';

type AssetRow = {
  id: number;
  organization_id: number;
  location_id: number | null;
  parent_asset_id: number | null;
  asset_type_id: number | null;
  code: string | null;
  name: string;
  active: boolean;
  current_state: string;
  running_since: string | null;
  runtime_seconds: number | string;
  attributes_json: unknown | null;
  created_at: string;
  updated_at: string;
};

type AssetTypeRow = {
  id: number;
  organization_id: number;
  code: string;
  name: string;
  active: boolean;
  fields: AssetTypeFieldRow[];
};

type AssetTypeFieldRow = {
  id: number;
  organization_id: number;
  asset_type_id: number;
  name: string;
  label: string;
  input_type: SchemaFieldType;
  required: boolean;
  unit_id: number | null;
  sort_order: number;
  active: boolean;
};

type UnitRow = {
  id: number;
  organization_id: number;
  code: string;
  name: string;
  symbol: string | null;
  system: boolean;
  active: boolean;
  tr_name?: string | null;
  en_name?: string | null;
  tr_symbol?: string | null;
  en_symbol?: string | null;
};

type SchemaFieldType = 'text' | 'number' | 'boolean' | 'date';

type SchemaFieldRow = {
  key: string;
  label: string;
  type: SchemaFieldType;
  required: boolean;
  unitId: number | null;
};

type AttributeEntry = {
  key: string;
  value: string;
  unitId: number | null;
  label?: string;
  fieldType?: SchemaFieldType;
  required?: boolean;
  schemaBound?: boolean;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value == null) return false;
  if (typeof value !== 'object') return false;
  if (Array.isArray(value)) return false;
  return true;
}

function normalizeFieldType(value: unknown): SchemaFieldType {
  if (value === 'text' || value === 'number' || value === 'boolean' || value === 'date') return value;
  return 'text';
}

function normalizeUnitId(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function parseAssetTypeFields(fields: AssetTypeFieldRow[] | null | undefined): SchemaFieldRow[] {
  if (!Array.isArray(fields)) return [];

  return [...fields]
    .sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return a.id - b.id;
    })
    .filter((row) => row.active !== false)
    .map((row) => ({
      key: (row.name ?? '').trim(),
      label: (row.label ?? row.name ?? '').trim(),
      type: normalizeFieldType(row.input_type),
      required: Boolean(row.required),
      unitId: normalizeUnitId(row.unit_id)
    }))
    .filter((row) => Boolean(row.key));
}

function mergeAttributesWithSchema(existingEntries: AttributeEntry[], schemaRows: SchemaFieldRow[]): AttributeEntry[] {
  const byKey = new Map<string, AttributeEntry>();
  for (const row of existingEntries) byKey.set(row.key.toLowerCase(), row);

  return schemaRows.map((field) => {
    const existing = byKey.get(field.key.toLowerCase());
    return {
      key: field.key,
      value: existing?.value ?? '',
      unitId: field.unitId,
      label: field.label || field.key,
      fieldType: field.type,
      required: field.required,
      schemaBound: true
    };
  });
}

function validateAttributesBySchema(
  entries: AttributeEntry[],
  schemaRows: SchemaFieldRow[]
): { ok: true } | { ok: false; code: 'required' | 'number' | 'boolean' | 'date'; fieldLabel: string } {
  const byKey = new Map<string, AttributeEntry>();
  for (const row of entries) byKey.set(row.key.toLowerCase(), row);

  for (const field of schemaRows) {
    const entry = byKey.get(field.key.toLowerCase());
    const raw = (entry?.value ?? '').trim();
    const label = field.label || field.key;

    if (field.required && !raw) return { ok: false, code: 'required', fieldLabel: label };
    if (!raw) continue;

    if (field.type === 'number' && !Number.isFinite(Number(raw))) return { ok: false, code: 'number', fieldLabel: label };
    if (field.type === 'boolean' && raw !== 'true' && raw !== 'false') return { ok: false, code: 'boolean', fieldLabel: label };
    if (field.type === 'date' && Number.isNaN(Date.parse(raw))) return { ok: false, code: 'date', fieldLabel: label };
  }

  return { ok: true };
}

function attributeValueToText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function attributeObjectToEntry(raw: unknown): { valueText: string; unitId: number | null } | null {
  if (!isPlainObject(raw)) return null;

  const valueText = 'value' in raw ? attributeValueToText(raw.value) : '';
  const unitRaw = 'unit_id' in raw ? raw.unit_id : 'unitId' in raw ? raw.unitId : null;
  const unitId = Number.isFinite(Number(unitRaw)) ? Number(unitRaw) : null;
  return { valueText, unitId };
}

function attributesToEntries(attributes: unknown | null): AttributeEntry[] {
  if (!isPlainObject(attributes)) return [];
  return Object.entries(attributes).map(([key, value]) => {
    const obj = attributeObjectToEntry(value);
    if (obj) return { key, value: obj.valueText, unitId: obj.unitId };
    return { key, value: attributeValueToText(value), unitId: null };
  });
}

function entriesToAttributes(
  entries: AttributeEntry[]
): { ok: true; value: Record<string, unknown> | null } | { ok: false; message: string } {
  const trimmed = entries
    .map((e) => ({
      key: e.key.trim(),
      value: e.value,
      unitId: e.unitId,
      fieldType: e.fieldType
    }))
    .filter((e) => Boolean(e.key || e.value.trim() || e.unitId != null));

  for (const e of trimmed) {
    if (!e.key) return { ok: false, message: 'key_required' };
  }

  const seen = new Set<string>();
  for (const e of trimmed) {
    const lower = e.key.toLowerCase();
    if (seen.has(lower)) return { ok: false, message: 'duplicate_key' };
    seen.add(lower);
  }

  if (trimmed.length === 0) return { ok: true, value: null };

  const obj: Record<string, unknown> = {};
  for (const e of trimmed) {
    const raw = e.value.trim();
    let v: unknown = null;
    if (raw) {
      if (e.fieldType === 'number') v = Number(raw);
      else if (e.fieldType === 'boolean') v = raw === 'true';
      else v = raw;
    }
    if (e.unitId != null) {
      obj[e.key] = { value: v, unit_id: e.unitId };
    } else {
      obj[e.key] = v;
    }
  }
  return { ok: true, value: obj };
}

function formatRuntime(secondsRaw: number | string): string {
  const seconds = typeof secondsRaw === 'string' ? Number(secondsRaw) : secondsRaw;
  if (!Number.isFinite(seconds) || seconds <= 0) return '0h';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h <= 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export default function AssetsPage() {
  const { t } = useI18n();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const organizationId = useSelector((s: RootState) => s.user.organizationId);
  const locale = useSelector((s: RootState) => s.i18n.locale);
  const { locations } = useSelector((s: RootState) => s.setup);

  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [assetTypes, setAssetTypes] = useState<AssetTypeRow[]>([]);
  const [units, setUnits] = useState<UnitRow[]>([]);

  const [loading, setLoading] = useState(false);
  const [mutating, setMutating] = useState(false);

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<DataTableFilterMeta>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    name: { value: null, matchMode: FilterMatchMode.CONTAINS },
    code: { value: null, matchMode: FilterMatchMode.CONTAINS },
    current_state: { value: null, matchMode: FilterMatchMode.CONTAINS }
  });

  const [createEditOpen, setCreateEditOpen] = useState(false);
  const [createEditMode, setCreateEditMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [locationId, setLocationId] = useState<number | null>(null);
  const [parentAssetId, setParentAssetId] = useState<number | null>(null);
  const [assetTypeId, setAssetTypeId] = useState<number | null>(null);
  const [active, setActive] = useState(true);
  const [attributes, setAttributes] = useState<AttributeEntry[]>([]);
  const [assetTypeDialogOpen, setAssetTypeDialogOpen] = useState(false);

  const locationOptions = useMemo(() => locations.map((l) => ({ label: l.name, value: l.id })), [locations]);
  const assetTypeOptions = useMemo(() => assetTypes.map((at) => ({ label: `${at.name} (${at.code})`, value: at.id })), [assetTypes]);
  const selectedAssetType = useMemo(() => assetTypes.find((at) => at.id === assetTypeId) ?? null, [assetTypeId, assetTypes]);
  const schemaRows = useMemo(() => parseAssetTypeFields(selectedAssetType?.fields ?? null), [selectedAssetType]);
  const schemaMode = schemaRows.length > 0;
  const booleanOptions = useMemo(
    () => [
      { label: t('common.yes', 'Evet'), value: 'true' },
      { label: t('common.no', 'Hayir'), value: 'false' }
    ],
    [t]
  );

  const unitOptions = useMemo(() => {
    const activeUnits = units.filter((u) => u.active);
    return activeUnits.map((u) => {
      const localizedName = locale === 'tr' ? u.tr_name ?? u.name : u.en_name ?? u.name;
      const localizedSymbol = locale === 'tr' ? u.tr_symbol ?? u.symbol : u.en_symbol ?? u.symbol;
      const label = localizedSymbol?.trim() ? localizedSymbol.trim() : localizedName;
      return { label, value: u.id };
    });
  }, [locale, units]);
  const unitLabelById = useMemo(() => {
    const map = new Map<number, string>();
    for (const option of unitOptions) map.set(option.value, option.label);
    return map;
  }, [unitOptions]);

  const parentOptions = useMemo(() => {
    return assets
      .filter((a) => (createEditMode === 'edit' && editingId ? a.id !== editingId : true))
      .map((a) => ({ label: a.name, value: a.id }));
  }, [assets, createEditMode, editingId]);

  const locationNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const l of locations) map.set(l.id, l.name);
    return map;
  }, [locations]);

  useEffect(() => {
    if (!organizationId) return;
    if (locations.length === 0) dispatch(fetchOrganizationSetup({ organizationId }));
  }, [dispatch, organizationId, locations.length]);

  const loadAll = async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const [assetsRes, assetTypesRes, unitsRes] = await Promise.all([
        api.get(`/api/organizations/${organizationId}/assets`),
        api.get(`/api/organizations/${organizationId}/asset-types`),
        api.get(`/api/organizations/${organizationId}/units`)
      ]);
      setAssets((assetsRes.data.assets ?? []) as AssetRow[]);
      setAssetTypes((assetTypesRes.data.assetTypes ?? []) as AssetTypeRow[]);
      setUnits((unitsRes.data.units ?? []) as UnitRow[]);
    } catch {
      dispatch(
        enqueueToast({
          severity: 'error',
          summary: t('common.error', 'Hata'),
          detail: t('asset.load_failed', 'Varlıklar yüklenemedi.')
        })
      );
    } finally {
      setLoading(false);
    }
  };

  const refreshAssetTypes = async (nextSelectedId?: number) => {
    if (!organizationId) return;
    try {
      const response = await api.get(`/api/organizations/${organizationId}/asset-types`);
      setAssetTypes((response.data.assetTypes ?? []) as AssetTypeRow[]);
      if (nextSelectedId) setAssetTypeId(nextSelectedId);
    } catch {
      // ignore: asset types are not critical for loading assets list
    }
  };

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  useEffect(() => {
    if (!createEditOpen) return;
    if (schemaRows.length === 0) {
      if (createEditMode === 'create') {
        setAttributes([]);
      } else {
        setAttributes((prev) => prev.map((row) => ({ key: row.key, value: row.value, unitId: row.unitId })));
      }
      return;
    }
    setAttributes((prev) => mergeAttributesWithSchema(prev, schemaRows));
  }, [createEditMode, createEditOpen, schemaRows]);

  const openDetails = (row: AssetRow) => {
    navigate(`/assets/${row.id}`);
  };

  const openCreate = () => {
    setCreateEditMode('create');
    setEditingId(null);
    setName('');
    setCode('');
    setLocationId(null);
    setParentAssetId(null);
    setAssetTypeId(null);
    setActive(true);
    setAttributes([]);
    setCreateEditOpen(true);
  };

  const openEdit = (row: AssetRow) => {
    setCreateEditMode('edit');
    setEditingId(row.id);
    setName(row.name);
    setCode(row.code ?? '');
    setLocationId(row.location_id ?? null);
    setParentAssetId(row.parent_asset_id ?? null);
    setAssetTypeId(row.asset_type_id ?? null);
    setActive(row.active);
    setAttributes(attributesToEntries(row.attributes_json ?? null));
    setCreateEditOpen(true);
  };

  const submit = async () => {
    if (!organizationId) return;
    if (!name.trim()) return;

    if (createEditMode === 'create' && !locationId) {
      dispatch(
        enqueueToast({
          severity: 'warn',
          summary: t('common.validation', 'Kontrol'),
          detail: t('asset.location_required', 'Lokasyon seçilmelidir.')
        })
      );
      return;
    }

    if (schemaMode) {
      const schemaValidation = validateAttributesBySchema(attributes, schemaRows);
      if (!schemaValidation.ok) {
        const detailBase =
          schemaValidation.code === 'required'
            ? t('asset.attributes_required', 'Bu alan zorunludur.')
            : schemaValidation.code === 'number'
              ? t('asset.attributes_number_invalid', 'Gecerli bir sayi girilmelidir.')
              : schemaValidation.code === 'boolean'
                ? t('asset.attributes_boolean_invalid', 'Bu alan Evet/Hayir olmali.')
                : t('asset.attributes_date_invalid', 'Gecerli bir tarih girilmelidir.');

        dispatch(
          enqueueToast({
            severity: 'warn',
            summary: t('common.validation', 'Kontrol'),
            detail: `${schemaValidation.fieldLabel}: ${detailBase}`
          })
        );
        return;
      }
    }

    const parsedAttr = entriesToAttributes(attributes);
    if (!parsedAttr.ok) {
      dispatch(
        enqueueToast({
          severity: 'warn',
          summary: t('common.validation', 'Kontrol'),
          detail:
            parsedAttr.message === 'duplicate_key'
              ? t('asset.attributes_duplicate', 'Ayni anahtar birden fazla kez kullanilamaz.')
              : t('asset.attributes_key_required', 'Ozellik anahtari bos birakilamaz.')
        })
      );
      return;
    }

    setMutating(true);
    try {
      if (createEditMode === 'create') {
        const res = await api.post(`/api/organizations/${organizationId}/assets`, {
          location_id: locationId,
          parent_asset_id: parentAssetId,
          asset_type_id: assetTypeId,
          code: code.trim() || null,
          name: name.trim(),
          active,
          attributes_json: parsedAttr.value
        });
        dispatch(
          enqueueToast({
            severity: 'success',
            summary: t('common.success', 'Başarılı'),
            detail: t('asset.created', 'Varlık oluşturuldu.')
          })
        );
        setCreateEditOpen(false);
        await loadAll();
        const created = res.data.asset as AssetRow;
        navigate(`/assets/${created.id}`);
      } else if (editingId) {
        await api.put(`/api/organizations/${organizationId}/assets/${editingId}`, {
          parent_asset_id: parentAssetId,
          asset_type_id: assetTypeId,
          code: code.trim() || null,
          name: name.trim(),
          active,
          attributes_json: parsedAttr.value
        });
        dispatch(
          enqueueToast({
            severity: 'success',
            summary: t('common.success', 'Başarılı'),
            detail: t('asset.updated', 'Varlık güncellendi.')
          })
        );
        setCreateEditOpen(false);
        await loadAll();
      }
    } catch (err: unknown) {
      const backendMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      dispatch(
        enqueueToast({
          severity: 'error',
          summary: t('common.error', 'Hata'),
          detail: backendMessage || t('asset.save_failed', 'Kaydetme başarısız.')
        })
      );
    } finally {
      setMutating(false);
    }
  };

  const remove = (row: AssetRow) => {
    if (!organizationId) return;
    confirmDialog({
      message: t('asset.confirm.delete', `${row.name} kaydini silmek istiyor musun?`),
      header: t('inventory.confirm.title', 'Silme Onayi'),
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger p-button-sm',
      acceptLabel: t('common.delete', 'Sil'),
      rejectLabel: t('common.cancel', 'Vazgec'),
      accept: async () => {
        setMutating(true);
        try {
          await api.delete(`/api/organizations/${organizationId}/assets/${row.id}`);
          dispatch(
            enqueueToast({
              severity: 'success',
              summary: t('common.success', 'Başarılı'),
              detail: t('asset.deleted', 'Varlık silindi.')
            })
          );
          await loadAll();
        } catch {
          dispatch(
            enqueueToast({
              severity: 'error',
              summary: t('common.error', 'Hata'),
              detail: t('asset.delete_failed', 'Silme başarısız.')
            })
          );
        } finally {
          setMutating(false);
        }
      }
    });
  };

  if (!organizationId) {
    return (
      <Message
        severity="warn"
        text={t('common.organization_missing', 'Organization bulunamadi. Lutfen tekrar giris yap.')}
        className="w-full"
      />
    );
  }

  const globalFilterFields = ['name', 'code', 'current_state'];

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
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
            className="w-full p-inputtext-sm sm:w-72"
          />
        </IconField>
        <Button label={t('asset.new', 'Yeni Varlik')} icon="pi pi-plus" size="small" onClick={openCreate} />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white py-2">
        <DataTable
          value={assets}
          size="small"
          loading={loading || mutating}
          emptyMessage={t('asset.empty', 'Varlık yok.')}
          dataKey="id"
          paginator
          rows={12}
          filters={filters}
          onFilter={(e) => setFilters(e.filters)}
          globalFilterFields={globalFilterFields}
          tableStyle={{ minWidth: '58rem' }}
        >
          <Column
            field="name"
            header={t('common.name', 'Isim')}
            sortable
            filter
            body={(row: AssetRow) => (
              <button
                type="button"
                className="cursor-pointer text-left font-medium text-sky-700 hover:text-sky-800 hover:underline"
                onClick={() => openDetails(row)}
              >
                {row.name}
              </button>
            )}
          />
          <Column field="code" header={t('common.code', 'Kod')} sortable filter style={{ width: '10rem' }} />
          <Column
            header={t('asset.col.location', 'Lokasyon')}
            style={{ width: '14rem' }}
            body={(row: AssetRow) => <span>{row.location_id ? locationNameById.get(row.location_id) ?? '-' : '-'}</span>}
          />
          <Column field="current_state" header={t('asset.col.state', 'Durum')} sortable filter style={{ width: '10rem' }} />
          <Column
            header={t('asset.col.runtime', 'Calisma')}
            style={{ width: '10rem' }}
            body={(row: AssetRow) => (
              <div className="grid">
                <span className="text-sm">{formatRuntime(row.runtime_seconds)}</span>
                {row.current_state === 'RUNNING' && row.running_since ? (
                  <span className="text-xs text-slate-500">{t('asset.running_since', 'Running since')}: {new Date(row.running_since).toLocaleString()}</span>
                ) : null}
              </div>
            )}
          />
          <Column
            field="active"
            header={t('common.active', 'Aktif')}
            sortable
            style={{ width: '7rem' }}
            body={(row: AssetRow) => <span>{row.active ? t('common.yes', 'Evet') : t('common.no', 'Hayir')}</span>}
          />
          <Column
            header=""
            style={{ width: '10rem' }}
            body={(row: AssetRow) => (
              <div className="flex items-center justify-end gap-1">
                <Button icon="pi pi-eye" size="small" text rounded onClick={() => openDetails(row)} aria-label={t('common.details', 'Detay')} />
                <Button icon="pi pi-pencil" size="small" text rounded onClick={() => openEdit(row)} aria-label={t('inventory.action.edit', 'Duzenle')} />
                <Button icon="pi pi-trash" size="small" text rounded severity="danger" onClick={() => remove(row)} aria-label={t('common.delete', 'Sil')} />
              </div>
            )}
          />
        </DataTable>
      </div>

      <Dialog
        header={createEditMode === 'edit' ? t('asset.edit', 'Varlik Duzenle') : t('asset.new', 'Yeni Varlik')}
        visible={createEditOpen}
        onHide={() => setCreateEditOpen(false)}
        className="asset-entry-dialog w-full max-w-xl"
      >
        <div className="grid gap-3">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">{t('common.name', 'Isim')}</span>
            <InputText value={name} onChange={(e) => setName(e.target.value)} className="w-full p-inputtext-sm" />
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700">{t('common.code', 'Kod')}</span>
              <InputText value={code} onChange={(e) => setCode(e.target.value)} className="w-full p-inputtext-sm" />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700">{t('asset.type', 'Tip')}</span>
              <div className="flex items-center gap-2">
                <Dropdown
                  value={assetTypeId}
                  onChange={(e) => setAssetTypeId(e.value)}
                  options={assetTypeOptions}
                  className="w-full p-inputtext-sm"
                />
                <Button
                  icon="pi pi-plus"
                  size="small"
                  outlined
                  type="button"
                  className="h-[1.95rem] w-[1.95rem] p-0"
                  onClick={() => setAssetTypeDialogOpen(true)}
                  aria-label={t('asset_types.new', 'Yeni Tip')}
                />
              </div>
            </label>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="grid gap-2">
              <div className="flex h-8 items-center gap-1">
                <span className="text-sm font-medium text-slate-700">{t('asset.location', 'Lokasyon')}</span>
                {createEditMode === 'edit' ? (
                  <Button
                    icon="pi pi-info-circle"
                    size="small"
                    text
                    rounded
                    type="button"
                    aria-label={t('asset.location_move_hint', 'Lokasyon degisikligi icin Detay > Tasi kullan.')}
                    tooltip={t('asset.location_move_hint', 'Lokasyon degisikligi icin Detay > Tasi kullan.')}
                    tooltipOptions={{ position: 'top' }}
                  />
                ) : null}
              </div>
              <Dropdown
                value={locationId}
                onChange={(e) => setLocationId(e.value)}
                options={locationOptions}
                className="w-full p-inputtext-sm"
                disabled={createEditMode === 'edit'}
                placeholder={t('common.select', 'Sec')}
              />
            </label>
            <label className="grid gap-2">
              <div className="flex h-8 items-center">
                <span className="text-sm font-medium text-slate-700">{t('asset.parent', 'Ust Varlik')}</span>
              </div>
              <Dropdown
                value={parentAssetId}
                onChange={(e) => setParentAssetId(e.value)}
                options={parentOptions}
                className="w-full p-inputtext-sm"
                showClear
              />
            </label>
          </div>
          <label className="grid gap-2">
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium text-slate-700">{t('asset.attributes', 'Ozellikler')}</span>
              <Button
                icon="pi pi-info-circle"
                size="small"
                text
                rounded
                type="button"
                aria-label={t('asset.attributes_from_type', 'Secili tipe gore alanlar otomatik getirildi.')}
                tooltip={
                  schemaMode
                    ? `${t('asset.attributes_from_type', 'Secili tipe gore alanlar otomatik getirildi.')} ${t(
                        'asset.attributes_unit_locked',
                        'Birimler tipten gelir ve bu ekranda degistirilemez.'
                      )}`
                    : t('asset.attributes_from_type', 'Secili tipe gore alanlar otomatik getirildi.')
                }
                tooltipOptions={{ position: 'top' }}
              />
            </div>
            <div className="grid gap-2">
              {schemaMode ? (
                <>
                  {attributes.map((row, idx) => (
                    <div
                      key={`${row.key}-${idx}`}
                      className="grid items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 sm:grid-cols-[minmax(12rem,1fr)_minmax(0,1fr)_minmax(10rem,12rem)]"
                    >
                      <div className="grid gap-0.5">
                        <span className="text-sm font-medium text-slate-700">
                          {row.label || row.key} {row.required ? <span className="text-rose-600">*</span> : null}
                        </span>
                      </div>
                      {row.fieldType === 'boolean' ? (
                        <Dropdown
                          value={row.value}
                          onChange={(e) => setAttributes((prev) => prev.map((p, i) => (i === idx ? { ...p, value: e.value ?? '' } : p)))}
                          options={booleanOptions}
                          className="w-full p-inputtext-sm"
                          placeholder={t('asset.attributes_value', 'Deger')}
                          showClear={!row.required}
                        />
                      ) : row.fieldType === 'date' ? (
                        <InputText
                          type="date"
                          value={row.value}
                          onChange={(e) => setAttributes((prev) => prev.map((p, i) => (i === idx ? { ...p, value: e.target.value } : p)))}
                          className="w-full p-inputtext-sm"
                        />
                      ) : row.fieldType === 'number' ? (
                        <InputText
                          type="number"
                          value={row.value}
                          onChange={(e) => setAttributes((prev) => prev.map((p, i) => (i === idx ? { ...p, value: e.target.value } : p)))}
                          placeholder={t('asset.attributes_value', 'Deger')}
                          className="w-full p-inputtext-sm"
                        />
                      ) : (
                        <InputText
                          value={row.value}
                          onChange={(e) => setAttributes((prev) => prev.map((p, i) => (i === idx ? { ...p, value: e.target.value } : p)))}
                          placeholder={t('asset.attributes_value', 'Deger')}
                          className="w-full p-inputtext-sm"
                        />
                      )}
                      <div className="asset-unit-readonly flex items-center rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700">
                        {row.unitId ? unitLabelById.get(row.unitId) ?? '-' : '-'}
                      </div>
                    </div>
                  ))}
                </>
              ) : createEditMode === 'edit' ? (
                <>
                  {attributes.map((row, idx) => (
                    <div
                      key={`${row.key}-${idx}`}
                      className="grid items-center gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(10rem,12rem)_2.5rem]"
                    >
                      <InputText
                        value={row.key}
                        onChange={(e) =>
                          setAttributes((prev) => prev.map((p, i) => (i === idx ? { ...p, key: e.target.value } : p)))
                        }
                        placeholder={t('asset.attributes_key', 'Anahtar')}
                        className="w-full p-inputtext-sm"
                      />
                      <InputText
                        value={row.value}
                        onChange={(e) =>
                          setAttributes((prev) => prev.map((p, i) => (i === idx ? { ...p, value: e.target.value } : p)))
                        }
                        placeholder={t('asset.attributes_value', 'Deger')}
                        className="w-full p-inputtext-sm"
                      />
                      <Dropdown
                        value={row.unitId}
                        onChange={(e) =>
                          setAttributes((prev) => prev.map((p, i) => (i === idx ? { ...p, unitId: e.value ?? null } : p)))
                        }
                        options={unitOptions}
                        className="w-full p-inputtext-sm"
                        placeholder={t('asset.attributes_unit', 'Birim')}
                        showClear
                        filter
                      />
                      <Button
                        icon="pi pi-trash"
                        size="small"
                        text
                        rounded
                        severity="danger"
                        type="button"
                        onClick={() => setAttributes((prev) => prev.filter((_, i) => i !== idx))}
                        aria-label={t('common.delete', 'Sil')}
                      />
                    </div>
                  ))}
                  <div>
                    <Button
                      label={t('asset.attributes_add', 'Ozellik Ekle')}
                      icon="pi pi-plus"
                      size="small"
                      type="button"
                      onClick={() => setAttributes((prev) => [...prev, { key: '', value: '', unitId: null }])}
                    />
                  </div>
                </>
              ) : null}
            </div>
          </label>
          <label className="flex items-center gap-2">
            <Checkbox checked={active} onChange={(e) => setActive(Boolean(e.checked))} />
            <span className="text-sm text-slate-700">{t('common.active', 'Aktif')}</span>
          </label>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button label={t('common.cancel', 'Vazgec')} size="small" text onClick={() => setCreateEditOpen(false)} />
            <Button label={t('common.save', 'Kaydet')} size="small" onClick={() => void submit()} loading={mutating} disabled={!name.trim()} />
          </div>
        </div>
      </Dialog>

      {organizationId ? (
        <AssetTypeUpsertDialog
          organizationId={organizationId}
          visible={assetTypeDialogOpen}
          onHide={() => setAssetTypeDialogOpen(false)}
          editing={null}
          onSaved={(saved) => void refreshAssetTypes((saved as { id?: number }).id)}
        />
      ) : null}
    </div>
  );
}
