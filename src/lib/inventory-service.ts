import api from "./api";

export interface InventoryItem {
  id: number;
  productId: number;
  productName?: string;
  product?: {
    id: number;
    name: string;
  };
  availableQty: number;
  reservedQty: number;
  damagedQty: number;
  incomingQty: number;
  updatedAt: string;
}

function normalizeInventoryItem(item: InventoryItem): InventoryItem {
  if (item.productName) {
    return item;
  }

  const nestedName = item.product?.name?.trim();
  if (!nestedName) {
    return item;
  }

  return {
    ...item,
    productName: nestedName,
  };
}

export interface StockMovement {
  id: number;
  productId: number;
  type: string;
  quantity: number;
  beforeQty: number;
  afterQty: number;
  reason: string | null;
  reference: string | null;
  createdAt: string;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
}

export const inventoryService = {
  async getAll(page = 1, limit = 20): Promise<PaginatedResult<InventoryItem>> {
    const res = await api.get<ApiResponse<PaginatedResult<InventoryItem>>>(
      "/inventory",
      {
        params: { page, limit },
      },
    );
    return {
      ...res.data.data,
      data: res.data.data.data.map(normalizeInventoryItem),
    };
  },

  async getLowStock(threshold = 10): Promise<InventoryItem[]> {
    const res = await api.get<ApiResponse<InventoryItem[]>>(
      "/inventory/low-stock",
      {
        params: { threshold },
      },
    );
    return res.data.data.map(normalizeInventoryItem);
  },

  async getProductInventory(productId: number): Promise<InventoryItem> {
    const res = await api.get<ApiResponse<InventoryItem>>(
      `/inventory/product/${productId}`,
    );
    return normalizeInventoryItem(res.data.data);
  },

  async getProductMovements(
    productId: number,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResult<StockMovement>> {
    const res = await api.get<ApiResponse<PaginatedResult<StockMovement>>>(
      `/inventory/product/${productId}/movements`,
      {
        params: { page, limit },
      },
    );
    return res.data.data;
  },

  async importStock(productId: number, quantity: number, reason?: string) {
    const res = await api.post<ApiResponse<InventoryItem>>(
      "/inventory/import",
      {
        productId,
        quantity,
        reason,
      },
    );
    return res.data.data;
  },

  async exportStock(productId: number, quantity: number, reason?: string) {
    const res = await api.post<ApiResponse<InventoryItem>>(
      "/inventory/export",
      {
        productId,
        quantity,
        reason,
      },
    );
    return res.data.data;
  },

  async adjustStock(
    productId: number,
    quantity: number,
    target: "available" | "damaged" | "incoming",
    reason?: string,
  ) {
    const res = await api.post<ApiResponse<InventoryItem>>(
      "/inventory/adjust",
      {
        productId,
        quantity,
        target,
        reason,
      },
    );
    return res.data.data;
  },
};
