import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Column } from 'primereact/column';
import { confirmDialog } from 'primereact/confirmdialog';
import { DataTable } from 'primereact/datatable';
import type { DataTableFilterMeta } from 'primereact/datatable';
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
import AssetEditDialog from '../components/assets/AssetEditDialog';

type AssetRow = {
  id: number;
  organization_id: number;
  location_id: number | null;
  parent_asset_id: number | null;
  asset_type_id: number | null;
  code: string | null;
  name: string;
  image_url: string | null;
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
  data_type: SchemaFieldType;
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

function normalizeAttributeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

const DEFAULT_ATTRIBUTE_ALIASES = {
  brand: ['marka', 'brand'],
  model: ['model'],
  serial: ['seri_no', 'serial_no', 'serino', 'serialno']
} as const;

function isDefaultAttributeRow(row: AttributeEntry): boolean {
  const key = normalizeAttributeToken(row.key);
  const label = normalizeAttributeToken(row.label ?? '');
  const isBrand = DEFAULT_ATTRIBUTE_ALIASES.brand.some((x) => key === normalizeAttributeToken(x) || label === normalizeAttributeToken(x));
  const isModel = DEFAULT_ATTRIBUTE_ALIASES.model.some((x) => key === normalizeAttributeToken(x) || label === normalizeAttributeToken(x));
  const isSerial = DEFAULT_ATTRIBUTE_ALIASES.serial.some((x) => key === normalizeAttributeToken(x) || label === normalizeAttributeToken(x));
  return isBrand || isModel || isSerial;
}

function pickAttributeValue(attributes: AttributeEntry[], aliases: readonly string[]): string {
  const aliasTokens = aliases.map(normalizeAttributeToken);
  const matched = attributes.find((row) => {
    const key = normalizeAttributeToken(row.key);
    if (aliasTokens.includes(key)) return true;
    const label = normalizeAttributeToken(row.label ?? '');
    if (label && aliasTokens.includes(label)) return true;
    return false;
  });
  return matched?.value ?? '';
}

function upsertAttributeValue(
  prev: AttributeEntry[],
  {
    canonicalKey,
    aliases,
    value,
    schemaRows
  }: { canonicalKey: string; aliases: readonly string[]; value: string; schemaRows: SchemaFieldRow[] }
): AttributeEntry[] {
  const aliasTokens = aliases.map(normalizeAttributeToken);
  const canonicalToken = normalizeAttributeToken(canonicalKey);
  const schemaMatch = schemaRows.find((r) => normalizeAttributeToken(r.key) === canonicalToken) ?? null;

  const idx = prev.findIndex((row) => {
    const key = normalizeAttributeToken(row.key);
    if (aliasTokens.includes(key)) return true;
    const label = normalizeAttributeToken(row.label ?? '');
    if (label && aliasTokens.includes(label)) return true;
    return false;
  });

  if (idx >= 0) {
    return prev.map((row, i) => (i === idx ? { ...row, value } : row));
  }

  return [
    ...prev,
    {
      key: canonicalKey,
      value,
      unitId: schemaMatch?.unitId ?? null,
      label: schemaMatch?.label ?? canonicalKey,
      fieldType: schemaMatch?.type ?? 'text',
      required: schemaMatch?.required ?? false,
      schemaBound: Boolean(schemaMatch)
    }
  ];
}

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
      type: normalizeFieldType(row.data_type),
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

const MAX_ASSET_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('invalid_result'));
    };
    reader.onerror = () => reject(new Error('read_failed'));
    reader.readAsDataURL(file);
  });
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
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<number | null>(null);
  const [parentAssetId, setParentAssetId] = useState<number | null>(null);
  const [assetTypeId, setAssetTypeId] = useState<number | null>(null);
  const [active, setActive] = useState(true);
  const [attributes, setAttributes] = useState<AttributeEntry[]>([]);
  const [assetTypeDialogOpen, setAssetTypeDialogOpen] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [imageActionsOpen, setImageActionsOpen] = useState(false);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

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

  const brandValue = useMemo(() => pickAttributeValue(attributes, DEFAULT_ATTRIBUTE_ALIASES.brand), [attributes]);
  const modelValue = useMemo(() => pickAttributeValue(attributes, DEFAULT_ATTRIBUTE_ALIASES.model), [attributes]);
  const serialValue = useMemo(() => pickAttributeValue(attributes, DEFAULT_ATTRIBUTE_ALIASES.serial), [attributes]);

  const visibleAttributes = useMemo(() => attributes.filter((row) => !isDefaultAttributeRow(row)), [attributes]);

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
          detail: t('asset.load_failed', 'Makineler yuklenemedi.')
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
    setCreateDialogOpen(true);
  };

  const openEdit = (row: AssetRow) => {
    setCreateEditMode('edit');
    setEditingId(row.id);
    setName(row.name);
    setCode(row.code ?? '');
    setImageUrl(row.image_url ?? null);
    setImageActionsOpen(false);
    setImagePreviewOpen(false);
    setLocationId(row.location_id ?? null);
    setParentAssetId(row.parent_asset_id ?? null);
    setAssetTypeId(row.asset_type_id ?? null);
    setActive(row.active);
    setAttributes(attributesToEntries(row.attributes_json ?? null));
    setCreateEditOpen(true);
  };

  const closeCreateEdit = () => {
    setCreateEditOpen(false);
    setImageActionsOpen(false);
    setImagePreviewOpen(false);
  };

  const pickAssetImage = () => {
    imageInputRef.current?.click();
  };

  const onAssetImageSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.toLowerCase().startsWith('image/')) {
      dispatch(
        enqueueToast({
          severity: 'warn',
          summary: t('common.validation', 'Kontrol'),
          detail: t('asset.image_invalid_type', 'Lutfen gecerli bir resim dosyasi sec.')
        })
      );
      return;
    }

    if (file.size > MAX_ASSET_IMAGE_SIZE_BYTES) {
      dispatch(
        enqueueToast({
          severity: 'warn',
          summary: t('common.validation', 'Kontrol'),
          detail: t('asset.image_too_large', 'Resim en fazla 2 MB olabilir.')
        })
      );
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      if (!dataUrl.toLowerCase().startsWith('data:image/')) throw new Error('invalid_data_url');
      setImageUrl(dataUrl);
      setImageActionsOpen(false);
    } catch {
      dispatch(
        enqueueToast({
          severity: 'error',
          summary: t('common.error', 'Hata'),
          detail: t('asset.image_read_failed', 'Resim dosyasi okunamadi.')
        })
      );
    }
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
          image_url: imageUrl,
          active,
          attributes_json: parsedAttr.value
        });
        dispatch(
          enqueueToast({
            severity: 'success',
            summary: t('common.success', 'Başarılı'),
            detail: t('asset.created', 'Makine olusturuldu.')
          })
        );
        closeCreateEdit();
        await loadAll();
        const created = res.data.asset as AssetRow;
        navigate(`/assets/${created.id}`);
      } else if (editingId) {
        await api.put(`/api/organizations/${organizationId}/assets/${editingId}`, {
          parent_asset_id: parentAssetId,
          asset_type_id: assetTypeId,
          code: code.trim() || null,
          name: name.trim(),
          image_url: imageUrl,
          active,
          attributes_json: parsedAttr.value
        });
        dispatch(
          enqueueToast({
            severity: 'success',
            summary: t('common.success', 'Başarılı'),
            detail: t('asset.updated', 'Makine guncellendi.')
          })
        );
        closeCreateEdit();
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
              detail: t('asset.deleted', 'Makine silindi.')
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
        <Button label={t('asset.new', 'Yeni Makine')} icon="pi pi-plus" size="small" onClick={openCreate} />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white py-2">
        <DataTable
          value={assets}
          size="small"
          loading={loading || mutating}
          emptyMessage={t('asset.empty', 'Makine yok.')}
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
            body={(row: AssetRow) => <span className="font-medium text-slate-900">{row.name}</span>}
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
                <Button icon="pi pi-trash" size="small" text rounded severity="danger" onClick={() => remove(row)} aria-label={t('common.delete', 'Sil')} />
              </div>
            )}
          />
        </DataTable>
      </div>

      {organizationId ? (
        <AssetEditDialog
          organizationId={organizationId}
          mode="create"
          asset={null}
          visible={createDialogOpen}
          onHide={() => setCreateDialogOpen(false)}
          onSaved={(assetId) => {
            setCreateDialogOpen(false);
            void loadAll();
            navigate(`/assets/${assetId}`);
          }}
        />
      ) : null}
    </div>
  );
}
