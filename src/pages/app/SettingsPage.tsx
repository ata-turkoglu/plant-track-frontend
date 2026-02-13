import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { SelectButton } from 'primereact/selectbutton';
import { TabMenu } from 'primereact/tabmenu';
import type { MenuItem } from 'primereact/menuitem';
import type { TreeNode } from 'primereact/treenode';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  authApi,
  type AuthUser,
  type CreateUserPayload,
  type UpdateUserPayload,
  type UserRole
} from '../../services/authApi';
import { inventoryApi } from '../../services/inventoryApi';
import type { Organization, OrganizationUnit, Product, Warehouse } from '../../types/inventory';

export interface MachineRow {
  id: string;
  code: string;
  name: string;
  organizationUnitCode: string;
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

interface OrganizationFormState {
  id?: number;
  code: string;
  name: string;
  city: string;
  isActive: boolean;
}

type SettingsTabKey = 'users' | 'organizations' | 'warehouses' | 'machines' | 'products';

export interface SettingsOutletContextValue {
  users: AuthUser[];
  organizations: Organization[];
  organizationUnits: OrganizationUnit[];
  warehouses: Warehouse[];
  machines: MachineRow[];
  products: Product[];
  loading: boolean;
  userTabError: string | null;
  organizationTabError: string | null;
  canManageUsers: boolean;
  canManageOrganizations: boolean;
  userActionLoading: boolean;
  organizationActionLoading: boolean;
  selectedOrganization: Organization | null;
  organizationChartNodes: TreeNode[];
  openCreateUserDialog: () => void;
  openEditUserDialog: (user: AuthUser) => void;
  deactivateUser: (user: AuthUser) => Promise<void>;
  openCreateOrganizationDialog: () => void;
  openEditOrganizationDialog: (organization: Organization) => void;
  deactivateOrganization: (organization: Organization) => Promise<void>;
  clearOrganizationSelection: () => void;
  onOrganizationNodeSelect: (organizationId: number) => void;
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

const initialOrganizationForm: OrganizationFormState = {
  code: '',
  name: '',
  city: '',
  isActive: true
};

const initialMachines: MachineRow[] = [
  {
    id: '1',
    code: 'MCH-JAW-01',
    name: 'Ceneli Kirici 1100x850',
    organizationUnitCode: 'UNIT-KVZ-FCL-01',
    status: 'running'
  },
  {
    id: '2',
    code: 'MCH-CONE-01',
    name: 'Konik Kirici HP300',
    organizationUnitCode: 'UNIT-KVZ-FCL-01',
    status: 'maintenance'
  },
  {
    id: '3',
    code: 'MCH-SCR-02',
    name: 'Titresimli Elek 4 Katli',
    organizationUnitCode: 'UNIT-KVZ-FCL-01',
    status: 'running'
  }
];

function errorMessage(error: unknown): string {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? error.message;
  }
  return 'Islem tamamlanamadi.';
}

export function SettingsPage(): React.JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationUnits, setOrganizationUnits] = useState<OrganizationUnit[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [machines] = useState<MachineRow[]>(initialMachines);
  const [products, setProducts] = useState<Product[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userTabError, setUserTabError] = useState<string | null>(null);
  const [organizationTabError, setOrganizationTabError] = useState<string | null>(null);

  const [canManageUsers, setCanManageUsers] = useState(true);
  const [canManageOrganizations, setCanManageOrganizations] = useState(true);

  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [userFormMode, setUserFormMode] = useState<'create' | 'edit'>('create');
  const [userForm, setUserForm] = useState<UserFormState>(initialUserForm);
  const [userFormError, setUserFormError] = useState<string | null>(null);
  const [userActionLoading, setUserActionLoading] = useState(false);

  const [organizationDialogOpen, setOrganizationDialogOpen] = useState(false);
  const [organizationFormMode, setOrganizationFormMode] = useState<'create' | 'edit'>('create');
  const [organizationForm, setOrganizationForm] = useState<OrganizationFormState>(initialOrganizationForm);
  const [organizationFormError, setOrganizationFormError] = useState<string | null>(null);
  const [organizationActionLoading, setOrganizationActionLoading] = useState(false);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<number | null>(null);

  const organizationChartNodes = useMemo<TreeNode[]>(() => {
    const unitsByParent = new Map<number | null, OrganizationUnit[]>();
    organizationUnits.forEach((unit) => {
      const key = unit.parentUnitId ?? null;
      const list = unitsByParent.get(key) ?? [];
      list.push(unit);
      unitsByParent.set(key, list);
    });

    const buildUnitNode = (unit: OrganizationUnit): TreeNode => {
      const children = (unitsByParent.get(unit.id) ?? [])
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(buildUnitNode);

      return {
        key: `unit-${unit.id}`,
        id: `unit-${unit.id}`,
        label: `${unit.code} - ${unit.name}`,
        expanded: true,
        data: {
          type: 'unit',
          unitId: unit.id,
          organizationId: unit.organizationId,
          kind: unit.kind ?? 'UNIT'
        },
        style: {
          cursor: 'pointer',
          borderRadius: '8px',
          boxShadow: '0 0 10px -5px grey',
          border: 'grey'
        },
        children
      };
    };

    return organizations
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((organization) => {
        const roots = organizationUnits
          .filter((unit) => unit.organizationId === organization.id && unit.parentUnitId === null)
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(buildUnitNode);

        return {
          key: `org-${organization.id}`,
          id: `org-${organization.id}`,
          label: `${organization.code} - ${organization.name}`,
          expanded: true,
          data: {
            type: 'organization',
            organizationId: organization.id
          },
          style: {
            cursor: 'pointer',
            borderRadius: '8px',
            background: 'white',
            boxShadow: '0 0 10px -5px grey',
            border: 'grey',
            fontWeight: '500'
          },
          children: roots
        } as TreeNode;
      });
  }, [organizationUnits, organizations]);

  const selectedOrganization = useMemo(
    () => organizations.find((item) => item.id === selectedOrganizationId) ?? null,
    [organizations, selectedOrganizationId]
  );

  const tabKeys: SettingsTabKey[] = ['users', 'organizations', 'warehouses', 'machines', 'products'];
  const activeTabKey = (location.pathname.split('/').pop() as SettingsTabKey) || 'users';
  const activeTabIndex = Math.max(tabKeys.indexOf(activeTabKey), 0);

  const tabItems = useMemo<MenuItem[]>(
    () => [
      { label: `User (${users.length})` },
      { label: `Organization (${organizations.length})` },
      { label: `Warehouse (${warehouses.length})` },
      { label: `Machine (${machines.length})` },
      { label: `Product (${products.length})` }
    ],
    [users.length, organizations.length, warehouses.length, machines.length, products.length]
  );

  const loadData = async () => {
    setLoading(true);
    setError(null);
    setUserTabError(null);
    setOrganizationTabError(null);

    const [usersResult, organizationsResult, organizationUnitsResult, warehouseResult, productResult] =
      await Promise.allSettled([
        authApi.listUsers(1, 100),
        inventoryApi.listOrganizations(),
        inventoryApi.listOrganizationUnits(),
        inventoryApi.listWarehouses(),
        inventoryApi.listProducts()
      ]);

    if (usersResult.status === 'fulfilled') {
      setUsers(usersResult.value.data);
      setCanManageUsers(true);
      setCanManageOrganizations(true);
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
      setCanManageOrganizations(false);
    }

    if (organizationsResult.status === 'fulfilled') {
      setOrganizations(organizationsResult.value);
    } else {
      setOrganizations([]);
      setOrganizationTabError(errorMessage(organizationsResult.reason));
    }

    if (organizationUnitsResult.status === 'fulfilled') {
      setOrganizationUnits(organizationUnitsResult.value);
    } else {
      setOrganizationUnits([]);
    }

    if (warehouseResult.status === 'fulfilled') {
      setWarehouses(warehouseResult.value);
    }

    if (productResult.status === 'fulfilled') {
      setProducts(productResult.value);
    }

    if (
      usersResult.status === 'rejected' &&
      organizationsResult.status === 'rejected' &&
      organizationUnitsResult.status === 'rejected' &&
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

  const openCreateOrganizationDialog = () => {
    setOrganizationFormMode('create');
    setOrganizationForm(initialOrganizationForm);
    setOrganizationFormError(null);
    setOrganizationDialogOpen(true);
  };

  const openEditOrganizationDialog = (organization: Organization) => {
    setOrganizationFormMode('edit');
    setOrganizationForm({
      id: organization.id,
      code: organization.code,
      name: organization.name,
      city: organization.city ?? '',
      isActive: organization.isActive
    });
    setOrganizationFormError(null);
    setOrganizationDialogOpen(true);
  };

  const closeOrganizationDialog = () => {
    if (!organizationActionLoading) {
      setOrganizationDialogOpen(false);
      setOrganizationFormError(null);
    }
  };

  const submitOrganizationForm = async () => {
    setOrganizationFormError(null);

    const code = organizationForm.code.trim();
    const name = organizationForm.name.trim();
    const city = organizationForm.city.trim();

    if (!code || !name) {
      setOrganizationFormError('Organization code ve name zorunlu.');
      return;
    }

    setOrganizationActionLoading(true);
    try {
      if (organizationFormMode === 'create') {
        await inventoryApi.createOrganization({
          code,
          name,
          city: city || undefined,
          isActive: organizationForm.isActive
        });
      } else {
        if (!organizationForm.id) {
          setOrganizationFormError('Guncellenecek organization bulunamadi.');
          return;
        }
        await inventoryApi.updateOrganization(organizationForm.id, {
          code,
          name,
          city: city || undefined,
          isActive: organizationForm.isActive
        });
      }

      setOrganizationDialogOpen(false);
      await loadData();
    } catch (requestError) {
      setOrganizationFormError(errorMessage(requestError));
    } finally {
      setOrganizationActionLoading(false);
    }
  };

  const deactivateOrganization = async (organization: Organization) => {
    if (!organization.isActive) {
      return;
    }

    if (!window.confirm(`${organization.code} organization kaydini pasif yapmak istiyor musun?`)) {
      return;
    }

    setOrganizationActionLoading(true);
    try {
      await inventoryApi.deactivateOrganization(organization.id);
      await loadData();
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setOrganizationActionLoading(false);
    }
  };

  const outletContextValue: SettingsOutletContextValue = {
    users,
    organizations,
    organizationUnits,
    warehouses,
    machines,
    products,
    loading,
    userTabError,
    organizationTabError,
    canManageUsers,
    canManageOrganizations,
    userActionLoading,
    organizationActionLoading,
    selectedOrganization,
    organizationChartNodes,
    openCreateUserDialog,
    openEditUserDialog,
    deactivateUser,
    openCreateOrganizationDialog,
    openEditOrganizationDialog,
    deactivateOrganization,
    clearOrganizationSelection: () => setSelectedOrganizationId(null),
    onOrganizationNodeSelect: (organizationId: number) => setSelectedOrganizationId(organizationId)
  };

  return (
    <>
      <section>
          {error ? <Message severity="error" text={error} className="mb-4" /> : null}
          <TabMenu
            model={tabItems}
            activeIndex={activeTabIndex}
            onTabChange={(event) => navigate(`/settings/${tabKeys[event.index]}`)}
            className="mb-4"
          />
          <Outlet context={outletContextValue} />
      </section>

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
              size="small"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              First Name
              <InputText
                value={userForm.firstName}
                onChange={(event) => setUserForm((prev) => ({ ...prev, firstName: event.target.value }))}
                size="small"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              Last Name
              <InputText
                value={userForm.lastName}
                onChange={(event) => setUserForm((prev) => ({ ...prev, lastName: event.target.value }))}
                size="small"
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
                size="small"
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
            <Button type="button" label="Cancel" text size="small" onClick={closeUserDialog} disabled={userActionLoading} />
            <Button
              type="button"
              label={userFormMode === 'create' ? 'Create' : 'Save'}
              size="small"
              loading={userActionLoading}
              onClick={() => void submitUserForm()}
            />
          </div>
        </div>
      </Dialog>

      <Dialog
        header={organizationFormMode === 'create' ? 'New Organization' : 'Edit Organization'}
        visible={organizationDialogOpen}
        style={{ width: '30rem' }}
        onHide={closeOrganizationDialog}
      >
        <div className="space-y-3">
          {organizationFormError ? <Message severity="error" text={organizationFormError} /> : null}

          <label className="flex flex-col gap-1 text-sm">
            Organization Code
            <InputText
              value={organizationForm.code}
              onChange={(event) => setOrganizationForm((prev) => ({ ...prev, code: event.target.value }))}
              size="small"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Organization Name
            <InputText
              value={organizationForm.name}
              onChange={(event) => setOrganizationForm((prev) => ({ ...prev, name: event.target.value }))}
              size="small"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            City
            <InputText
              value={organizationForm.city}
              onChange={(event) => setOrganizationForm((prev) => ({ ...prev, city: event.target.value }))}
              size="small"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Status
            <SelectButton
              value={organizationForm.isActive}
              options={statusOptions}
              onChange={(event) => setOrganizationForm((prev) => ({ ...prev, isActive: Boolean(event.value) }))}
              optionLabel="label"
              optionValue="value"
            />
          </label>

          <div className="mt-2 flex justify-end gap-2">
            <Button
              type="button"
              label="Cancel"
              text
              size="small"
              onClick={closeOrganizationDialog}
              disabled={organizationActionLoading}
            />
            <Button
              type="button"
              label={organizationFormMode === 'create' ? 'Create' : 'Save'}
              size="small"
              loading={organizationActionLoading}
              onClick={() => void submitOrganizationForm()}
            />
          </div>
        </div>
      </Dialog>
    </>
  );
}
