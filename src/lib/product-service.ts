import api from "./api";
import type { Category } from "./category-service";
import type { Brand } from "./brand-service";

export interface ProductImage {
  id?: number;
  url: string;
  alt?: string;
  isPrimary?: boolean;
  sortOrder?: number;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  price: number;
  salePrice: number | null;
  sku: string | null;
  stockQuantity: number;
  categoryId: number | null;
  brandId: number | null;
  sellerId: number | null;
  status: string;
  specs: Record<string, string> | null;
  isFeatured: boolean;
  viewCount: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  category: Category | null;
  brand: Brand | null;
  images: ProductImage[];
}

export interface ProductQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: number;
  brandId?: number;
  status?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
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

export interface InventorySummary {
  totalProducts: number;
  outOfStock: number;
  lowStock: number;
  totalAlerts: number;
  outOfStockRate: number;
  lowStockRate: number;
  alertRate: number;
  lowStockThreshold: number;
  generatedAt: string;
}

export interface CreateProductPayload {
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  price: number;
  salePrice?: number;
  sku?: string;
  stockQuantity?: number;
  categoryId?: number;
  brandId?: number;
  sellerId?: number;
  status?: string;
  specs?: Record<string, string>;
  isFeatured?: boolean;
  sortOrder?: number;
  images?: ProductImage[];
}

export type UpdateProductPayload = Partial<CreateProductPayload>;

export const productService = {
  async getAll(params?: ProductQueryParams): Promise<PaginatedResult<Product>> {
    const res = await api.get("/admin/products", { params });
    return res.data.data;
  },

  async getById(id: number): Promise<Product> {
    const res = await api.get(`/admin/products/${id}`);
    return res.data.data;
  },

  async getInventorySummary(
    lowStockThreshold?: number,
  ): Promise<InventorySummary> {
    const params =
      lowStockThreshold && lowStockThreshold > 0
        ? { lowStockThreshold }
        : undefined;
    const res = await api.get("/admin/products/inventory-summary", { params });
    return res.data.data;
  },

  async create(data: CreateProductPayload): Promise<Product> {
    const res = await api.post("/admin/products", data);
    return res.data.data;
  },

  async update(id: number, data: UpdateProductPayload): Promise<void> {
    await api.put(`/admin/products/${id}`, data);
  },

  async uploadImages(files: File[]): Promise<string[]> {
    const formData = new FormData();
    for (const file of files) {
      formData.append("files", file);
    }

    const res = await api.post("/admin/products/upload-images", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    const imageUrls =
      (res.data?.data?.imageUrls as string[] | undefined) ||
      (res.data?.imageUrls as string[] | undefined) ||
      [];

    return imageUrls;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/admin/products/${id}`);
  },
};
