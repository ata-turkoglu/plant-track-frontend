import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { confirmDialog } from 'primereact/confirmdialog';
import { DataTable } from 'primereact/datatable';
import type { DataTableFilterMeta } from 'primereact/datatable';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { FilterMatchMode } from 'primereact/api';

import type { AppDispatch, RootState } from '../store';
import { useI18n } from '../hooks/useI18n';
import CustomerAddEditDialog from './CustomerAddEditDialog';
import {
  createCustomer,
  deleteCustomer,
  fetchCustomers,
  type CustomerRow,
  updateCustomer
} from '../store/customersSlice';

export default function CustomersPage() {
  const { t } = useI18n();
  const dispatch = useDispatch<AppDispatch>();
  const organizationId = useSelector((s: RootState) => s.user.organizationId);
  const { rows, loading: fetchLoading, mutating } = useSelector((s: RootState) => s.customers);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [contactName, setContactName] = useState('');
  const [taxNo, setTaxNo] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [active, setActive] = useState(true);

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<DataTableFilterMeta>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    name: { value: null, matchMode: FilterMatchMode.CONTAINS },
    email: { value: null, matchMode: FilterMatchMode.CONTAINS },
    phone: { value: null, matchMode: FilterMatchMode.CONTAINS }
  });

  useEffect(() => {
    if (!organizationId) return;
    dispatch(fetchCustomers(organizationId));
  }, [dispatch, organizationId]);

  const globalFilterFields = useMemo(() => ['name', 'email', 'phone'], []);
  const loading = fetchLoading || mutating;

  const openCreate = () => {
    setMode('create');
    setEditingId(null);
    setName('');
    setEmail('');
    setPhone('');
    setContactName('');
    setTaxNo('');
    setAddress('');
    setNotes('');
    setActive(true);
    setDialogOpen(true);
  };

  const openEdit = (row: CustomerRow) => {
    setMode('edit');
    setEditingId(row.id);
    setName(row.name);
    setEmail(row.email ?? '');
    setPhone(row.phone ?? '');
    setContactName(row.contact_name ?? '');
    setTaxNo(row.tax_no ?? '');
    setAddress(row.address ?? '');
    setNotes(row.notes ?? '');
    setActive(row.active);
    setDialogOpen(true);
  };

  const submit = async () => {
    if (!organizationId || !name.trim()) return;

    try {
      const payload = {
        organizationId,
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        contact_name: contactName.trim() || null,
        tax_no: taxNo.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
        active
      };
      if (mode === 'edit' && editingId) {
        await dispatch(updateCustomer({ ...payload, id: editingId })).unwrap();
      } else {
        await dispatch(createCustomer(payload)).unwrap();
      }
      setDialogOpen(false);
    } catch {
    }
  };

  const remove = (row: CustomerRow) => {
    if (!organizationId) return;
    confirmDialog({
      message: t('customer.confirm.delete', `${row.name} kaydini silmek istiyor musun?`),
      header: t('inventory.confirm.title', 'Silme Onayi'),
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger p-button-sm',
      acceptLabel: t('common.delete', 'Sil'),
      rejectLabel: t('common.cancel', 'Vazgec'),
      accept: async () => {
        try {
          await dispatch(deleteCustomer({ organizationId, id: row.id })).unwrap();
        } catch {
        }
      }
    });
  };

  if (!organizationId) {
    return <Message severity="warn" text={t('common.organization_missing', 'Organization bulunamadi. Lutfen tekrar giris yap.')} className="w-full" />;
  }

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
            className="w-full sm:w-72"
          />
        </IconField>
        <Button label={t('customer.new', 'Yeni Musteri')} icon="pi pi-plus" size="small" onClick={openCreate} />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white py-2">
        <DataTable
          value={rows}
          size="small"
          loading={loading}
          emptyMessage={t('customer.empty', 'Musteri yok.')}
          dataKey="id"
          paginator
          rows={12}
          filters={filters}
          onFilter={(e) => setFilters(e.filters)}
          globalFilterFields={globalFilterFields}
          tableStyle={{ minWidth: '48rem' }}
        >
          <Column field="name" header={t('common.name', 'Isim')} sortable filter />
          <Column field="phone" header={t('common.phone', 'Telefon')} sortable filter style={{ width: '12rem' }} />
          <Column field="email" header={t('common.email', 'E-posta')} sortable filter style={{ width: '16rem' }} />
          <Column
            field="active"
            header={t('common.active', 'Aktif')}
            sortable
            style={{ width: '7rem' }}
            body={(row: CustomerRow) => <span>{row.active ? t('common.yes', 'Evet') : t('common.no', 'Hayir')}</span>}
          />
          <Column
            header=""
            style={{ width: '7rem' }}
            body={(row: CustomerRow) => (
              <div className="flex items-center justify-end gap-1">
                <Button icon="pi pi-pencil" size="small" text rounded onClick={() => openEdit(row)} aria-label={t('inventory.action.edit', 'Duzenle')} />
                <Button icon="pi pi-trash" size="small" text rounded severity="danger" onClick={() => remove(row)} aria-label={t('common.delete', 'Sil')} />
              </div>
            )}
          />
        </DataTable>
      </div>

      <CustomerAddEditDialog
        t={t}
        visible={dialogOpen}
        mode={mode}
        mutating={mutating}
        name={name}
        setName={setName}
        email={email}
        setEmail={setEmail}
        phone={phone}
        setPhone={setPhone}
        contactName={contactName}
        setContactName={setContactName}
        taxNo={taxNo}
        setTaxNo={setTaxNo}
        address={address}
        setAddress={setAddress}
        notes={notes}
        setNotes={setNotes}
        active={active}
        setActive={setActive}
        onHide={() => setDialogOpen(false)}
        onSubmit={() => void submit()}
      />
    </div>
  );
}
