import { useEffect, useState, type FormEvent } from 'react';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { confirmDialog } from 'primereact/confirmdialog';
import { useDispatch, useSelector } from 'react-redux';

import { api } from '../../services/api';
import { fetchI18nTranslations } from '../../store/i18nSlice';
import type { AppDispatch, RootState } from '../../store';
import { useI18n } from '../../hooks/useI18n';

type TranslationRow = {
  id: number;
  organization_id: number;
  namespace: string;
  entry_key: string;
  tr: string;
  en: string;
  created_at: string;
  updated_at: string;
};

const namespaceOptions = [
  { label: 'warehouse_type', value: 'warehouse_type' },
  { label: 'inventory', value: 'inventory' },
  { label: 'common', value: 'common' },
  { label: 'nav', value: 'nav' },
  { label: 'profile', value: 'profile' },
  { label: 'setup', value: 'setup' },
  { label: 'unit', value: 'unit' },
  { label: 'ui', value: 'ui' }
];

export default function TranslationsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useI18n();
  const organizationId = useSelector((s: RootState) => s.user.organizationId);
  const activeLocale = useSelector((s: RootState) => s.i18n.locale);

  const [rows, setRows] = useState<TranslationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<TranslationRow | null>(null);
  const [namespace, setNamespace] = useState('warehouse_type');
  const [entryKey, setEntryKey] = useState('');
  const [trValue, setTrValue] = useState('');
  const [enValue, setEnValue] = useState('');

  const fetchRows = async () => {
    if (!organizationId) return;
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/api/organizations/${organizationId}/translations`);
      setRows(response.data.translations ?? []);
    } catch {
      setError('Ceviri kayitlari yuklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, [organizationId]);

  const openCreate = () => {
    setEditingRow(null);
    setNamespace('warehouse_type');
    setEntryKey('');
    setTrValue('');
    setEnValue('');
    setDialogOpen(true);
  };

  const openEdit = (row: TranslationRow) => {
    setEditingRow(row);
    setNamespace(row.namespace);
    setEntryKey(row.entry_key);
    setTrValue(row.tr);
    setEnValue(row.en);
    setDialogOpen(true);
  };

  const onDelete = (row: TranslationRow) => {
    if (!organizationId) return;
    confirmDialog({
      header: 'Ceviri Sil',
      message: `${row.namespace}.${row.entry_key} kaydini silmek istiyor musun?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sil',
      rejectLabel: 'Vazgec',
      acceptClassName: 'p-button-danger p-button-sm',
      rejectClassName: 'p-button-text p-button-sm',
      accept: async () => {
        try {
          await api.delete(`/api/organizations/${organizationId}/translations/${row.id}`);
          await fetchRows();
          await dispatch(fetchI18nTranslations({ organizationId, locale: activeLocale }));
        } catch {
          setError('Ceviri silinemedi.');
        }
      }
    });
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!organizationId) return;

    const payload = {
      namespace: namespace.trim(),
      entry_key: entryKey.trim(),
      tr: trValue.trim(),
      en: enValue.trim()
    };

    if (!payload.namespace || !payload.entry_key || !payload.tr || !payload.en) return;

    setLoading(true);
    setError('');
    try {
      if (editingRow) {
        await api.put(`/api/organizations/${organizationId}/translations/${editingRow.id}`, payload);
      } else {
        await api.post(`/api/organizations/${organizationId}/translations`, payload);
      }
      setDialogOpen(false);
      await fetchRows();
      await dispatch(fetchI18nTranslations({ organizationId, locale: activeLocale }));
    } catch {
      setError('Kaydetme basarisiz. Ayni namespace + key kaydi mevcut olabilir.');
    } finally {
      setLoading(false);
    }
  };

  const actionsBody = (row: TranslationRow) => {
    return (
      <div className="flex items-center justify-end gap-1">
        <Button icon="pi pi-pencil" size="small" text rounded onClick={() => openEdit(row)} aria-label="Edit" />
        <Button
          icon="pi pi-trash"
          size="small"
          text
          rounded
          severity="danger"
          onClick={() => onDelete(row)}
          aria-label="Delete"
        />
      </div>
    );
  };

  if (!organizationId) {
    return <Message severity="warn" text="Organization bulunamadi. Lutfen tekrar giris yap." className="w-full" />;
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-slate-600">{t('setup.translations.title', 'Ceviri Sozlugu')}</div>
        <Button label={t('setup.translations.new', 'Yeni Ceviri')} icon="pi pi-plus" size="small" onClick={openCreate} />
      </div>

      {error ? <Message severity="error" text={error} className="w-full" /> : null}

      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="overflow-x-auto">
          <DataTable value={rows} loading={loading} size="small" emptyMessage={t('setup.translations.no_data', 'Kayit yok.')}> 
            <Column field="namespace" header={t('setup.translations.namespace', 'Namespace')} sortable />
            <Column field="entry_key" header={t('setup.translations.key', 'Key')} sortable />
            <Column field="tr" header={t('setup.translations.tr', 'Turkce')} />
            <Column field="en" header={t('setup.translations.en', 'English')} />
            <Column header="" body={actionsBody} style={{ width: '8rem' }} />
          </DataTable>
        </div>
      </div>

      <Dialog
        header={editingRow ? 'Ceviri Duzenle' : 'Yeni Ceviri'}
        visible={dialogOpen}
        onHide={() => setDialogOpen(false)}
        className="w-full max-w-xl"
      >
        <form className="grid gap-3" onSubmit={submit}>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Namespace</span>
            <Dropdown
              value={namespace}
              options={namespaceOptions}
              onChange={(ev) => setNamespace(String(ev.value ?? ''))}
              optionLabel="label"
              optionValue="value"
              editable
              className="w-full"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Key (kod tabanli)</span>
            <InputText value={entryKey} onChange={(ev) => setEntryKey(ev.target.value)} className="w-full" placeholder="RAW_MATERIAL" />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">{t('setup.translations.tr', 'Turkce')}</span>
            <InputText value={trValue} onChange={(ev) => setTrValue(ev.target.value)} className="w-full" />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">{t('setup.translations.en', 'English')}</span>
            <InputText value={enValue} onChange={(ev) => setEnValue(ev.target.value)} className="w-full" />
          </label>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Oneri: `warehouse_type.RAW_MATERIAL` icin `namespace=warehouse_type` + `key=RAW_MATERIAL`; `inventory.tab.movements` icin `namespace=inventory` + `key=tab.movements`.
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button label="Vazgec" size="small" text type="button" onClick={() => setDialogOpen(false)} />
            <Button
              label="Kaydet"
              size="small"
              type="submit"
              loading={loading}
              disabled={!namespace.trim() || !entryKey.trim() || !trValue.trim() || !enValue.trim()}
            />
          </div>
        </form>
      </Dialog>
    </div>
  );
}
