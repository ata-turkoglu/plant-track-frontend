import { api, API_PREFIX } from './api';
import type {
  Business,
  CreateStockTransactionPayload,
  CreateTransferPayload,
  Facility,
  Factory,
  Organization,
  OrganizationUnit,
  OnHandRow,
  Product,
  StockTransaction,
  Warehouse
} from '../types/inventory';

interface ApiEnvelope<T> {
  data: T;
}

const unwrap = <T>(payload: T | ApiEnvelope<T>): T => {
  if (payload && typeof payload === 'object' && 'data' in (payload as ApiEnvelope<T>)) {
    return (payload as ApiEnvelope<T>).data;
  }
  return payload as T;
};

export const inventoryApi = {
  async listOrganizations(): Promise<Organization[]> {
    const response = await api.get<Organization[] | ApiEnvelope<Organization[]>>(`${API_PREFIX}/organizations`);
    return unwrap(response.data);
  },

  async createOrganization(payload: {
    code: string;
    name: string;
    city?: string;
    isActive?: boolean;
  }): Promise<Organization> {
    const response = await api.post<Organization | ApiEnvelope<Organization>>(`${API_PREFIX}/organizations`, payload);
    return unwrap(response.data);
  },

  async updateOrganization(
    id: number,
    payload: { code?: string; name?: string; city?: string; isActive?: boolean }
  ): Promise<Organization> {
    const response = await api.patch<Organization | ApiEnvelope<Organization>>(
      `${API_PREFIX}/organizations/${id}`,
      payload
    );
    return unwrap(response.data);
  },

  async deactivateOrganization(id: number): Promise<Organization> {
    const response = await api.delete<Organization | ApiEnvelope<Organization>>(`${API_PREFIX}/organizations/${id}`);
    return unwrap(response.data);
  },

  async listOrganizationUnits(): Promise<OrganizationUnit[]> {
    const response = await api.get<OrganizationUnit[] | ApiEnvelope<OrganizationUnit[]>>(
      `${API_PREFIX}/organization-units`
    );
    return unwrap(response.data);
  },

  async createOrganizationUnit(payload: {
    organizationId: number;
    parentUnitId?: number | null;
    code: string;
    name: string;
    kind?: string;
    city?: string;
    isActive?: boolean;
  }): Promise<OrganizationUnit> {
    const response = await api.post<OrganizationUnit | ApiEnvelope<OrganizationUnit>>(
      `${API_PREFIX}/organization-units`,
      payload
    );
    return unwrap(response.data);
  },

  async updateOrganizationUnit(
    id: number,
    payload: {
      organizationId?: number;
      parentUnitId?: number | null;
      code?: string;
      name?: string;
      kind?: string;
      city?: string;
      isActive?: boolean;
    }
  ): Promise<OrganizationUnit> {
    const response = await api.patch<OrganizationUnit | ApiEnvelope<OrganizationUnit>>(
      `${API_PREFIX}/organization-units/${id}`,
      payload
    );
    return unwrap(response.data);
  },

  async deactivateOrganizationUnit(id: number): Promise<OrganizationUnit> {
    const response = await api.delete<OrganizationUnit | ApiEnvelope<OrganizationUnit>>(
      `${API_PREFIX}/organization-units/${id}`
    );
    return unwrap(response.data);
  },

  async listBusinesses(): Promise<Business[]> {
    const response = await api.get<Business[] | ApiEnvelope<Business[]>>(`${API_PREFIX}/businesses`);
    return unwrap(response.data);
  },

  async createBusiness(payload: { code: string; name: string; city?: string; isActive?: boolean }): Promise<Business> {
    const response = await api.post<Business | ApiEnvelope<Business>>(`${API_PREFIX}/businesses`, payload);
    return unwrap(response.data);
  },

  async updateBusiness(
    id: number,
    payload: { code?: string; name?: string; city?: string; isActive?: boolean }
  ): Promise<Business> {
    const response = await api.patch<Business | ApiEnvelope<Business>>(`${API_PREFIX}/businesses/${id}`, payload);
    return unwrap(response.data);
  },

  async deactivateBusiness(id: number): Promise<Business> {
    const response = await api.delete<Business | ApiEnvelope<Business>>(`${API_PREFIX}/businesses/${id}`);
    return unwrap(response.data);
  },

  async listFactories(): Promise<Factory[]> {
    const response = await api.get<Factory[] | ApiEnvelope<Factory[]>>(`${API_PREFIX}/factories`);
    return unwrap(response.data);
  },

  async createFactory(payload: {
    businessId: number;
    code: string;
    name: string;
    city?: string;
    isActive?: boolean;
  }): Promise<Factory> {
    const response = await api.post<Factory | ApiEnvelope<Factory>>(`${API_PREFIX}/factories`, payload);
    return unwrap(response.data);
  },

  async updateFactory(
    id: number,
    payload: { businessId?: number; code?: string; name?: string; city?: string; isActive?: boolean }
  ): Promise<Factory> {
    const response = await api.patch<Factory | ApiEnvelope<Factory>>(`${API_PREFIX}/factories/${id}`, payload);
    return unwrap(response.data);
  },

  async deactivateFactory(id: number): Promise<Factory> {
    const response = await api.delete<Factory | ApiEnvelope<Factory>>(`${API_PREFIX}/factories/${id}`);
    return unwrap(response.data);
  },

  async listFacilities(): Promise<Facility[]> {
    const response = await api.get<Facility[] | ApiEnvelope<Facility[]>>(`${API_PREFIX}/facilities`);
    return unwrap(response.data);
  },

  async createFacility(payload: {
    factoryId: number;
    code: string;
    name: string;
    city?: string;
    isActive?: boolean;
  }): Promise<Facility> {
    const response = await api.post<Facility | ApiEnvelope<Facility>>(`${API_PREFIX}/facilities`, payload);
    return unwrap(response.data);
  },

  async updateFacility(
    id: number,
    payload: { factoryId?: number; code?: string; name?: string; city?: string; isActive?: boolean }
  ): Promise<Facility> {
    const response = await api.patch<Facility | ApiEnvelope<Facility>>(`${API_PREFIX}/facilities/${id}`, payload);
    return unwrap(response.data);
  },

  async deactivateFacility(id: number): Promise<Facility> {
    const response = await api.delete<Facility | ApiEnvelope<Facility>>(`${API_PREFIX}/facilities/${id}`);
    return unwrap(response.data);
  },

  // Backward compatible plant aliases.
  async listPlants(): Promise<Facility[]> {
    return this.listFacilities();
  },

  async createPlant(payload: {
    businessId?: number;
    factoryId?: number;
    code: string;
    name: string;
    city?: string;
    isActive?: boolean;
  }): Promise<Facility> {
    const response = await api.post<Facility | ApiEnvelope<Facility>>(`${API_PREFIX}/plants`, payload);
    return unwrap(response.data);
  },

  async updatePlant(
    id: number,
    payload: {
      businessId?: number;
      factoryId?: number;
      code?: string;
      name?: string;
      city?: string;
      isActive?: boolean;
    }
  ): Promise<Facility> {
    const response = await api.patch<Facility | ApiEnvelope<Facility>>(`${API_PREFIX}/plants/${id}`, payload);
    return unwrap(response.data);
  },

  async deactivatePlant(id: number): Promise<Facility> {
    const response = await api.delete<Facility | ApiEnvelope<Facility>>(`${API_PREFIX}/plants/${id}`);
    return unwrap(response.data);
  },

  async listProducts(): Promise<Product[]> {
    const response = await api.get<Product[] | ApiEnvelope<Product[]>>(`${API_PREFIX}/products`);
    return unwrap(response.data);
  },

  async listWarehouses(): Promise<Warehouse[]> {
    const response = await api.get<Warehouse[] | ApiEnvelope<Warehouse[]>>(`${API_PREFIX}/warehouses`);
    return unwrap(response.data);
  },

  async createTransaction(payload: CreateStockTransactionPayload) {
    const response = await api.post(`${API_PREFIX}/stock/transactions`, payload);
    return response.data;
  },

  async createTransfer(payload: CreateTransferPayload) {
    const response = await api.post(`${API_PREFIX}/stock/transfers`, payload);
    return response.data;
  },

  async getOnHand(params: { productId?: number; warehouseId?: number }): Promise<OnHandRow[]> {
    const response = await api.get<OnHandRow[] | ApiEnvelope<OnHandRow[]>>(`${API_PREFIX}/stock/on-hand`, {
      params
    });
    return unwrap(response.data);
  },

  async getLedger(params: {
    productId?: number;
    warehouseId?: number;
    from?: string;
    to?: string;
  }): Promise<StockTransaction[]> {
    const response = await api.get<StockTransaction[] | ApiEnvelope<StockTransaction[]>>(
      `${API_PREFIX}/stock/ledger`,
      { params }
    );
    return unwrap(response.data);
  }
};
