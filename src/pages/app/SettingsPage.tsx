import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { SelectButton } from 'primereact/selectbutton';
import { TabPanel, TabView } from 'primereact/tabview';
import { Tag } from 'primereact/tag';
import { Header } from '../../components/layout/Header';
import { Sidebar } from '../../components/layout/Sidebar';
import {
  authApi,
  type AuthUser,
  type CreateUserPayload,
  type UpdateUserPayload,
  type UserRole
} from '../../services/authApi';
import { inventoryApi } from '../../services/inventoryApi';
import type { Business, Facility, Factory, Product, Warehouse } from '../../types/inventory';

interface MachineRow {
  id: string;
  code: string;
  name: string;
  facilityCode: string;
  status: 'running' | 'maintenance' | 'stopped';
}

interface UserFormState {
  id?: string | number;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  password: string;
  isActive: boolean;
}

interface BusinessFormState {
  id?: number;
  code: string;
  name: string;
  city: string;
  isActive: boolean;
}

interface FactoryFormState {
  id?: number;
  businessId?: number;
  code: string;
  name: string;
  city: string;
  isActive: boolean;
}

interface FacilityFormState {
  id?: number;
  factoryId?: number;
  code: string;
  name: string;
  city: string;
  isActive: boolean;
}

const roleOptions = [
  { label: 'User', value: 'user' },
  { label: 'Admin', value: 'admin' }
];

const statusOptions = [
  { label: 'Active', value: true },
  { label: 'Inactive', value: false }
];

const initialUserForm: UserFormState = {
  email: '',
  firstName: '',
  lastName: '',
  role: 'user',
  password: '',
  isActive: true
};

const initialBusinessForm: BusinessFormState = {
  code: '',
  name: '',
  city: '',
  isActive: true
};

const initialFactoryForm: FactoryFormState = {
  businessId: undefined,
  code: '',
  name: '',
  city: '',
  isActive: true
};

const initialFacilityForm: FacilityFormState = {
  factoryId: undefined,
  code: '',
  name: '',
  city: '',
  isActive: true
};

const initialMachines: MachineRow[] = [
  { id: '1', code: 'MCH-JAW-01', name: 'Ceneli Kirici 1100x850', facilityCode: 'FCL-KVZ-01', status: 'running' },
  { id: '2', code: 'MCH-CONE-01', name: 'Konik Kirici HP300', facilityCode: 'FCL-KVZ-01', status: 'maintenance' },
  { id: '3', code: 'MCH-SCR-02', name: 'Titresimli Elek 4 Katli', facilityCode: 'FCL-KVZ-01', status: 'running' }
];

function errorMessage(error: unknown): string {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? error.message;
  }
  return 'Islem tamamlanamadi.';
}

export function SettingsPage(): React.JSX.Element {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [factories, setFactories] = useState<Factory[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [machines] = useState<MachineRow[]>(initialMachines);
  const [products, setProducts] = useState<Product[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userTabError, setUserTabError] = useState<string | null>(null);

  const [canManageUsers, setCanManageUsers] = useState(true);
  const [canManageBusinesses, setCanManageBusinesses] = useState(true);
  const [canManageFactories, setCanManageFactories] = useState(true);
  const [canManageFacilities, setCanManageFacilities] = useState(true);

  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [userFormMode, setUserFormMode] = useState<'create' | 'edit'>('create');
  const [userForm, setUserForm] = useState<UserFormState>(initialUserForm);
  const [userFormError, setUserFormError] = useState<string | null>(null);
  const [userActionLoading, setUserActionLoading] = useState(false);

  const [businessDialogOpen, setBusinessDialogOpen] = useState(false);
  const [businessFormMode, setBusinessFormMode] = useState<'create' | 'edit'>('create');
  const [businessForm, setBusinessForm] = useState<BusinessFormState>(initialBusinessForm);
  const [businessFormError, setBusinessFormError] = useState<string | null>(null);
  const [businessActionLoading, setBusinessActionLoading] = useState(false);

  const [factoryDialogOpen, setFactoryDialogOpen] = useState(false);
  const [factoryFormMode, setFactoryFormMode] = useState<'create' | 'edit'>('create');
  const [factoryForm, setFactoryForm] = useState<FactoryFormState>(initialFactoryForm);
  const [factoryFormError, setFactoryFormError] = useState<string | null>(null);
  const [factoryActionLoading, setFactoryActionLoading] = useState(false);

  const [facilityDialogOpen, setFacilityDialogOpen] = useState(false);
  const [facilityFormMode, setFacilityFormMode] = useState<'create' | 'edit'>('create');
  const [facilityForm, setFacilityForm] = useState<FacilityFormState>(initialFacilityForm);
  const [facilityFormError, setFacilityFormError] = useState<string | null>(null);
  const [facilityActionLoading, setFacilityActionLoading] = useState(false);

  const activeBusinesses = useMemo(() => businesses.filter((item) => item.isActive), [businesses]);
  const activeFactories = useMemo(() => factories.filter((item) => item.isActive), [factories]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    setUserTabError(null);

    const [usersResult, businessesResult, factoriesResult, facilitiesResult, warehouseResult, productResult] =
      await Promise.allSettled([
        authApi.listUsers(1, 100),
        inventoryApi.listBusinesses(),
        inventoryApi.listFactories(),
        inventoryApi.listFacilities(),
        inventoryApi.listWarehouses(),
        inventoryApi.listProducts()
      ]);

    if (usersResult.status === 'fulfilled') {
      setUsers(usersResult.value.data);
      setCanManageUsers(true);
      setCanManageBusinesses(true);
      setCanManageFactories(true);
      setCanManageFacilities(true);
    } else {
      const status = axios.isAxiosError(usersResult.reason) ? usersResult.reason.response?.status : undefined;
      if (status === 403) {
        try {
          const me = await authApi.getMe();
          setUsers([me]);
          setUserTabError('Tum kullanicilari listelemek ve ayarlari degistirmek icin admin yetkisi gerekir.');
        } catch (meError) {
          setUsers([]);
          setUserTabError(errorMessage(meError));
        }
      } else {
        setUsers([]);
        setUserTabError(errorMessage(usersResult.reason));
      }

      setCanManageUsers(false);
      setCanManageBusinesses(false);
      setCanManageFactories(false);
      setCanManageFacilities(false);
    }

    if (businessesResult.status === 'fulfilled') {
      setBusinesses(businessesResult.value);
    } else {
      setBusinesses([]);
    }

    if (factoriesResult.status === 'fulfilled') {
      setFactories(factoriesResult.value);
    } else {
      setFactories([]);
    }

    if (facilitiesResult.status === 'fulfilled') {
      setFacilities(facilitiesResult.value);
    } else {
      setFacilities([]);
    }

    if (warehouseResult.status === 'fulfilled') {
      setWarehouses(warehouseResult.value);
    }

    if (productResult.status === 'fulfilled') {
      setProducts(productResult.value);
    }

    if (
      usersResult.status === 'rejected' &&
      businessesResult.status === 'rejected' &&
      factoriesResult.status === 'rejected' &&
      facilitiesResult.status === 'rejected' &&
      warehouseResult.status === 'rejected' &&
      productResult.status === 'rejected'
    ) {
      setError('Tablo verileri yuklenemedi.');
    }

    setLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const openCreateUserDialog = () => {
    setUserFormMode('create');
    setUserForm(initialUserForm);
    setUserFormError(null);
    setUserDialogOpen(true);
  };

  const openEditUserDialog = (user: AuthUser) => {
    setUserFormMode('edit');
    setUserForm({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      password: '',
      isActive: user.isActive
    });
    setUserFormError(null);
    setUserDialogOpen(true);
  };

  const closeUserDialog = () => {
    if (!userActionLoading) {
      setUserDialogOpen(false);
      setUserFormError(null);
    }
  };

  const submitUserForm = async () => {
    setUserFormError(null);

    const email = userForm.email.trim().toLowerCase();
    const firstName = userForm.firstName.trim();
    const lastName = userForm.lastName.trim();

    if (!email || !firstName || !lastName) {
      setUserFormError('Email, ad ve soyad zorunlu.');
      return;
    }

    if (userFormMode === 'create' && !userForm.password) {
      setUserFormError('Yeni kullanici icin sifre zorunlu.');
      return;
    }

    setUserActionLoading(true);
    try {
      if (userFormMode === 'create') {
        const payload: CreateUserPayload = {
          email,
          firstName,
          lastName,
          role: userForm.role,
          isActive: userForm.isActive,
          password: userForm.password
        };
        await authApi.createUser(payload);
      } else {
        if (!userForm.id) {
          setUserFormError('Guncellenecek kullanici bulunamadi.');
          return;
        }

        const payload: UpdateUserPayload = {
          email,
          firstName,
          lastName,
          role: userForm.role,
          isActive: userForm.isActive
        };
        await authApi.updateUserById(userForm.id, payload);
      }

      setUserDialogOpen(false);
      await loadData();
    } catch (requestError) {
      setUserFormError(errorMessage(requestError));
    } finally {
      setUserActionLoading(false);
    }
  };

  const deactivateUser = async (user: AuthUser) => {
    if (!user.isActive) {
      return;
    }

    if (!window.confirm(`${user.email} kullanicisini pasif yapmak istiyor musun?`)) {
      return;
    }

    setUserActionLoading(true);
    try {
      await authApi.deactivateUserById(user.id);
      await loadData();
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setUserActionLoading(false);
    }
  };

  const openCreateBusinessDialog = () => {
    setBusinessFormMode('create');
    setBusinessForm(initialBusinessForm);
    setBusinessFormError(null);
    setBusinessDialogOpen(true);
  };

  const openEditBusinessDialog = (business: Business) => {
    setBusinessFormMode('edit');
    setBusinessForm({
      id: business.id,
      code: business.code,
      name: business.name,
      city: business.city ?? '',
      isActive: business.isActive
    });
    setBusinessFormError(null);
    setBusinessDialogOpen(true);
  };

  const closeBusinessDialog = () => {
    if (!businessActionLoading) {
      setBusinessDialogOpen(false);
      setBusinessFormError(null);
    }
  };

  const submitBusinessForm = async () => {
    setBusinessFormError(null);

    const code = businessForm.code.trim();
    const name = businessForm.name.trim();
    const city = businessForm.city.trim();

    if (!code || !name) {
      setBusinessFormError('Isletme code ve name zorunlu.');
      return;
    }

    setBusinessActionLoading(true);
    try {
      if (businessFormMode === 'create') {
        await inventoryApi.createBusiness({ code, name, city: city || undefined, isActive: businessForm.isActive });
      } else {
        if (!businessForm.id) {
          setBusinessFormError('Guncellenecek isletme bulunamadi.');
          return;
        }
        await inventoryApi.updateBusiness(businessForm.id, {
          code,
          name,
          city: city || undefined,
          isActive: businessForm.isActive
        });
      }

      setBusinessDialogOpen(false);
      await loadData();
    } catch (requestError) {
      setBusinessFormError(errorMessage(requestError));
    } finally {
      setBusinessActionLoading(false);
    }
  };

  const deactivateBusiness = async (business: Business) => {
    if (!business.isActive) {
      return;
    }

    if (!window.confirm(`${business.code} isletmesini pasif yapmak istiyor musun?`)) {
      return;
    }

    setBusinessActionLoading(true);
    try {
      await inventoryApi.deactivateBusiness(business.id);
      await loadData();
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusinessActionLoading(false);
    }
  };

  const openCreateFactoryDialog = () => {
    setFactoryFormMode('create');
    setFactoryForm({
      ...initialFactoryForm,
      businessId: activeBusinesses[0]?.id
    });
    setFactoryFormError(null);
    setFactoryDialogOpen(true);
  };

  const openEditFactoryDialog = (factory: Factory) => {
    setFactoryFormMode('edit');
    setFactoryForm({
      id: factory.id,
      businessId: factory.businessId,
      code: factory.code,
      name: factory.name,
      city: factory.city ?? '',
      isActive: factory.isActive
    });
    setFactoryFormError(null);
    setFactoryDialogOpen(true);
  };

  const closeFactoryDialog = () => {
    if (!factoryActionLoading) {
      setFactoryDialogOpen(false);
      setFactoryFormError(null);
    }
  };

  const submitFactoryForm = async () => {
    setFactoryFormError(null);

    const businessId = factoryForm.businessId;
    const code = factoryForm.code.trim();
    const name = factoryForm.name.trim();
    const city = factoryForm.city.trim();

    if (!businessId) {
      setFactoryFormError('Factory bir isletmeye baglanmali.');
      return;
    }

    if (!code || !name) {
      setFactoryFormError('Factory code ve name zorunlu.');
      return;
    }

    setFactoryActionLoading(true);
    try {
      if (factoryFormMode === 'create') {
        await inventoryApi.createFactory({ businessId, code, name, city: city || undefined, isActive: factoryForm.isActive });
      } else {
        if (!factoryForm.id) {
          setFactoryFormError('Guncellenecek factory bulunamadi.');
          return;
        }
        await inventoryApi.updateFactory(factoryForm.id, {
          businessId,
          code,
          name,
          city: city || undefined,
          isActive: factoryForm.isActive
        });
      }

      setFactoryDialogOpen(false);
      await loadData();
    } catch (requestError) {
      setFactoryFormError(errorMessage(requestError));
    } finally {
      setFactoryActionLoading(false);
    }
  };

  const deactivateFactory = async (factory: Factory) => {
    if (!factory.isActive) {
      return;
    }

    if (!window.confirm(`${factory.code} factory kaydini pasif yapmak istiyor musun?`)) {
      return;
    }

    setFactoryActionLoading(true);
    try {
      await inventoryApi.deactivateFactory(factory.id);
      await loadData();
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setFactoryActionLoading(false);
    }
  };

  const openCreateFacilityDialog = () => {
    setFacilityFormMode('create');
    setFacilityForm({
      ...initialFacilityForm,
      factoryId: activeFactories[0]?.id
    });
    setFacilityFormError(null);
    setFacilityDialogOpen(true);
  };

  const openEditFacilityDialog = (facility: Facility) => {
    setFacilityFormMode('edit');
    setFacilityForm({
      id: facility.id,
      factoryId: facility.factoryId,
      code: facility.code,
      name: facility.name,
      city: facility.city ?? '',
      isActive: facility.isActive
    });
    setFacilityFormError(null);
    setFacilityDialogOpen(true);
  };

  const closeFacilityDialog = () => {
    if (!facilityActionLoading) {
      setFacilityDialogOpen(false);
      setFacilityFormError(null);
    }
  };

  const submitFacilityForm = async () => {
    setFacilityFormError(null);

    const factoryId = facilityForm.factoryId;
    const code = facilityForm.code.trim();
    const name = facilityForm.name.trim();
    const city = facilityForm.city.trim();

    if (!factoryId) {
      setFacilityFormError('Facility bir factory kaydina baglanmali.');
      return;
    }

    if (!code || !name) {
      setFacilityFormError('Facility code ve name zorunlu.');
      return;
    }

    setFacilityActionLoading(true);
    try {
      if (facilityFormMode === 'create') {
        await inventoryApi.createFacility({ factoryId, code, name, city: city || undefined, isActive: facilityForm.isActive });
      } else {
        if (!facilityForm.id) {
          setFacilityFormError('Guncellenecek facility bulunamadi.');
          return;
        }
        await inventoryApi.updateFacility(facilityForm.id, {
          factoryId,
          code,
          name,
          city: city || undefined,
          isActive: facilityForm.isActive
        });
      }

      setFacilityDialogOpen(false);
      await loadData();
    } catch (requestError) {
      setFacilityFormError(errorMessage(requestError));
    } finally {
      setFacilityActionLoading(false);
    }
  };

  const deactivateFacility = async (facility: Facility) => {
    if (!facility.isActive) {
      return;
    }

    if (!window.confirm(`${facility.code} facility kaydini pasif yapmak istiyor musun?`)) {
      return;
    }

    setFacilityActionLoading(true);
    try {
      await inventoryApi.deactivateFacility(facility.id);
      await loadData();
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setFacilityActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-shell text-slate md:flex">
      <Sidebar />

      <div className="flex min-h-screen flex-1 flex-col">
        <Header title="Settings" lastUpdated={null} />

        <main className="flex-1 bg-slate-50/70 p-6">
          <section className="rounded-xl border border-slate-200 bg-panel p-4 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Master Data Settings</h2>
              <p className="mt-1 text-sm text-slate-600">
                User, isletme, factory, facility, depo, makine ve urun kayitlari bu alandan yonetilecek.
              </p>
            </div>

            {error ? <Message severity="error" text={error} className="mb-4" /> : null}

            <TabView>
              <TabPanel header={`User (${users.length})`}>
                {userTabError ? <Message severity="warn" text={userTabError} className="mb-3" /> : null}
                <div className="mb-3 flex justify-end">
                  <Button
                    type="button"
                    label="New User"
                    icon="pi pi-user-plus"
                    size="small"
                    onClick={openCreateUserDialog}
                    disabled={!canManageUsers}
                  />
                </div>

                <DataTable value={users} size="small" loading={loading} stripedRows paginator rows={8}>
                  <Column field="email" header="Email" />
                  <Column header="Name" body={(row: AuthUser) => `${row.firstName} ${row.lastName}`} />
                  <Column field="role" header="Role" />
                  <Column
                    header="Status"
                    body={(row: AuthUser) => (
                      <Tag value={row.isActive ? 'Active' : 'Inactive'} severity={row.isActive ? 'success' : 'danger'} />
                    )}
                  />
                  <Column
                    header="Actions"
                    body={(row: AuthUser) => (
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          icon="pi pi-pencil"
                          size="small"
                          text
                          severity="secondary"
                          disabled={!canManageUsers}
                          onClick={() => openEditUserDialog(row)}
                        />
                        <Button
                          type="button"
                          icon="pi pi-trash"
                          size="small"
                          text
                          severity="danger"
                          disabled={!canManageUsers || !row.isActive || userActionLoading}
                          onClick={() => void deactivateUser(row)}
                        />
                      </div>
                    )}
                  />
                </DataTable>
              </TabPanel>

              <TabPanel header={`Business (${businesses.length})`}>
                <div className="mb-3 flex justify-end">
                  <Button
                    type="button"
                    label="New Business"
                    icon="pi pi-plus"
                    size="small"
                    onClick={openCreateBusinessDialog}
                    disabled={!canManageBusinesses}
                  />
                </div>

                <DataTable value={businesses} size="small" loading={loading} stripedRows paginator rows={8}>
                  <Column field="code" header="Code" />
                  <Column field="name" header="Name" />
                  <Column field="city" header="City" />
                  <Column
                    header="Status"
                    body={(row: Business) => (
                      <Tag value={row.isActive ? 'Active' : 'Inactive'} severity={row.isActive ? 'success' : 'danger'} />
                    )}
                  />
                  <Column
                    header="Actions"
                    body={(row: Business) => (
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          icon="pi pi-pencil"
                          size="small"
                          text
                          severity="secondary"
                          disabled={!canManageBusinesses}
                          onClick={() => openEditBusinessDialog(row)}
                        />
                        <Button
                          type="button"
                          icon="pi pi-trash"
                          size="small"
                          text
                          severity="danger"
                          disabled={!canManageBusinesses || !row.isActive || businessActionLoading}
                          onClick={() => void deactivateBusiness(row)}
                        />
                      </div>
                    )}
                  />
                </DataTable>
              </TabPanel>

              <TabPanel header={`Factory (${factories.length})`}>
                <div className="mb-3 flex justify-end">
                  <Button
                    type="button"
                    label="New Factory"
                    icon="pi pi-plus"
                    size="small"
                    onClick={openCreateFactoryDialog}
                    disabled={!canManageFactories}
                  />
                </div>

                <DataTable value={factories} size="small" loading={loading} stripedRows paginator rows={8}>
                  <Column field="businessCode" header="Business" />
                  <Column field="code" header="Factory Code" />
                  <Column field="name" header="Factory Name" />
                  <Column field="city" header="City" />
                  <Column
                    header="Status"
                    body={(row: Factory) => (
                      <Tag value={row.isActive ? 'Active' : 'Inactive'} severity={row.isActive ? 'success' : 'danger'} />
                    )}
                  />
                  <Column
                    header="Actions"
                    body={(row: Factory) => (
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          icon="pi pi-pencil"
                          size="small"
                          text
                          severity="secondary"
                          disabled={!canManageFactories}
                          onClick={() => openEditFactoryDialog(row)}
                        />
                        <Button
                          type="button"
                          icon="pi pi-trash"
                          size="small"
                          text
                          severity="danger"
                          disabled={!canManageFactories || !row.isActive || factoryActionLoading}
                          onClick={() => void deactivateFactory(row)}
                        />
                      </div>
                    )}
                  />
                </DataTable>
              </TabPanel>

              <TabPanel header={`Facility (${facilities.length})`}>
                <div className="mb-3 flex justify-end">
                  <Button
                    type="button"
                    label="New Facility"
                    icon="pi pi-plus"
                    size="small"
                    onClick={openCreateFacilityDialog}
                    disabled={!canManageFacilities}
                  />
                </div>

                <DataTable value={facilities} size="small" loading={loading} stripedRows paginator rows={8}>
                  <Column field="businessCode" header="Business" />
                  <Column field="factoryCode" header="Factory" />
                  <Column field="code" header="Facility Code" />
                  <Column field="name" header="Facility Name" />
                  <Column field="city" header="City" />
                  <Column
                    header="Status"
                    body={(row: Facility) => (
                      <Tag value={row.isActive ? 'Active' : 'Inactive'} severity={row.isActive ? 'success' : 'danger'} />
                    )}
                  />
                  <Column
                    header="Actions"
                    body={(row: Facility) => (
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          icon="pi pi-pencil"
                          size="small"
                          text
                          severity="secondary"
                          disabled={!canManageFacilities}
                          onClick={() => openEditFacilityDialog(row)}
                        />
                        <Button
                          type="button"
                          icon="pi pi-trash"
                          size="small"
                          text
                          severity="danger"
                          disabled={!canManageFacilities || !row.isActive || facilityActionLoading}
                          onClick={() => void deactivateFacility(row)}
                        />
                      </div>
                    )}
                  />
                </DataTable>
              </TabPanel>

              <TabPanel header={`Warehouse (${warehouses.length})`}>
                <DataTable value={warehouses} size="small" loading={loading} stripedRows paginator rows={8}>
                  <Column field="code" header="Code" />
                  <Column field="name" header="Name" />
                  <Column field="createdAt" header="Created At" />
                </DataTable>
              </TabPanel>

              <TabPanel header={`Machine (${machines.length})`}>
                <DataTable value={machines} size="small" stripedRows paginator rows={8}>
                  <Column field="code" header="Code" />
                  <Column field="name" header="Name" />
                  <Column field="facilityCode" header="Facility" />
                  <Column
                    header="Status"
                    body={(row: MachineRow) => (
                      <Tag
                        value={row.status}
                        severity={row.status === 'running' ? 'success' : row.status === 'maintenance' ? 'warning' : 'danger'}
                      />
                    )}
                  />
                </DataTable>
              </TabPanel>

              <TabPanel header={`Product (${products.length})`}>
                <DataTable value={products} size="small" loading={loading} stripedRows paginator rows={8}>
                  <Column field="sku" header="SKU" />
                  <Column field="name" header="Name" />
                  <Column field="unit" header="Unit" />
                  <Column field="category" header="Category" />
                  <Column field="minStock" header="Min Stock" />
                </DataTable>
              </TabPanel>
            </TabView>
          </section>
        </main>
      </div>

      <Dialog
        header={userFormMode === 'create' ? 'New User' : 'Edit User'}
        visible={userDialogOpen}
        style={{ width: '32rem' }}
        onHide={closeUserDialog}
      >
        <div className="space-y-3">
          {userFormError ? <Message severity="error" text={userFormError} /> : null}

          <label className="flex flex-col gap-1 text-sm">
            Email
            <InputText
              value={userForm.email}
              onChange={(event) => setUserForm((prev) => ({ ...prev, email: event.target.value }))}
              type="email"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              First Name
              <InputText
                value={userForm.firstName}
                onChange={(event) => setUserForm((prev) => ({ ...prev, firstName: event.target.value }))}
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              Last Name
              <InputText
                value={userForm.lastName}
                onChange={(event) => setUserForm((prev) => ({ ...prev, lastName: event.target.value }))}
              />
            </label>
          </div>

          {userFormMode === 'create' ? (
            <label className="flex flex-col gap-1 text-sm">
              Password
              <InputText
                value={userForm.password}
                onChange={(event) => setUserForm((prev) => ({ ...prev, password: event.target.value }))}
                type="password"
              />
            </label>
          ) : null}

          <label className="flex flex-col gap-1 text-sm">
            Role
            <SelectButton
              value={userForm.role}
              options={roleOptions}
              onChange={(event) => setUserForm((prev) => ({ ...prev, role: event.value as UserRole }))}
              optionLabel="label"
              optionValue="value"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Status
            <SelectButton
              value={userForm.isActive}
              options={statusOptions}
              onChange={(event) => setUserForm((prev) => ({ ...prev, isActive: Boolean(event.value) }))}
              optionLabel="label"
              optionValue="value"
            />
          </label>

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" label="Cancel" text onClick={closeUserDialog} disabled={userActionLoading} />
            <Button
              type="button"
              label={userFormMode === 'create' ? 'Create' : 'Save'}
              loading={userActionLoading}
              onClick={() => void submitUserForm()}
            />
          </div>
        </div>
      </Dialog>

      <Dialog
        header={businessFormMode === 'create' ? 'New Business' : 'Edit Business'}
        visible={businessDialogOpen}
        style={{ width: '30rem' }}
        onHide={closeBusinessDialog}
      >
        <div className="space-y-3">
          {businessFormError ? <Message severity="error" text={businessFormError} /> : null}

          <label className="flex flex-col gap-1 text-sm">
            Business Code
            <InputText
              value={businessForm.code}
              onChange={(event) => setBusinessForm((prev) => ({ ...prev, code: event.target.value }))}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Business Name
            <InputText
              value={businessForm.name}
              onChange={(event) => setBusinessForm((prev) => ({ ...prev, name: event.target.value }))}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            City
            <InputText
              value={businessForm.city}
              onChange={(event) => setBusinessForm((prev) => ({ ...prev, city: event.target.value }))}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Status
            <SelectButton
              value={businessForm.isActive}
              options={statusOptions}
              onChange={(event) => setBusinessForm((prev) => ({ ...prev, isActive: Boolean(event.value) }))}
              optionLabel="label"
              optionValue="value"
            />
          </label>

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" label="Cancel" text onClick={closeBusinessDialog} disabled={businessActionLoading} />
            <Button
              type="button"
              label={businessFormMode === 'create' ? 'Create' : 'Save'}
              loading={businessActionLoading}
              onClick={() => void submitBusinessForm()}
            />
          </div>
        </div>
      </Dialog>

      <Dialog
        header={factoryFormMode === 'create' ? 'New Factory' : 'Edit Factory'}
        visible={factoryDialogOpen}
        style={{ width: '30rem' }}
        onHide={closeFactoryDialog}
      >
        <div className="space-y-3">
          {factoryFormError ? <Message severity="error" text={factoryFormError} /> : null}

          <label className="flex flex-col gap-1 text-sm">
            Business
            <select
              value={factoryForm.businessId ?? ''}
              onChange={(event) =>
                setFactoryForm((prev) => ({
                  ...prev,
                  businessId: event.target.value ? Number(event.target.value) : undefined
                }))
              }
              className="rounded-md border border-slate-300 px-3 py-2"
            >
              <option value="">Select business</option>
              {activeBusinesses.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} - {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Factory Code
            <InputText
              value={factoryForm.code}
              onChange={(event) => setFactoryForm((prev) => ({ ...prev, code: event.target.value }))}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Factory Name
            <InputText
              value={factoryForm.name}
              onChange={(event) => setFactoryForm((prev) => ({ ...prev, name: event.target.value }))}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            City
            <InputText
              value={factoryForm.city}
              onChange={(event) => setFactoryForm((prev) => ({ ...prev, city: event.target.value }))}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Status
            <SelectButton
              value={factoryForm.isActive}
              options={statusOptions}
              onChange={(event) => setFactoryForm((prev) => ({ ...prev, isActive: Boolean(event.value) }))}
              optionLabel="label"
              optionValue="value"
            />
          </label>

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" label="Cancel" text onClick={closeFactoryDialog} disabled={factoryActionLoading} />
            <Button
              type="button"
              label={factoryFormMode === 'create' ? 'Create' : 'Save'}
              loading={factoryActionLoading}
              onClick={() => void submitFactoryForm()}
            />
          </div>
        </div>
      </Dialog>

      <Dialog
        header={facilityFormMode === 'create' ? 'New Facility' : 'Edit Facility'}
        visible={facilityDialogOpen}
        style={{ width: '30rem' }}
        onHide={closeFacilityDialog}
      >
        <div className="space-y-3">
          {facilityFormError ? <Message severity="error" text={facilityFormError} /> : null}

          <label className="flex flex-col gap-1 text-sm">
            Factory
            <select
              value={facilityForm.factoryId ?? ''}
              onChange={(event) =>
                setFacilityForm((prev) => ({
                  ...prev,
                  factoryId: event.target.value ? Number(event.target.value) : undefined
                }))
              }
              className="rounded-md border border-slate-300 px-3 py-2"
            >
              <option value="">Select factory</option>
              {activeFactories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} - {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Facility Code
            <InputText
              value={facilityForm.code}
              onChange={(event) => setFacilityForm((prev) => ({ ...prev, code: event.target.value }))}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Facility Name
            <InputText
              value={facilityForm.name}
              onChange={(event) => setFacilityForm((prev) => ({ ...prev, name: event.target.value }))}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            City
            <InputText
              value={facilityForm.city}
              onChange={(event) => setFacilityForm((prev) => ({ ...prev, city: event.target.value }))}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Status
            <SelectButton
              value={facilityForm.isActive}
              options={statusOptions}
              onChange={(event) => setFacilityForm((prev) => ({ ...prev, isActive: Boolean(event.value) }))}
              optionLabel="label"
              optionValue="value"
            />
          </label>

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" label="Cancel" text onClick={closeFacilityDialog} disabled={facilityActionLoading} />
            <Button
              type="button"
              label={facilityFormMode === 'create' ? 'Create' : 'Save'}
              loading={facilityActionLoading}
              onClick={() => void submitFacilityForm()}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
