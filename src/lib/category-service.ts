import api from "./api";

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  parentId: number | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  children?: Category[];
  parent?: Category | null;
}

export interface CreateCategoryPayload {
  name: string;
  slug?: string;
  description?: string;
  image?: string;
  parentId?: number;
  sortOrder?: number;
  isActive?: boolean;
}

export type UpdateCategoryPayload = Partial<CreateCategoryPayload>;

export const categoryService = {
  async getAll(): Promise<Category[]> {
    const res = await api.get("/admin/categories");
    return res.data.data;
  },

  async getById(id: number): Promise<Category> {
    const res = await api.get(`/admin/categories/${id}`);
    return res.data.data;
  },

  async create(data: CreateCategoryPayload): Promise<Category> {
    const res = await api.post("/admin/categories", data);
    return res.data.data;
  },

  async update(id: number, data: UpdateCategoryPayload): Promise<void> {
    await api.put(`/admin/categories/${id}`, data);
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/admin/categories/${id}`);
  },
};
