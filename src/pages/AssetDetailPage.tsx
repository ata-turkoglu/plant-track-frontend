import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { confirmDialog } from 'primereact/confirmdialog';
import { DataTable } from 'primereact/datatable';
import { Message } from 'primereact/message';

import { api } from '../services/api';
import { useI18n } from '../hooks/useI18n';
import { enqueueToast } from '../store/uiSlice';
import { fetchOrganizationSetup } from '../store/setupSlice';
import type { AppDispatch, RootState } from '../store';
import AssetEditDialog from '../components/assets/AssetEditDialog';
import AssetBomLineDialog from './AssetBomLineDialog';
import AssetImagePreviewDialog from './AssetImagePreviewDialog';
import AssetMoveDialog from './AssetMoveDialog';
import AssetStateDialog from './AssetStateDialog';

type FieldDataType = 'text' | 'number' | 'boolean' | 'date';

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

type AssetTypeFieldRow = {
  id: number;
  name: string;
  label: string;
  data_type: FieldDataType;
  required: boolean;
  unit_id: number | null;
  sort_order: number;
  active: boolean;
};

type AssetTypeRow = {
  id: number;
  fields: AssetTypeFieldRow[];
};

type ItemGroupRow = {
  id: number;
  organization_id: number;
  warehouse_type_id: number;
  amount_unit_id: number;
  code: string;
  name: string;
  size_spec: string | null;
  size_unit_id: number | null;
  active: boolean;
};

type BomLineRow = {
  id: number;
  item_group_id: number;
  quantity: string | number;
  note: string | null;
  item_group_code: string;
  item_group_name: string;
  item_group_size_spec: string | null;
  item_group_size_unit_code: string | null;
  item_group_size_unit_name: string | null;
  item_group_size_unit_symbol: string | null;
  unit_code: string;
  unit_name: string;
  unit_symbol: string | null;
};

type AssetEventRow = {
  id: number;
  event_type: 'MOVE' | 'STATE';
  occurred_at: string;
  from_location_id: number | null;
  to_location_id: number | null;
  from_state: string | null;
  to_state: string | null;
  note: string | null;
};

type AttributeDisplayRow = {
  key: string;
  label: string;
  value: string;
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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value == null) return false;
  if (typeof value !== 'object') return false;
  if (Array.isArray(value)) return false;
  return true;
}

function normalizeFieldDataType(value: unknown): FieldDataType {
  if (value === 'text' || value === 'number' || value === 'boolean' || value === 'date') return value;
  return 'text';
}

function normalizeAssetTypeFields(fields: unknown): AssetTypeFieldRow[] {
  if (!Array.isArray(fields)) return [];

  return fields
    .map((row): AssetTypeFieldRow | null => {
      if (!isPlainObject(row)) return null;
      const id = Number(row.id);
      const sortOrder = Number(row.sort_order);
      return {
        id: Number.isFinite(id) ? id : 0,
        name: String(row.name ?? '').trim(),
        label: String(row.label ?? row.name ?? '').trim(),
        data_type: normalizeFieldDataType(row.data_type),
        required: Boolean(row.required),
        unit_id: Number.isFinite(Number(row.unit_id)) ? Number(row.unit_id) : null,
        sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
        active: row.active === false ? false : true
      };
    })
    .filter((row): row is AssetTypeFieldRow => Boolean(row && row.name))
    .sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return a.id - b.id;
    });
}

function attributeValueToText(value: unknown): string {
  if (value == null) return '-';
  if (typeof value === 'string') return value.trim() || '-';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function attributeRowsFromJson(attributes: unknown | null, fields: AssetTypeFieldRow[]): AttributeDisplayRow[] {
  if (!isPlainObject(attributes)) return [];

  const sourceEntries = Object.entries(attributes);
  const byLowerKey = new Map(sourceEntries.map(([key, value]) => [key.toLowerCase(), { key, value }]));
  const consumed = new Set<string>();

  const rows: AttributeDisplayRow[] = [];

  if (fields.length > 0) {
    for (const field of fields) {
      if (field.active === false) continue;
      const fieldKey = (field.name ?? '').trim();
      if (!fieldKey) continue;

      const found = byLowerKey.get(fieldKey.toLowerCase());
      if (found) consumed.add(found.key);

      const rawValue = found ? found.value : null;
      const valueText =
        isPlainObject(rawValue) && ('value' in rawValue || 'unit_id' in rawValue || 'unitId' in rawValue)
          ? attributeValueToText(rawValue.value)
          : attributeValueToText(rawValue);

      rows.push({
        key: fieldKey,
        label: (field.label ?? fieldKey).trim() || fieldKey,
        value: valueText
      });
    }
  }

  for (const [key, rawValue] of sourceEntries) {
    if (consumed.has(key)) continue;
    const valueText =
      isPlainObject(rawValue) && ('value' in rawValue || 'unit_id' in rawValue || 'unitId' in rawValue)
        ? attributeValueToText(rawValue.value)
        : attributeValueToText(rawValue);

    rows.push({ key, label: key, value: valueText });
  }

  return rows;
}

function normalizeAttributeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function attributePriority(row: AttributeDisplayRow): number {
  const key = normalizeAttributeToken(row.key);
  const label = normalizeAttributeToken(row.label);

  if (key === 'marka' || key === 'brand' || label === 'marka' || label === 'brand') return 0;
  if (key === 'model' || label === 'model') return 1;
  if (key === 'serino' || key === 'serialno' || label === 'serino' || label === 'serialno') return 2;
  return 10;
}

function statePillClass(state: string): string {
  if (state === 'RUNNING') return 'border-emerald-200 bg-emerald-100 text-emerald-800';
  if (state === 'MAINTENANCE') return 'border-amber-200 bg-amber-100 text-amber-800';
  if (state === 'DOWN') return 'border-rose-200 bg-rose-100 text-rose-800';
  return 'border-slate-200 bg-slate-100 text-slate-800';
}

function formatQuantity(value: string | number | null | undefined): string {
  if (value == null) return '-';
  const asNumber = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(asNumber)) return String(value);
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 3 }).format(asNumber);
}

export default function AssetDetailPage() {
  const { t, tUnit, tUnitSymbol } = useI18n();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { assetId: assetIdParam } = useParams<{ assetId: string }>();

  const organizationId = useSelector((s: RootState) => s.user.organizationId);
  const { locations } = useSelector((s: RootState) => s.setup);

  const [asset, setAsset] = useState<AssetRow | null>(null);
  const [parentAsset, setParentAsset] = useState<AssetRow | null>(null);
  const [childAssets, setChildAssets] = useState<AssetRow[]>([]);
  const [assetTypeFields, setAssetTypeFields] = useState<AssetTypeFieldRow[]>([]);
  const [bomLines, setBomLines] = useState<BomLineRow[]>([]);
  const [events, setEvents] = useState<AssetEventRow[]>([]);
  const [itemGroups, setItemGroups] = useState<ItemGroupRow[]>([]);

  const [loading, setLoading] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(false);

  const [eventsLoaded, setEventsLoaded] = useState(false);
  const [eventsVisible, setEventsVisible] = useState(false);

  const [moveToLocationId, setMoveToLocationId] = useState<number | null>(null);
  const [newState, setNewState] = useState<'STOPPED' | 'RUNNING' | 'MAINTENANCE' | 'DOWN'>('STOPPED');

  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [stateDialogOpen, setStateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const [bomDialogOpen, setBomDialogOpen] = useState(false);
  const [bomItemGroupId, setBomItemGroupId] = useState<number | null>(null);
  const [bomQuantity, setBomQuantity] = useState<number>(1);
  const [bomNote, setBomNote] = useState('');

  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [imageActionsOpen, setImageActionsOpen] = useState(false);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);

  const assetId = useMemo(() => {
    const parsed = Number(assetIdParam);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return parsed;
  }, [assetIdParam]);

  const locationOptions = useMemo(() => locations.map((l) => ({ label: l.name, value: l.id })), [locations]);

  const locationNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const l of locations) map.set(l.id, l.name);
    return map;
  }, [locations]);

  const attributeRows = useMemo(() => {
    const rows = attributeRowsFromJson(asset?.attributes_json ?? null, assetTypeFields);
    return rows
      .map((row, index) => ({ row, index, priority: attributePriority(row) }))
      .sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return a.index - b.index;
      })
      .map((entry) => entry.row);
  }, [asset?.attributes_json, assetTypeFields]);

  useEffect(() => {
    setImageActionsOpen(false);
    setImagePreviewOpen(false);
  }, [asset?.id, asset?.image_url]);

  useEffect(() => {
    if (!organizationId) return;
    if (locations.length === 0) dispatch(fetchOrganizationSetup({ organizationId }));
  }, [dispatch, organizationId, locations.length]);

  const loadCore = async (targetAssetId: number) => {
    if (!organizationId) return;

    const [assetRes, bomRes, assetTypesRes] = await Promise.all([
      api.get(`/api/organizations/${organizationId}/assets/${targetAssetId}`),
      api.get(`/api/organizations/${organizationId}/assets/${targetAssetId}/bom`),
      api.get(`/api/organizations/${organizationId}/asset-types`)
    ]);

    const resolvedAsset = assetRes.data.asset as AssetRow;
    const assetTypes = (assetTypesRes.data.assetTypes ?? []) as AssetTypeRow[];
    const selectedType = assetTypes.find((row) => row.id === resolvedAsset.asset_type_id) ?? null;

    try {
      const [parentRes, childrenRes] = await Promise.all([
        resolvedAsset.parent_asset_id
          ? api.get(`/api/organizations/${organizationId}/assets/${resolvedAsset.parent_asset_id}`)
          : Promise.resolve(null),
        api.get(`/api/organizations/${organizationId}/assets`, { params: { parentAssetId: resolvedAsset.id } })
      ]);

      setParentAsset((parentRes as { data: { asset: AssetRow } } | null)?.data.asset ?? null);
      setChildAssets(((childrenRes as { data: { assets?: AssetRow[] } }).data.assets ?? []) as AssetRow[]);
    } catch {
      setParentAsset(null);
      setChildAssets([]);
    }

    setAsset(resolvedAsset);
    setAssetTypeFields(normalizeAssetTypeFields(selectedType?.fields ?? []));
    setBomLines((bomRes.data.lines ?? []) as BomLineRow[]);
    setMoveToLocationId(resolvedAsset.location_id ?? null);
    setNewState((resolvedAsset.current_state as typeof newState) ?? 'STOPPED');
  };

  const loadEvents = async (targetAssetId: number, { silent = false }: { silent?: boolean } = {}) => {
    if (!organizationId) return;
    setEventsLoading(true);
    try {
      const eventsRes = await api.get(`/api/organizations/${organizationId}/assets/${targetAssetId}/events?limit=200`);
      setEvents((eventsRes.data.events ?? []) as AssetEventRow[]);
      setEventsLoaded(true);
    } catch {
      if (!silent) {
        dispatch(
          enqueueToast({
            severity: 'error',
            summary: t('common.error', 'Hata'),
            detail: t('asset.events_load_failed', 'Hareket gecmisi yuklenemedi.')
          })
        );
      }
    } finally {
      setEventsLoading(false);
    }
  };

  useEffect(() => {
    if (!organizationId || assetId == null) return;

    setLoading(true);
    setEvents([]);
    setEventsLoaded(false);
    setEventsVisible(false);
    setParentAsset(null);
    setChildAssets([]);

    Promise.all([
      loadCore(assetId),
      api.get(`/api/organizations/${organizationId}/item-groups`, {
        params: { active: true, warehouseTypeCode: 'SPARE_PART' }
      })
    ])
      .then(([, groupsRes]) => {
        setItemGroups(((groupsRes.data.item_groups ?? groupsRes.data.itemGroups) ?? []) as ItemGroupRow[]);
      })
      .catch(() => {
        dispatch(
          enqueueToast({
            severity: 'error',
            summary: t('common.error', 'Hata'),
            detail: t('asset.details_failed', 'Detaylar yüklenemedi.')
          })
        );
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, assetId]);

  const updateAssetImage = async (nextImageUrl: string | null) => {
    if (!organizationId || !asset?.id) return;
    setMutating(true);
    try {
      await api.put(`/api/organizations/${organizationId}/assets/${asset.id}`, {
        parent_asset_id: asset.parent_asset_id,
        asset_type_id: asset.asset_type_id,
        code: asset.code,
        name: asset.name,
        image_url: nextImageUrl,
        active: asset.active,
        attributes_json: asset.attributes_json
      });
      dispatch(
        enqueueToast({
          severity: 'success',
          summary: t('common.success', 'Başarılı'),
          detail: nextImageUrl ? t('asset.image_updated', 'Resim guncellendi.') : t('asset.image_removed', 'Resim kaldirildi.')
        })
      );
      await loadCore(asset.id);
    } catch {
      dispatch(
        enqueueToast({
          severity: 'error',
          summary: t('common.error', 'Hata'),
          detail: t('asset.image_update_failed', 'Resim guncellenemedi.')
        })
      );
    } finally {
      setMutating(false);
    }
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
      setImageActionsOpen(false);
      await updateAssetImage(dataUrl);
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

  const moveAsset = async () => {
    if (!organizationId || !asset?.id || !moveToLocationId) return;
    setMutating(true);
    try {
      await api.post(`/api/organizations/${organizationId}/assets/${asset.id}/move`, {
        to_location_id: moveToLocationId,
        note: null
      });
      dispatch(
        enqueueToast({
          severity: 'success',
          summary: t('common.success', 'Başarılı'),
          detail: t('asset.moved', 'Makine tasindi.')
        })
      );
      setMoveDialogOpen(false);
      await loadCore(asset.id);
      if (eventsLoaded) await loadEvents(asset.id, { silent: true });
    } catch {
      dispatch(
        enqueueToast({
          severity: 'error',
          summary: t('common.error', 'Hata'),
          detail: t('asset.move_failed', 'Taşıma başarısız.')
        })
      );
    } finally {
      setMutating(false);
    }
  };

  const changeState = async () => {
    if (!organizationId || !asset?.id) return;
    setMutating(true);
    try {
      await api.post(`/api/organizations/${organizationId}/assets/${asset.id}/state`, {
        to_state: newState,
        note: null
      });
      dispatch(
        enqueueToast({
          severity: 'success',
          summary: t('common.success', 'Başarılı'),
          detail: t('asset.state_updated', 'Durum güncellendi.')
        })
      );
      setStateDialogOpen(false);
      await loadCore(asset.id);
      if (eventsLoaded) await loadEvents(asset.id, { silent: true });
    } catch {
      dispatch(
        enqueueToast({
          severity: 'error',
          summary: t('common.error', 'Hata'),
          detail: t('asset.state_failed', 'Durum güncelleme başarısız.')
        })
      );
    } finally {
      setMutating(false);
    }
  };

  const toggleEventsVisibility = async () => {
    if (!asset?.id) return;

    if (!eventsVisible) {
      setEventsVisible(true);
      if (!eventsLoaded) {
        await loadEvents(asset.id);
      }
      return;
    }

    setEventsVisible(false);
  };

  const openAddBom = () => {
    setBomItemGroupId(null);
    setBomQuantity(1);
    setBomNote('');
    setBomDialogOpen(true);
  };

  const addBomLine = async () => {
    if (!organizationId || !asset?.id || !bomItemGroupId) return;
    setMutating(true);
    try {
      await api.post(`/api/organizations/${organizationId}/assets/${asset.id}/bom`, {
        item_group_id: bomItemGroupId,
        quantity: bomQuantity,
        note: bomNote.trim() || null
      });
      dispatch(
        enqueueToast({
          severity: 'success',
          summary: t('common.success', 'Başarılı'),
          detail: t('asset.bom_added', 'BOM satırı eklendi.')
        })
      );
      setBomDialogOpen(false);
      await loadCore(asset.id);
    } catch {
      dispatch(
        enqueueToast({
          severity: 'error',
          summary: t('common.error', 'Hata'),
          detail: t('asset.bom_add_failed', 'BOM ekleme başarısız.')
        })
      );
    } finally {
      setMutating(false);
    }
  };

  const deleteBomLine = (line: BomLineRow) => {
    if (!organizationId || !asset?.id) return;
    confirmDialog({
      message: t('asset.bom_confirm_delete', `${line.item_group_name} satırını silmek istiyor musun?`),
      header: t('inventory.confirm.title', 'Silme Onayi'),
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger p-button-sm',
      acceptLabel: t('common.delete', 'Sil'),
      rejectLabel: t('common.cancel', 'Vazgec'),
      accept: async () => {
        setMutating(true);
        try {
          await api.delete(`/api/organizations/${organizationId}/assets/${asset.id}/bom/${line.id}`);
          dispatch(
            enqueueToast({
              severity: 'success',
              summary: t('common.success', 'Başarılı'),
              detail: t('asset.bom_deleted', 'BOM satırı silindi.')
            })
          );
          await loadCore(asset.id);
        } catch {
          dispatch(
            enqueueToast({
              severity: 'error',
              summary: t('common.error', 'Hata'),
              detail: t('asset.bom_delete_failed', 'BOM silme başarısız.')
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

  if (assetId == null) {
    return <Message severity="warn" text={t('asset.details_empty', 'Makine secilmedi.')} className="w-full" />;
  }

  return (
    <div className="grid gap-4">

      {loading && !asset ? (
        <Message severity="info" text={t('common.loading', 'Yukleniyor...')} className="w-full" />
	      ) : asset ? (
	        <div className="grid gap-4 xl:grid-cols-[24rem_minmax(0,1fr)]">
	          <div className="grid gap-4 self-start xl:sticky xl:top-4">
	            <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
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
                className="group relative aspect-[4/3] cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-slate-100 outline-none ring-offset-2 transition hover:border-sky-300 focus-visible:ring-2 focus-visible:ring-sky-300"
                aria-label={t('asset.image_actions', 'Resim islemleri')}
              >
                {asset.image_url ? (
                  <img src={asset.image_url} alt={asset.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-slate-400">
                    <i className="pi pi-image text-4xl" aria-hidden />
                  </div>
                )}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/25 via-transparent to-transparent" />
                <div
                  className={`pointer-events-none absolute inset-x-2 bottom-2 flex justify-end transition-all duration-200 ${
                    imageActionsOpen ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
                  }`}
                >
                  <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-slate-200 bg-white/95 p-1 shadow-sm backdrop-blur">
                    <Button
                      icon={asset.image_url ? 'pi pi-pencil' : 'pi pi-plus'}
                      size="small"
                      text
                      rounded
                      type="button"
                      className="h-7 w-7"
                      loading={mutating}
                      aria-label={asset.image_url ? t('asset.image_change', 'Resim Degistir') : t('asset.image_add', 'Resim Ekle')}
                      onClick={(event) => {
                        event.stopPropagation();
                        pickAssetImage();
                      }}
                    />
                    {asset.image_url ? (
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
                          loading={mutating}
                          aria-label={t('asset.image_remove', 'Resmi Kaldir')}
                          onClick={(event) => {
                            event.stopPropagation();
                            void updateAssetImage(null);
                            setImageActionsOpen(false);
                          }}
                        />
                      </>
                    ) : null}
	                  </div>
	                </div>
	              </div>
	            </div>

	            <div className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
	              {attributeRows.length > 0 ? (
	                <div className="grid gap-2">
	                  {attributeRows.map((row) => (
	                    <div key={row.key} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <div className="text-xs text-slate-500">{row.label}</div>
                      <div className="text-sm font-medium text-slate-800">{row.value}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-sm text-slate-500">{t('asset.attributes_empty', 'Ozellik yok.')}</span>
              )}
            </div>
		          </div>
	
		          <div className="grid gap-4">
	            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
		              <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-[14rem]">
                      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        {t('asset.machine', 'Makine')}
                      </div>
                      <div className="pt-1 text-2xl font-semibold text-slate-900">{asset.name}</div>
                      <div className="pt-1 text-sm text-slate-600">
                        {t('common.code', 'Kod')}: <span className="font-medium text-slate-800">{asset.code ?? '-'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        icon="pi pi-pencil"
                        size="small"
                        outlined
                        type="button"
                        disabled={mutating}
                        label={t('inventory.action.edit', 'Duzenle')}
                        aria-label={t('inventory.action.edit', 'Duzenle')}
                        onClick={() => {
                          setEditDialogOpen(true);
                        }}
                      />
                      <Button
                        icon="pi pi-map-marker"
                        size="small"
                        outlined
                        type="button"
                        disabled={mutating}
                        label={t('asset.move', 'Tasi')}
                        aria-label={t('asset.move', 'Tasi')}
                        onClick={() => {
                          setMoveToLocationId(asset.location_id ?? null);
                          setMoveDialogOpen(true);
                        }}
                      />
                      <Button
                        icon="pi pi-power-off"
                        size="small"
                        outlined
                        type="button"
                        disabled={mutating}
                        label={t('asset.state', 'Durum')}
                        aria-label={t('asset.state', 'Durum')}
                        onClick={() => {
                          setNewState((asset.current_state as typeof newState) ?? 'STOPPED');
                          setStateDialogOpen(true);
                        }}
                      />
                    </div>
		              </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="text-xs font-medium text-slate-500">{t('asset.location', 'Lokasyon')}</div>
                      <div className="pt-1 text-sm font-semibold text-slate-900">
                        {asset.location_id ? locationNameById.get(asset.location_id) ?? '-' : '-'}
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="text-xs font-medium text-slate-500">{t('asset.state', 'Durum')}</div>
                      <div className="pt-2">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statePillClass(asset.current_state)}`}
                        >
                          {asset.current_state}
                        </span>
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="text-xs font-medium text-slate-500">{t('common.active', 'Aktif')}</div>
                      <div className="pt-1 text-sm font-semibold text-slate-900">
                        {asset.active ? t('common.yes', 'Evet') : t('common.no', 'Hayir')}
                      </div>
                      <div className="pt-1 text-xs text-slate-600">{new Date(asset.updated_at).toLocaleString()}</div>
                    </div>
                  </div>

                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="text-xs font-medium text-slate-500">{t('asset.parent', 'Ust Makine')}</div>
                      <div className="pt-1 text-sm font-semibold text-slate-900">
                        {parentAsset ? (
                          <button
                            type="button"
                            className="text-left text-sky-700 hover:underline"
                            onClick={() => navigate(`/assets/${parentAsset.id}`)}
                          >
                            {parentAsset.name}
                          </button>
                        ) : (
                          <span className="text-slate-700">-</span>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-medium text-slate-500">{t('asset.children', 'Alt Makineler')}</div>
                        <div className="text-xs font-semibold text-slate-500">{childAssets.length}</div>
                      </div>
                      {childAssets.length > 0 ? (
                        <div className="mt-2 grid gap-1">
                          {childAssets.map((row) => (
                            <button
                              key={row.id}
                              type="button"
                              className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-left text-sm hover:bg-slate-50"
                              onClick={() => navigate(`/assets/${row.id}`)}
                            >
                              <span className="font-semibold text-slate-900">{row.name}</span>
                              <span className="text-xs font-medium text-slate-500">{row.code ?? '-'}</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="pt-1 text-sm font-semibold text-slate-900">{t('asset.children_empty', 'Alt makine yok.')}</div>
                      )}
                    </div>
                  </div>
	            </div>
	
            <div className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-800">{t('asset.bom', 'Yedek Parca / BOM')}</span>
                <Button label={t('asset.bom_add', 'Satir Ekle')} icon="pi pi-plus" size="small" onClick={openAddBom} />
              </div>
	                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white py-2">
	                <DataTable value={bomLines} size="small" dataKey="id" emptyMessage={t('asset.bom_empty', 'BOM satiri yok.')}> 
	                  <Column field="item_group_name" header={t('common.name', 'Isim')} />
	                  <Column field="item_group_code" header={t('common.code', 'Kod')} style={{ width: '10rem' }} />
	                  <Column
	                    header={t('materials.spec', 'Spec')}
	                    style={{ width: '12rem' }}
	                    body={(row: BomLineRow) => {
	                      const spec = row.item_group_size_spec?.trim();
	                      if (!spec) return <span>-</span>;
	                      const rawUnit = row.item_group_size_unit_symbol ?? row.item_group_size_unit_code ?? '';
	                      const unitLabel = rawUnit ? (tUnitSymbol(rawUnit, rawUnit) || rawUnit).trim() : '';
	                      const suffix = unitLabel ? ` ${unitLabel}` : '';
	                      return <span>{`${spec}${suffix}`}</span>;
	                    }}
	                  />
	                  <Column
	                    header={t('asset.bom_used_quantity', 'Makinede Kullanilan')}
	                    style={{ width: '10rem' }}
	                    body={(row: BomLineRow) => (
                      <span>
                        {formatQuantity(row.quantity)} {tUnit(row.unit_code, row.unit_name)}
	                      </span>
	                    )}
	                  />
	                  <Column field="note" header={t('common.note', 'Not')} />
	                  <Column
	                    header=""
	                    style={{ width: '6rem' }}
	                    body={(row: BomLineRow) => (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          icon="pi pi-trash"
                          size="small"
                          text
                          rounded
                          severity="danger"
                          onClick={() => deleteBomLine(row)}
                          aria-label={t('common.delete', 'Sil')}
                        />
                      </div>
                    )}
                  />
                </DataTable>
              </div>
            </div>

            <div className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-800">{t('asset.events', 'Hareket Gecmisi')}</span>
                <Button
                  size="small"
                  outlined
                  icon={eventsVisible ? 'pi pi-eye-slash' : 'pi pi-clock'}
                  label={
                    eventsVisible
                      ? t('asset.events_hide', 'Gizle')
                      : eventsLoaded
                        ? t('asset.events_show', 'Goster')
                        : t('asset.events_load', 'Yukle')
                  }
                  onClick={() => void toggleEventsVisibility()}
                  loading={eventsLoading && !eventsLoaded}
                />
              </div>

              {eventsVisible ? (
                eventsLoading ? (
                  <Message severity="info" text={t('common.loading', 'Yukleniyor...')} className="w-full" />
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white py-2">
                    <DataTable value={events} size="small" dataKey="id" emptyMessage={t('asset.events_empty', 'Event yok.')}> 
                      <Column field="event_type" header={t('asset.events.type', 'Tip')} style={{ width: '7rem' }} />
                      <Column
                        header={t('asset.events.time', 'Zaman')}
                        style={{ width: '14rem' }}
                        body={(row: AssetEventRow) => <span>{new Date(row.occurred_at).toLocaleString()}</span>}
                      />
                      <Column
                        header={t('asset.events.detail', 'Detay')}
                        body={(row: AssetEventRow) => {
                          if (row.event_type === 'MOVE') {
                            const fromName = row.from_location_id ? locationNameById.get(row.from_location_id) ?? '-' : '-';
                            const toName = row.to_location_id ? locationNameById.get(row.to_location_id) ?? '-' : '-';
                            return (
                              <span>
                                {fromName} {'->'} {toName}
                              </span>
                            );
                          }
                          const from = row.from_state ?? '-';
                          const to = row.to_state ?? '-';
                          return (
                            <span>
                              {from} {'->'} {to}
                            </span>
                          );
                        }}
                      />
                      <Column field="note" header={t('common.note', 'Not')} />
                    </DataTable>
                  </div>
                )
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <Message severity="warn" text={t('asset.details_empty', 'Makine secilmedi.')} className="w-full" />
      )}

      <AssetImagePreviewDialog
        t={t}
        visible={imagePreviewOpen}
        onHide={() => setImagePreviewOpen(false)}
        name={asset?.name ?? ''}
        imageUrl={asset?.image_url ?? null}
      />

      {organizationId ? (
        <AssetEditDialog
          organizationId={organizationId}
          mode="edit"
          asset={asset}
          visible={editDialogOpen}
          onHide={() => setEditDialogOpen(false)}
          onSaved={(assetId) => void loadCore(assetId)}
        />
      ) : null}

      <AssetMoveDialog
        t={t}
        visible={moveDialogOpen}
        onHide={() => setMoveDialogOpen(false)}
        mutating={mutating}
        locationOptions={locationOptions}
        moveToLocationId={moveToLocationId}
        setMoveToLocationId={setMoveToLocationId}
        onMove={() => void moveAsset()}
      />

      <AssetStateDialog
        t={t}
        visible={stateDialogOpen}
        onHide={() => setStateDialogOpen(false)}
        mutating={mutating}
        newState={newState}
        setNewState={setNewState}
        onSave={() => void changeState()}
      />

      <AssetBomLineDialog
        t={t}
        visible={bomDialogOpen}
        onHide={() => setBomDialogOpen(false)}
        mutating={mutating}
        itemGroups={itemGroups}
        bomItemGroupId={bomItemGroupId}
        setBomItemGroupId={setBomItemGroupId}
        bomQuantity={bomQuantity}
        setBomQuantity={setBomQuantity}
        bomNote={bomNote}
        setBomNote={setBomNote}
        onSave={() => void addBomLine()}
      />
    </div>
  );
}
