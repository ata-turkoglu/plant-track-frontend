import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Column } from 'primereact/column';
import { confirmDialog } from 'primereact/confirmdialog';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';

import { api } from '../services/api';
import { useI18n } from '../hooks/useI18n';
import { enqueueToast } from '../store/uiSlice';
import { fetchOrganizationSetup } from '../store/setupSlice';
import type { ItemRow } from '../store/materialsSlice';
import type { AppDispatch, RootState } from '../store';

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

type BomLineRow = {
  id: number;
  item_id: number;
  quantity: string | number;
  preferred: boolean;
  note: string | null;
  item_code: string;
  item_name: string;
  item_brand: string | null;
  item_model: string | null;
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

function formatRuntime(secondsRaw: number | string): string {
  const seconds = typeof secondsRaw === 'string' ? Number(secondsRaw) : secondsRaw;
  if (!Number.isFinite(seconds) || seconds <= 0) return '0h';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h <= 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export default function AssetDetailPage() {
  const { t } = useI18n();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { assetId: assetIdParam } = useParams<{ assetId: string }>();

  const organizationId = useSelector((s: RootState) => s.user.organizationId);
  const { locations } = useSelector((s: RootState) => s.setup);

  const [asset, setAsset] = useState<AssetRow | null>(null);
  const [bomLines, setBomLines] = useState<BomLineRow[]>([]);
  const [events, setEvents] = useState<AssetEventRow[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);

  const [loading, setLoading] = useState(false);
  const [mutating, setMutating] = useState(false);

  const [moveToLocationId, setMoveToLocationId] = useState<number | null>(null);
  const [newState, setNewState] = useState<'STOPPED' | 'RUNNING' | 'MAINTENANCE' | 'DOWN'>('STOPPED');

  const [bomDialogOpen, setBomDialogOpen] = useState(false);
  const [bomItemId, setBomItemId] = useState<number | null>(null);
  const [bomQuantity, setBomQuantity] = useState<number>(1);
  const [bomPreferred, setBomPreferred] = useState(true);
  const [bomNote, setBomNote] = useState('');

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

  useEffect(() => {
    if (!organizationId) return;
    if (locations.length === 0) dispatch(fetchOrganizationSetup({ organizationId }));
  }, [dispatch, organizationId, locations.length]);

  const loadDetails = async (targetAssetId: number) => {
    if (!organizationId) return;

    const [assetRes, bomRes, eventsRes] = await Promise.all([
      api.get(`/api/organizations/${organizationId}/assets/${targetAssetId}`),
      api.get(`/api/organizations/${organizationId}/assets/${targetAssetId}/bom`),
      api.get(`/api/organizations/${organizationId}/assets/${targetAssetId}/events?limit=200`)
    ]);

    const resolvedAsset = assetRes.data.asset as AssetRow;
    setAsset(resolvedAsset);
    setBomLines((bomRes.data.lines ?? []) as BomLineRow[]);
    setEvents((eventsRes.data.events ?? []) as AssetEventRow[]);
    setMoveToLocationId(resolvedAsset.location_id ?? null);
    setNewState((resolvedAsset.current_state as typeof newState) ?? 'STOPPED');
  };

  useEffect(() => {
    if (!organizationId || assetId == null) return;

    setLoading(true);
    Promise.all([loadDetails(assetId), api.get(`/api/organizations/${organizationId}/items`)])
      .then(([, itemsRes]) => {
        setItems((itemsRes.data.items ?? []) as ItemRow[]);
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
          detail: t('asset.moved', 'Varlık taşındı.')
        })
      );
      await loadDetails(asset.id);
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
      await loadDetails(asset.id);
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

  const openAddBom = () => {
    setBomItemId(null);
    setBomQuantity(1);
    setBomPreferred(true);
    setBomNote('');
    setBomDialogOpen(true);
  };

  const addBomLine = async () => {
    if (!organizationId || !asset?.id || !bomItemId) return;
    setMutating(true);
    try {
      await api.post(`/api/organizations/${organizationId}/assets/${asset.id}/bom`, {
        item_id: bomItemId,
        quantity: bomQuantity,
        preferred: bomPreferred,
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
      await loadDetails(asset.id);
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
      message: t('asset.bom_confirm_delete', `${line.item_name} satırını silmek istiyor musun?`),
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
          await loadDetails(asset.id);
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
    return <Message severity="warn" text={t('asset.details_empty', 'Varlık seçilmedi.')} className="w-full" />;
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-2">
        <Button icon="pi pi-arrow-left" label={t('common.back', 'Geri')} size="small" text onClick={() => navigate('/assets')} />
        {asset ? <span className="text-sm font-semibold text-slate-800">{asset.name}</span> : null}
      </div>

      {loading && !asset ? (
        <Message severity="info" text={t('common.loading', 'Yukleniyor...')} className="w-full" />
      ) : asset ? (
        <>
          <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-3">
            <div className="grid gap-1">
              <span className="text-xs text-slate-500">{t('asset.location', 'Lokasyon')}</span>
              <span className="text-sm font-medium">{asset.location_id ? locationNameById.get(asset.location_id) ?? '-' : '-'}</span>
            </div>
            <div className="grid gap-1">
              <span className="text-xs text-slate-500">{t('asset.col.state', 'Durum')}</span>
              <span className="text-sm font-medium">{asset.current_state}</span>
            </div>
            <div className="grid gap-1">
              <span className="text-xs text-slate-500">{t('asset.col.runtime', 'Calisma')}</span>
              <span className="text-sm font-medium">{formatRuntime(asset.runtime_seconds)}</span>
            </div>
          </div>

          <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <span className="text-sm font-medium text-slate-700">{t('asset.move', 'Tasi')}</span>
              <div className="flex flex-wrap items-center gap-2">
                <Dropdown value={moveToLocationId} onChange={(e) => setMoveToLocationId(e.value)} options={locationOptions} className="w-full p-inputtext-sm sm:w-80" />
                <Button label={t('asset.move', 'Tasi')} size="small" onClick={() => void moveAsset()} disabled={!moveToLocationId} loading={mutating} />
              </div>
            </div>
            <div className="grid gap-2">
              <span className="text-sm font-medium text-slate-700">{t('asset.state', 'Durum')}</span>
              <div className="flex flex-wrap items-center gap-2">
                <Dropdown
                  value={newState}
                  onChange={(e) => setNewState(e.value)}
                  options={[
                    { label: 'STOPPED', value: 'STOPPED' },
                    { label: 'RUNNING', value: 'RUNNING' },
                    { label: 'MAINTENANCE', value: 'MAINTENANCE' },
                    { label: 'DOWN', value: 'DOWN' }
                  ]}
                  className="w-full p-inputtext-sm sm:w-80"
                />
                <Button label={t('common.save', 'Kaydet')} size="small" onClick={() => void changeState()} loading={mutating} />
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-800">{t('asset.bom', 'Yedek Parca / BOM')}</span>
              <Button label={t('asset.bom_add', 'Satir Ekle')} icon="pi pi-plus" size="small" onClick={openAddBom} />
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white py-2">
              <DataTable value={bomLines} size="small" dataKey="id" emptyMessage={t('asset.bom_empty', 'BOM satiri yok.')}>
                <Column field="item_name" header={t('common.name', 'Isim')} />
                <Column field="item_code" header={t('common.code', 'Kod')} style={{ width: '10rem' }} />
                <Column field="item_brand" header={t('common.brand', 'Marka')} style={{ width: '10rem' }} />
                <Column field="item_model" header={t('common.model', 'Model')} style={{ width: '10rem' }} />
                <Column
                  header={t('common.quantity', 'Miktar')}
                  style={{ width: '10rem' }}
                  body={(row: BomLineRow) => (
                    <span>
                      {row.quantity} {row.unit_symbol ?? row.unit_code}
                    </span>
                  )}
                />
                <Column
                  field="preferred"
                  header={t('asset.bom_preferred', 'Tercih')}
                  style={{ width: '7rem' }}
                  body={(row: BomLineRow) => <span>{row.preferred ? t('common.yes', 'Evet') : t('common.no', 'Hayir')}</span>}
                />
                <Column
                  header=""
                  style={{ width: '6rem' }}
                  body={(row: BomLineRow) => (
                    <div className="flex items-center justify-end gap-1">
                      <Button icon="pi pi-trash" size="small" text rounded severity="danger" onClick={() => deleteBomLine(row)} aria-label={t('common.delete', 'Sil')} />
                    </div>
                  )}
                />
              </DataTable>
            </div>
          </div>

          <div className="grid gap-2">
            <span className="text-sm font-semibold text-slate-800">{t('asset.events', 'Hareket Gecmisi')}</span>
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
          </div>
        </>
      ) : (
        <Message severity="warn" text={t('asset.details_empty', 'Varlık seçilmedi.')} className="w-full" />
      )}

      <Dialog header={t('asset.bom_add', 'BOM Satiri Ekle')} visible={bomDialogOpen} onHide={() => setBomDialogOpen(false)} className="w-full max-w-lg">
        <div className="grid gap-3">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">{t('common.item', 'Item')}</span>
            <Dropdown
              value={bomItemId}
              onChange={(e) => setBomItemId(e.value)}
              options={items.map((i) => ({ label: `${i.name} (${i.code})`, value: i.id }))}
              filter
              className="w-full p-inputtext-sm"
              placeholder={t('common.select', 'Sec')}
            />
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700">{t('common.quantity', 'Miktar')}</span>
              <InputNumber value={bomQuantity} onValueChange={(e) => setBomQuantity(Number(e.value ?? 1))} className="w-full" inputClassName="p-inputtext-sm" min={0} />
            </label>
            <label className="flex items-center gap-2 pt-7">
              <Checkbox checked={bomPreferred} onChange={(e) => setBomPreferred(Boolean(e.checked))} />
              <span className="text-sm text-slate-700">{t('asset.bom_preferred', 'Tercih')}</span>
            </label>
          </div>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">{t('common.note', 'Not')}</span>
            <InputTextarea value={bomNote} onChange={(e) => setBomNote(e.target.value)} className="w-full p-inputtext-sm" rows={3} />
          </label>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button label={t('common.cancel', 'Vazgec')} size="small" text onClick={() => setBomDialogOpen(false)} />
            <Button label={t('common.save', 'Kaydet')} size="small" onClick={() => void addBomLine()} loading={mutating} disabled={!bomItemId || bomQuantity <= 0} />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
