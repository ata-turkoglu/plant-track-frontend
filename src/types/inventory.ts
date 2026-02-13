export interface Product {
  id: number;
  sku: string;
  name: string;
  unit: string;
  category: string | null;
  barcode: string | null;
  minStock: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  stockQuantity?: number;
}

export interface Warehouse {
  id: number;
  name: string;
  code: string;
  createdAt: string;
  updatedAt: string;
}

export interface Business {
  id: number;
  code: string;
  name: string;
  city: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: number;
  code: string;
  name: string;
  city: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationUnit {
  id: number;
  organizationId: number;
  organizationCode: string | null;
  organizationName: string | null;
  parentUnitId: number | null;
  parentCode: string | null;
  parentName: string | null;
  code: string;
  name: string;
  kind: string | null;
  city: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Factory {
  id: number;
  businessId: number;
  businessCode: string | null;
  businessName: string | null;
  code: string;
  name: string;
  city: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Facility {
  id: number;
  businessId: number;
  businessCode: string | null;
  businessName: string | null;
  factoryId: number;
  factoryCode: string | null;
  factoryName: string | null;
  code: string;
  name: string;
  city: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StockItem {
  productId: number;
  warehouseId?: number;
  sku: string;
  name: string;
  quantity: number;
  unit?: string;
  updatedAt: string | null;
}

export interface StockTransaction {
  id: number;
  productId: number;
  warehouseId: number;
  type: 'IN' | 'OUT' | 'TRANSFER' | 'ADJUST';
  direction: 'IN' | 'OUT';
  quantity: number;
  unit: string;
  referenceType: string | null;
  referenceId: string | null;
  note: string | null;
  createdBy: string;
  createdAt: string;
  productSku: string | null;
  productName: string | null;
  warehouseCode: string | null;
  warehouseName: string | null;
}

export interface OnHandRow {
  productId: number;
  warehouseId: number;
  quantityOnHand: number;
}

export interface CreateStockTransactionPayload {
  productId: number;
  warehouseId: number;
  type: 'IN' | 'OUT' | 'ADJUST';
  quantity: number;
  direction?: 'IN' | 'OUT';
  referenceType?: string;
  referenceId?: string;
  note?: string;
}

export interface CreateTransferPayload {
  productId: number;
  sourceWarehouseId: number;
  destinationWarehouseId: number;
  quantity: number;
  referenceType?: string;
  referenceId?: string;
  note?: string;
}

export interface ApiErrorPayload {
  error?: {
    message?: string;
  };
  message?: string;
}
