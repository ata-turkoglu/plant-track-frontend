import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useDispatch } from 'react-redux';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';

import { api } from '../../services/api';
import { useI18n } from '../../hooks/useI18n';
import { enqueueToast } from '../../store/uiSlice';
import type { AppDispatch } from '../../store';

export type AssetTypeRow = {
  id: number;
  organization_id: number;
  code: string;
  name: string;
  active: boolean;
  fields: AssetTypeFieldRow[];
};

type FieldType = 'text' | 'number' | 'boolean' | 'date';

type AssetTypeFieldRow = {
  id: number;
  organization_id: number;
  asset_type_id: number;
  name: string;
  label: string;
  input_type: FieldType;
  required: boolean;
  unit_id: number | null;
  sort_order: number;
  active: boolean;
};

type SchemaFieldRow = {
  label: string;
  type: FieldType;
  required: boolean;
  unitId: number | null;
};

type SchemaPayloadField = {
  name: string;
  label: string;
  input_type: FieldType;
  required: boolean;
  unit_id: number | null;
  active: boolean;
};

type UnitRow = { id: number; code: string; name: string; symbol: string | null; active: boolean };

function normalizeFieldType(value: unknown): FieldType {
  if (value === 'text' || value === 'number' || value === 'boolean' || value === 'date') return value;
  return 'text';
}

function normalizeUnitId(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function slugifyFieldName(text: string): string {
  const source = text.trim();
  if (!source) return '';

  const turkishMap: Record<string, string> = {
    C: 'c',
    c: 'c',
    G: 'g',
    g: 'g',
    I: 'i',
    i: 'i',
    O: 'o',
    o: 'o',
    S: 's',
    s: 's',
    U: 'u',
    u: 'u'
  };

  const ascii = source
    .replace(/[ÇçĞğİIıÖöŞşÜü]/g, (ch) => {
      if (ch === 'Ç' || ch === 'ç') return 'c';
      if (ch === 'Ğ' || ch === 'ğ') return 'g';
      if (ch === 'İ' || ch === 'I' || ch === 'ı') return 'i';
      if (ch === 'Ö' || ch === 'ö') return 'o';
      if (ch === 'Ş' || ch === 'ş') return 's';
      if (ch === 'Ü' || ch === 'ü') return 'u';
      return turkishMap[ch] ?? ch;
    })
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');

  return ascii
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function parseSchemaRows(fields: AssetTypeFieldRow[] | null | undefined): SchemaFieldRow[] {
  if (!Array.isArray(fields)) return [];

  return [...fields]
    .sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return a.id - b.id;
    })
    .filter((row) => row.active !== false)
    .map((row) => ({
      label: (row.label ?? row.name ?? '').trim(),
      type: normalizeFieldType(row.input_type),
      required: Boolean(row.required),
      unitId: normalizeUnitId(row.unit_id)
    }))
    .filter((row) => Boolean(row.label));
}

function buildFields(rows: SchemaFieldRow[]): { ok: true; value: SchemaPayloadField[] } | { ok: false; message: 'key_required' | 'duplicate_key' } {
  const trimmed = rows
    .map((row) => ({
      label: row.label.trim(),
      type: normalizeFieldType(row.type),
      required: Boolean(row.required),
      unitId: normalizeUnitId(row.unitId)
    }))
    .filter((row) => Boolean(row.label || row.required || row.unitId != null || row.type !== 'text'));

  const seen = new Set<string>();
  for (const row of trimmed) {
    if (!row.label) return { ok: false, message: 'key_required' };
    const lower = slugifyFieldName(row.label);
    if (!lower) return { ok: false, message: 'key_required' };
    if (seen.has(lower)) return { ok: false, message: 'duplicate_key' };
    seen.add(lower);
  }

  return {
    ok: true,
    value: trimmed.map((row) => ({
      name: slugifyFieldName(row.label),
      label: row.label,
      input_type: row.type,
      required: row.required,
      unit_id: row.unitId,
      active: true
    }))
  };
}

type AssetTypeUpsertDialogProps = {
  organizationId: number;
  visible: boolean;
  onHide: () => void;
  editing?: AssetTypeRow | null;
  onSaved?: (row: AssetTypeRow) => void;
};

export default function AssetTypeUpsertDialog({ organizationId, visible, onHide, editing = null, onSaved }: AssetTypeUpsertDialogProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useI18n();

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [active, setActive] = useState(true);
  const [schemaRows, setSchemaRows] = useState<SchemaFieldRow[]>([]);
  const [units, setUnits] = useState<UnitRow[]>([]);
  const [mutating, setMutating] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (editing) {
      setCode(editing.code ?? '');
      setName(editing.name ?? '');
      setActive(Boolean(editing.active));
      setSchemaRows(parseSchemaRows(editing.fields ?? []));
      return;
    }
    setCode('');
    setName('');
    setActive(true);
    setSchemaRows([]);
  }, [editing, visible]);

  useEffect(() => {
    if (!visible || !organizationId) return;
    let mounted = true;
    void api
      .get(`/api/organizations/${organizationId}/units`)
      .then((res) => {
        if (!mounted) return;
        const rows = (res.data.units ?? []) as UnitRow[];
        setUnits(rows.filter((u) => u.active));
      })
      .catch(() => {
        if (!mounted) return;
        setUnits([]);
      });

    return () => {
      mounted = false;
    };
  }, [organizationId, visible]);

  const canSubmit = useMemo(() => {
    if (!code.trim() || !name.trim()) return false;
    return true;
  }, [code, name]);

  const typeOptions = useMemo(
    () => [
      { label: t('asset_types.field_type_text', 'Text'), value: 'text' as FieldType },
      { label: t('asset_types.field_type_number', 'Number'), value: 'number' as FieldType },
      { label: t('asset_types.field_type_boolean', 'Yes / No'), value: 'boolean' as FieldType },
      { label: t('asset_types.field_type_date', 'Date'), value: 'date' as FieldType }
    ],
    [t]
  );

  const unitOptions = useMemo(() => {
    return units.map((u) => ({
      label: u.symbol?.trim() ? u.symbol.trim() : u.name,
      value: u.id
    }));
  }, [units]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!organizationId) return;

    const parsedFields = buildFields(schemaRows);
    if (!parsedFields.ok) {
      dispatch(
        enqueueToast({
          severity: 'warn',
          summary: t('common.validation', 'Kontrol'),
          detail:
            parsedFields.message === 'duplicate_key'
              ? t('asset_types.field_duplicate', 'Ayni alan adi birden fazla kez kullanilamaz.')
              : t('asset_types.field_key_required', 'Alan adi bos birakilamaz.')
        })
      );
      return;
    }

    setMutating(true);
    try {
      const payload = {
        code: code.trim(),
        name: name.trim(),
        active,
        fields: parsedFields.value
      };

      const response = editing
        ? await api.put(`/api/organizations/${organizationId}/asset-types/${editing.id}`, payload)
        : await api.post(`/api/organizations/${organizationId}/asset-types`, payload);

      const saved = (response.data.assetType ?? response.data.asset_type ?? response.data) as AssetTypeRow;

      dispatch(
        enqueueToast({
          severity: 'success',
          summary: t('common.success', 'Basarili'),
          detail: editing ? t('asset_types.updated', 'Varlik tipi guncellendi.') : t('asset_types.created', 'Varlik tipi olusturuldu.')
        })
      );

      onSaved?.(saved);
      onHide();
    } catch {
      dispatch(
        enqueueToast({
          severity: 'error',
          summary: t('common.error', 'Hata'),
          detail: t('asset_types.save_failed', 'Kaydetme basarisiz. Kod benzersiz olmali.')
        })
      );
    } finally {
      setMutating(false);
    }
  };

  return (
    <Dialog
      header={editing ? t('asset_types.edit', 'Tip Duzenle') : t('asset_types.new', 'Yeni Tip')}
      visible={visible}
      onHide={onHide}
      className="asset-type-dialog w-full max-w-4xl"
    >
      <form className="grid gap-3" onSubmit={submit} autoComplete="off">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">{t('common.code', 'Kod')}</span>
            <InputText value={code} onChange={(e) => setCode(e.target.value)} className="w-full p-inputtext-sm" />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">{t('common.name', 'Isim')}</span>
            <InputText value={name} onChange={(e) => setName(e.target.value)} className="w-full p-inputtext-sm" />
          </label>
        </div>

        <label className="flex items-center gap-2 pt-1">
          <Checkbox inputId="asset-type-active" checked={active} onChange={(e) => setActive(Boolean(e.checked))} />
          <span className="text-sm text-slate-700">{t('common.active', 'Aktif')}</span>
        </label>

        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium text-slate-700">{t('asset.attributes', 'Ozellikler')}</span>
              <Button
                icon="pi pi-info-circle"
                size="small"
                text
                rounded
                type="button"
                aria-label={t('asset_types.fields_help', 'Bu alanda bu tipe ait ozellikleri tanimlayabilirsin.')}
                tooltip={t('asset_types.fields_help', 'Bu alanda bu tipe ait ozellikleri tanimlayabilirsin.')}
                tooltipOptions={{ position: 'top' }}
              />
            </div>
            <Button
              label={t('asset_types.field_add', 'Alan Ekle')}
              icon="pi pi-plus"
              size="small"
              type="button"
              onClick={() =>
                setSchemaRows((prev) => [...prev, { label: '', type: 'text', required: false, unitId: null }])
              }
            />
          </div>

          {schemaRows.length > 0 ? (
            <div className="asset-type-fields-head hidden grid-cols-[minmax(12rem,1fr)_9rem_minmax(10rem,12rem)_8rem_2.5rem] gap-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 lg:grid">
              <span>{t('asset_types.field_label', 'Gorunen Ad')}</span>
              <span>{t('asset_types.field_type', 'Tip')}</span>
              <span>{t('asset_types.field_unit', 'Birim')}</span>
              <span>{t('asset_types.field_required', 'Zorunlu')}</span>
              <span />
            </div>
          ) : null}

          {schemaRows.map((row, idx) => (
            <div
              key={`${row.label}-${idx}`}
              className="asset-type-field-row grid items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 lg:grid-cols-[minmax(12rem,1fr)_9rem_minmax(10rem,12rem)_8rem_2.5rem]"
            >
              <InputText
                value={row.label}
                onChange={(e) => setSchemaRows((prev) => prev.map((p, i) => (i === idx ? { ...p, label: e.target.value } : p)))}
                placeholder={t('asset_types.field_label', 'Gorunen Ad')}
                className="w-full p-inputtext-sm"
              />
              <Dropdown
                value={row.type}
                onChange={(e) =>
                  setSchemaRows((prev) => prev.map((p, i) => (i === idx ? { ...p, type: normalizeFieldType(e.value) } : p)))
                }
                options={typeOptions}
                className="w-full p-inputtext-sm"
                placeholder={t('asset_types.field_type', 'Tip')}
              />
              <Dropdown
                value={row.unitId}
                onChange={(e) =>
                  setSchemaRows((prev) => prev.map((p, i) => (i === idx ? { ...p, unitId: normalizeUnitId(e.value) } : p)))
                }
                options={unitOptions}
                className="w-full p-inputtext-sm"
                placeholder={t('asset_types.field_unit', 'Birim')}
                showClear
                filter
              />
              <label className="asset-type-required-cell flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-2">
                <Checkbox
                  checked={row.required}
                  onChange={(e) =>
                    setSchemaRows((prev) => prev.map((p, i) => (i === idx ? { ...p, required: Boolean(e.checked) } : p)))
                  }
                />
                <span className="text-xs text-slate-700">{t('asset_types.field_required', 'Zorunlu')}</span>
              </label>
              <Button
                icon="pi pi-trash"
                size="small"
                text
                rounded
                severity="danger"
                type="button"
                onClick={() => setSchemaRows((prev) => prev.filter((_, i) => i !== idx))}
                aria-label={t('common.delete', 'Sil')}
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button label={t('common.cancel', 'Vazgec')} size="small" text type="button" onClick={onHide} />
          <Button label={t('common.save', 'Kaydet')} size="small" type="submit" loading={mutating} disabled={!canSubmit} />
        </div>
      </form>
    </Dialog>
  );
}
