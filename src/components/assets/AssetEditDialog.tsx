import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import AppDialog from '../common/AppDialog';

import type { AppDispatch, RootState } from '../../store';
import { api } from '../../services/api';
import { useI18n } from '../../hooks/useI18n';
import { enqueueToast } from '../../store/uiSlice';
import AssetTypeAddEditDialog from '../assetTypes/AssetTypeAddEditDialog';

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
  attributes_json: unknown | null;
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

type AssetEditDialogProps = {
  organizationId: number;
  mode: 'create' | 'edit';
  asset: AssetRow | null;
  visible: boolean;
  onHide: () => void;
  onSaved?: (assetId: number) => void;
};

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

export default function AssetEditDialog({ organizationId, mode, asset, visible, onHide, onSaved }: AssetEditDialogProps) {
  const { t } = useI18n();
  const dispatch = useDispatch<AppDispatch>();
  const locale = useSelector((s: RootState) => s.i18n.locale);
  const { locations } = useSelector((s: RootState) => s.setup);

  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [assetTypes, setAssetTypes] = useState<AssetTypeRow[]>([]);
  const [units, setUnits] = useState<UnitRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [mutating, setMutating] = useState(false);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<number | null>(null);
  const [parentAssetId, setParentAssetId] = useState<number | null>(null);
  const [assetTypeId, setAssetTypeId] = useState<number | null>(null);
  const [active, setActive] = useState(true);
  const [attributes, setAttributes] = useState<AttributeEntry[]>([]);

  const [assetTypeDialogOpen, setAssetTypeDialogOpen] = useState(false);
  const loadPendingRef = useRef(0);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [imageActionsOpen, setImageActionsOpen] = useState(false);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);

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
    const selfId = asset?.id ?? null;
    return assets.filter((a) => (selfId ? a.id !== selfId : true)).map((a) => ({ label: a.name, value: a.id }));
  }, [asset?.id, assets]);

  const selectedParent = useMemo(() => {
    if (!parentAssetId) return null;
    return assets.find((a) => a.id === parentAssetId) ?? null;
  }, [assets, parentAssetId]);

  const locationLockedByParent = Boolean(parentAssetId);
  const parentLocationId = selectedParent?.location_id ?? null;

  useEffect(() => {
    if (!visible) return;
    if (mode === 'edit') {
      if (!asset) return;
      setName(asset.name);
      setCode(asset.code ?? '');
      setImageUrl(asset.image_url ?? null);
      setLocationId(asset.location_id ?? null);
      setParentAssetId(asset.parent_asset_id ?? null);
      setAssetTypeId(asset.asset_type_id ?? null);
      setActive(Boolean(asset.active));
      setAttributes(attributesToEntries(asset.attributes_json ?? null));
    } else {
      setName('');
      setCode('');
      setImageUrl(null);
      setLocationId(null);
      setParentAssetId(null);
      setAssetTypeId(null);
      setActive(true);
      setAttributes([]);
    }
    setImageActionsOpen(false);
    setImagePreviewOpen(false);
  }, [asset, mode, visible]);

  useEffect(() => {
    if (!visible) return;
    if (!locationLockedByParent) return;
    if (!parentLocationId) return;
    setLocationId(parentLocationId);
  }, [locationLockedByParent, parentLocationId, visible]);

  useEffect(() => {
    if (!visible) return;
    let mounted = true;

    const beginLoad = () => {
      loadPendingRef.current += 1;
      setLoading(true);
    };

    const endLoad = () => {
      loadPendingRef.current = Math.max(0, loadPendingRef.current - 1);
      if (loadPendingRef.current === 0) setLoading(false);
    };

    beginLoad();
    void api
      .get(`/api/organizations/${organizationId}/assets`)
      .then((assetsRes) => {
        if (!mounted) return;
        setAssets((assetsRes.data.assets ?? []) as AssetRow[]);
      })
      .catch(() => {
        if (!mounted) return;
        dispatch(
          enqueueToast({
            severity: 'error',
            summary: t('common.error', 'Hata'),
            detail: t('asset.load_failed', 'Makineler yuklenemedi.')
          })
        );
      })
      .finally(() => {
        if (!mounted) return;
        endLoad();
      });

    beginLoad();
    void api
      .get(`/api/organizations/${organizationId}/asset-types`)
      .then((assetTypesRes) => {
        if (!mounted) return;
        setAssetTypes((assetTypesRes.data.assetTypes ?? []) as AssetTypeRow[]);
      })
      .catch(() => {
        if (!mounted) return;
        setAssetTypes([]);
      })
      .finally(() => {
        if (!mounted) return;
        endLoad();
      });

    beginLoad();
    void api
      .get(`/api/organizations/${organizationId}/units`)
      .then((unitsRes) => {
        if (!mounted) return;
        setUnits((unitsRes.data.units ?? []) as UnitRow[]);
      })
      .catch(() => {
        if (!mounted) return;
        setUnits([]);
      })
      .finally(() => {
        if (!mounted) return;
        endLoad();
      });

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, visible]);

  useEffect(() => {
    if (!visible) return;
    if (schemaRows.length === 0) return;
    setAttributes((prev) => mergeAttributesWithSchema(prev, schemaRows));
  }, [schemaRows, visible]);

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

  const refreshAssetTypes = async (nextSelectedId?: number) => {
    try {
      const response = await api.get(`/api/organizations/${organizationId}/asset-types`);
      setAssetTypes((response.data.assetTypes ?? []) as AssetTypeRow[]);
      if (nextSelectedId) setAssetTypeId(nextSelectedId);
    } catch {
      // ignore
    }
  };

  const submit = async () => {
    if (!name.trim()) return;

    if (!assetTypeId) {
      dispatch(
        enqueueToast({
          severity: 'warn',
          summary: t('common.validation', 'Kontrol'),
          detail: t('asset.type_required', 'Makine tipi seçilmelidir.')
        })
      );
      return;
    }

    const desiredLocationId = locationLockedByParent ? parentLocationId : locationId;
    if (!desiredLocationId) {
      dispatch(
        enqueueToast({
          severity: 'warn',
          summary: t('common.validation', 'Kontrol'),
          detail: locationLockedByParent
            ? t('asset.location_parent_missing', 'Üst makinenin lokasyonu bulunamadı.')
            : t('asset.location_required', 'Lokasyon seçilmelidir.')
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
      if (mode === 'create') {
        const res = await api.post(`/api/organizations/${organizationId}/assets`, {
          location_id: desiredLocationId,
          parent_asset_id: parentAssetId,
          asset_type_id: assetTypeId,
          code: code.trim() || null,
          name: name.trim(),
          image_url: imageUrl,
          active,
          attributes_json: parsedAttr.value
        });
        const created = res.data.asset as { id?: number } | null;
        const createdId = Number(created?.id);
        if (!Number.isFinite(createdId) || createdId <= 0) throw new Error('invalid_created_id');

        dispatch(
          enqueueToast({
            severity: 'success',
            summary: t('common.success', 'Başarılı'),
            detail: t('asset.created', 'Makine olusturuldu.')
          })
        );
        onHide();
        onSaved?.(createdId);
      } else {
        if (!asset?.id) return;
        await api.put(`/api/organizations/${organizationId}/assets/${asset.id}`, {
          parent_asset_id: parentAssetId,
          asset_type_id: assetTypeId,
          code: code.trim() || null,
          name: name.trim(),
          image_url: imageUrl,
          active,
          attributes_json: parsedAttr.value
        });

        if (desiredLocationId !== (asset.location_id ?? null)) {
          await api.post(`/api/organizations/${organizationId}/assets/${asset.id}/move`, {
            to_location_id: desiredLocationId
          });
        }

        dispatch(
          enqueueToast({
            severity: 'success',
            summary: t('common.success', 'Başarılı'),
            detail: t('asset.updated', 'Makine guncellendi.')
          })
        );
        onHide();
        onSaved?.(asset.id);
      }
    } catch {
      dispatch(
        enqueueToast({
          severity: 'error',
          summary: t('common.error', 'Hata'),
          detail: t('asset.save_failed', 'Kaydetme başarısız.')
        })
      );
    } finally {
      setMutating(false);
    }
  };

  return (
    <>
      <AppDialog
        id="asset-edit"
        header={mode === 'create' ? t('asset.new', 'Yeni Makine') : t('asset.edit', 'Makine Duzenle')}
        visible={visible}
        onHide={() => {
          setImageActionsOpen(false);
          setImagePreviewOpen(false);
          onHide();
        }}
        className="asset-entry-dialog w-full max-w-xl"
      >
        {mode === 'edit' && !asset ? (
          <Message severity="warn" text={t('asset.details_empty', 'Makine secilmedi.')} className="w-full" />
        ) : loading ? (
          <Message severity="info" text={t('common.loading', 'Yukleniyor...')} className="w-full" />
        ) : (
          <div className="grid gap-4">
            <div className="grid items-start gap-3 sm:grid-cols-2">
              <div className="grid">
                <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onAssetImageSelected(e)} />
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setImageActionsOpen((prev) => !prev)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setImageActionsOpen((prev) => !prev);
                    }
                  }}
                  className="group relative aspect-square w-full cursor-pointer overflow-hidden rounded-lg border border-slate-200 bg-white outline-none ring-offset-2 transition hover:border-sky-300 focus-visible:ring-2 focus-visible:ring-sky-300"
                  aria-label={t('asset.image_actions', 'Resim islemleri')}
                >
                  {imageUrl ? (
                    <img src={imageUrl} alt={name.trim() || t('asset.image', 'Resim')} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-slate-400">
                      <i className="pi pi-image text-xl" aria-hidden />
                    </div>
                  )}
                  <div
                    className={`pointer-events-none absolute inset-x-2 bottom-2 flex justify-end transition-all duration-200 ${
                      imageActionsOpen ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
                    }`}
                  >
                    <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-slate-200 bg-white/95 p-1 shadow-sm backdrop-blur">
                      <Button
                        icon={imageUrl ? 'pi pi-pencil' : 'pi pi-plus'}
                        size="small"
                        text
                        rounded
                        type="button"
                        className="h-7 w-7"
                        aria-label={imageUrl ? t('asset.image_change', 'Resim Degistir') : t('asset.image_add', 'Resim Ekle')}
                        onClick={(event) => {
                          event.stopPropagation();
                          pickAssetImage();
                        }}
                      />
                      {imageUrl ? (
                        <>
                          <Button
                            icon="pi pi-search-plus"
                            size="small"
                            text
                            rounded
                            type="button"
                            className="h-7 w-7"
                            aria-label={t('asset.image_preview', 'Resmi Buyut')}
                            onClick={(event) => {
                              event.stopPropagation();
                              setImagePreviewOpen(true);
                            }}
                          />
                          <Button
                            icon="pi pi-trash"
                            size="small"
                            text
                            rounded
                            severity="danger"
                            type="button"
                            className="h-7 w-7"
                            aria-label={t('asset.image_remove', 'Resmi Kaldir')}
                            onClick={(event) => {
                              event.stopPropagation();
                              setImageUrl(null);
                              setImageActionsOpen(false);
                            }}
                          />
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid content-start gap-4">
                <label className="grid gap-1.5">
                  <span className="text-sm font-medium text-slate-700">{t('common.name', 'Isim')}</span>
                  <InputText value={name} onChange={(e) => setName(e.target.value)} className="w-full p-inputtext-sm" />
                </label>

                <label className="grid gap-1.5">
                  <span className="text-sm font-medium text-slate-700">{t('common.code', 'Kod')}</span>
                  <InputText value={code} onChange={(e) => setCode(e.target.value)} className="w-full p-inputtext-sm" />
                </label>

                <label className="grid gap-1.5">
                  <span className="text-sm font-medium text-slate-700">{t('asset.type', 'Tip')}</span>
                  <div className="flex items-center gap-2">
                    <Dropdown value={assetTypeId} onChange={(e) => setAssetTypeId(e.value)} options={assetTypeOptions} className="w-full p-inputtext-sm" />
                    <Button
                      icon="pi pi-plus"
                      size="small"
                      text
                      rounded
                      type="button"
                      className="h-[1.95rem] w-[1.95rem] p-0 text-slate-500 hover:text-slate-700"
                      onClick={() => setAssetTypeDialogOpen(true)}
                      aria-label={t('asset_types.new', 'Yeni Tip')}
                    />
                  </div>
                </label>
              </div>
            </div>

            {assetTypeId ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="grid gap-1.5">
                  <span className="text-sm font-medium text-slate-700">{t('asset.attr.brand', 'Marka')}</span>
                  <InputText
                    value={brandValue}
                    onChange={(e) =>
                      setAttributes((prev) =>
                        upsertAttributeValue(prev, {
                          canonicalKey: 'marka',
                          aliases: DEFAULT_ATTRIBUTE_ALIASES.brand,
                          value: e.target.value,
                          schemaRows
                        })
                      )
                    }
                    className="w-full p-inputtext-sm"
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-sm font-medium text-slate-700">{t('asset.attr.model', 'Model')}</span>
                  <InputText
                    value={modelValue}
                    onChange={(e) =>
                      setAttributes((prev) =>
                        upsertAttributeValue(prev, {
                          canonicalKey: 'model',
                          aliases: DEFAULT_ATTRIBUTE_ALIASES.model,
                          value: e.target.value,
                          schemaRows
                        })
                      )
                    }
                    className="w-full p-inputtext-sm"
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-sm font-medium text-slate-700">{t('asset.attr.serial', 'Seri No')}</span>
                  <InputText
                    value={serialValue}
                    onChange={(e) =>
                      setAttributes((prev) =>
                        upsertAttributeValue(prev, {
                          canonicalKey: 'seri_no',
                          aliases: DEFAULT_ATTRIBUTE_ALIASES.serial,
                          value: e.target.value,
                          schemaRows
                        })
                      )
                    }
                    className="w-full p-inputtext-sm"
                  />
                </label>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium text-slate-700">{t('asset.location', 'Lokasyon')}</span>
                  {locationLockedByParent ? (
                    <Button
                      icon="pi pi-info-circle"
                      size="small"
                      text
                      rounded
                      type="button"
                      aria-label={t('asset.location_locked_by_parent', 'Üst makine seçiliyse lokasyon üst makineyle aynı olur.')}
                      tooltip={t('asset.location_locked_by_parent', 'Üst makine seçiliyse lokasyon üst makineyle aynı olur.')}
                      tooltipOptions={{ position: 'top' }}
                    />
                  ) : null}
                </div>
                <Dropdown
                  value={locationId}
                  onChange={(e) => setLocationId(e.value)}
                  options={locationOptions}
                  className="w-full p-inputtext-sm"
                  disabled={locationLockedByParent}
                  placeholder={t('common.select', 'Sec')}
                />
              </label>
              <label className="grid gap-1.5">
                <div className="flex items-center">
                  <span className="text-sm font-medium text-slate-700">{t('asset.parent', 'Ust Makine')}</span>
                </div>
                <Dropdown value={parentAssetId} onChange={(e) => setParentAssetId(e.value)} options={parentOptions} className="w-full p-inputtext-sm" showClear />
              </label>
            </div>

            {schemaMode || mode === 'edit' ? (
              <label className="grid gap-1.5">
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
                      {visibleAttributes.map((row, idx) => (
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
                  ) : mode === 'edit' ? (
                    <>
                      {visibleAttributes.map((row, idx) => (
                        <div key={`${row.key}-${idx}`} className="grid items-center gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(10rem,12rem)_2.5rem]">
                          <InputText
                            value={row.key}
                            onChange={(e) => setAttributes((prev) => prev.map((p, i) => (i === idx ? { ...p, key: e.target.value } : p)))}
                            placeholder={t('asset.attributes_key', 'Anahtar')}
                            className="w-full p-inputtext-sm"
                          />
                          <InputText
                            value={row.value}
                            onChange={(e) => setAttributes((prev) => prev.map((p, i) => (i === idx ? { ...p, value: e.target.value } : p)))}
                            placeholder={t('asset.attributes_value', 'Deger')}
                            className="w-full p-inputtext-sm"
                          />
                          <Dropdown
                            value={row.unitId}
                            onChange={(e) => setAttributes((prev) => prev.map((p, i) => (i === idx ? { ...p, unitId: e.value ?? null } : p)))}
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
            ) : null}

            <label className="flex items-center gap-2">
              <Checkbox checked={active} onChange={(e) => setActive(Boolean(e.checked))} />
              <span className="text-sm text-slate-700">{t('common.active', 'Aktif')}</span>
            </label>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button label={t('common.cancel', 'Vazgec')} size="small" text onClick={onHide} />
              <Button label={t('common.save', 'Kaydet')} size="small" onClick={() => void submit()} loading={mutating} disabled={!name.trim()} />
            </div>
          </div>
        )}
      </AppDialog>

      <AppDialog
        id="asset-edit-image-preview"
        header={t('asset.image', 'Resim')}
        visible={imagePreviewOpen}
        onHide={() => setImagePreviewOpen(false)}
        className="w-full max-w-3xl"
      >
        {imageUrl ? (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
            <img src={imageUrl} alt={name.trim() || t('asset.image', 'Resim')} className="max-h-[75vh] w-full object-contain" />
          </div>
        ) : (
          <Message severity="info" text={t('asset.image_missing', 'Gosterilecek resim yok.')} className="w-full" />
        )}
      </AppDialog>

      <AssetTypeAddEditDialog
        organizationId={organizationId}
        visible={assetTypeDialogOpen}
        onHide={() => setAssetTypeDialogOpen(false)}
        editing={null}
        onSaved={(saved) => void refreshAssetTypes((saved as { id?: number }).id)}
      />
    </>
  );
}
