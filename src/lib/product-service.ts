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
  status?: string;
  specs?: Record<string, string>;
  isFeatured?: boolean;
  sortOrder?: number;
  images?: ProductImage[];
}

export type UpdateProductPayload = Partial<CreateProductPayload>;

export const productService = {
  async getAll(
    params?: ProductQueryParams,
  ): Promise<PaginatedResult<Product>> {
    const res = await api.get("/admin/products", { params });
    return res.data.data;
  },

  async getById(id: number): Promise<Product> {
    const res = await api.get(`/admin/products/${id}`);
    return res.data.data;
  },

  async create(data: CreateProductPayload): Promise<Product> {
    const res = await api.post("/admin/products", data);
    return res.data.data;
  },

  async update(id: number, data: UpdateProductPayload): Promise<void> {
    await api.put(`/admin/products/${id}`, data);
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/admin/products/${id}`);
  },
};
