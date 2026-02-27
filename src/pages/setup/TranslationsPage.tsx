import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { confirmDialog } from 'primereact/confirmdialog';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';

import { api } from '../../services/api';
import { fetchI18nTranslations } from '../../store/i18nSlice';
import type { AppDispatch, RootState } from '../../store';
import { enqueueToast } from '../../store/uiSlice';
import { useI18n } from '../../hooks/useI18n';
import TranslationAddEditDialog from './TranslationAddEditDialog';

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

export default function TranslationsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const namespaceFilter = searchParams.get('namespace')?.trim() || '';
  const organizationId = useSelector((s: RootState) => s.user.organizationId);
  const activeLocale = useSelector((s: RootState) => s.i18n.locale);

  const [rows, setRows] = useState<TranslationRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<TranslationRow | null>(null);
  const [search, setSearch] = useState('');
  const [namespace, setNamespace] = useState(namespaceFilter || 'custom');
  const [entryKey, setEntryKey] = useState('');
  const [trValue, setTrValue] = useState('');
  const [enValue, setEnValue] = useState('');

  const resetForm = () => {
    setEditingRow(null);
    setNamespace(namespaceFilter || 'custom');
    setEntryKey('');
    setTrValue('');
    setEnValue('');
  };

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [row.namespace, row.entry_key, row.tr, row.en].some((value) => String(value ?? '').toLowerCase().includes(q))
    );
  }, [rows, search]);

  const fetchRows = async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const response = await api.get(`/api/organizations/${organizationId}/translations`, {
        params: namespaceFilter ? { namespace: namespaceFilter } : undefined
      });
      setRows(response.data.translations ?? []);
    } catch {
      dispatch(enqueueToast({ severity: 'error', summary: 'Hata', detail: 'Ceviri kayitlari yuklenemedi.' }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, [organizationId, namespaceFilter]);

  const openCreate = () => {
    resetForm();
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
          dispatch(enqueueToast({ severity: 'success', summary: 'Basarili', detail: 'Ceviri silindi.' }));
          await fetchRows();
          await dispatch(fetchI18nTranslations({ organizationId, locale: activeLocale }));
        } catch {
          dispatch(enqueueToast({ severity: 'error', summary: 'Hata', detail: 'Ceviri silinemedi.' }));
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
    try {
      const isEdit = Boolean(editingRow);
      if (editingRow) {
        await api.put(`/api/organizations/${organizationId}/translations/${editingRow.id}`, payload);
      } else {
        await api.post(`/api/organizations/${organizationId}/translations`, payload);
      }
      setDialogOpen(false);
      dispatch(
        enqueueToast({
          severity: 'success',
          summary: 'Basarili',
          detail: isEdit ? 'Ceviri guncellendi.' : 'Ceviri olusturuldu.'
        })
      );
      await fetchRows();
      await dispatch(fetchI18nTranslations({ organizationId, locale: activeLocale }));
    } catch {
      dispatch(
        enqueueToast({
          severity: 'error',
          summary: 'Hata',
          detail: 'Kaydetme basarisiz. Ayni namespace + key kaydi mevcut olabilir.'
        })
      );
    } finally {
      setLoading(false);
    }
  };

  const actionsBody = (row: TranslationRow) => {
    return (
      <div className="flex items-center justify-end gap-1">
        <Button icon="pi pi-pencil" size="small" text rounded onClick={() => openEdit(row)} aria-label={t('inventory.action.edit', 'Duzenle')} />
        <Button
          icon="pi pi-trash"
          size="small"
          text
          rounded
          severity="danger"
          onClick={() => onDelete(row)}
          aria-label={t('common.delete', 'Sil')}
        />
      </div>
    );
  };

  if (!organizationId) {
    return <Message severity="warn" text="Organization bulunamadi. Lutfen tekrar giris yap." className="w-full" />;
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
          <IconField iconPosition="left" className="w-full sm:w-auto">
            <InputIcon className="pi pi-search text-slate-400" />
            <InputText
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('common.search', 'Ara')}
              className="w-full sm:w-72"
            />
          </IconField>
          <Button label={t('setup.translations.new', 'Yeni Ceviri')} icon="pi pi-plus" size="small" onClick={openCreate} />
        </div>

        <div className="overflow-x-auto">
          <DataTable className="translations-datatable" value={filteredRows} loading={loading} size="small" emptyMessage={t('setup.translations.no_data', 'Kayit yok.')}> 
            <Column field="namespace" header={t('setup.translations.namespace', 'Ad Alani')} sortable />
            <Column field="entry_key" header={t('setup.translations.key', 'Key')} sortable />
            <Column field="tr" header={t('setup.translations.tr', 'Türkçe')} />
            <Column field="en" header={t('setup.translations.en', 'English')} />
            <Column header="" body={actionsBody} style={{ width: '8rem' }} />
          </DataTable>
        </div>
      </div>

      <TranslationAddEditDialog
        t={t}
        visible={dialogOpen}
        editing={Boolean(editingRow)}
        loading={loading}
        namespace={namespace}
        entryKey={entryKey}
        setEntryKey={setEntryKey}
        trValue={trValue}
        setTrValue={setTrValue}
        enValue={enValue}
        setEnValue={setEnValue}
        onHide={() => {
          setDialogOpen(false);
          resetForm();
        }}
        onSubmit={submit}
      />
    </div>
  );
}
