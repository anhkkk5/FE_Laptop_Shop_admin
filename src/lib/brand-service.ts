import api from "./api";

export interface Brand {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  website: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBrandPayload {
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  website?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export type UpdateBrandPayload = Partial<CreateBrandPayload>;

export const brandService = {
  async getAll(): Promise<Brand[]> {
    const res = await api.get("/admin/brands");
    return res.data.data;
  },

  async getById(id: number): Promise<Brand> {
    const res = await api.get(`/admin/brands/${id}`);
    return res.data.data;
  },

  async create(data: CreateBrandPayload): Promise<Brand> {
    const res = await api.post("/admin/brands", data);
    return res.data.data;
  },

  async update(id: number, data: UpdateBrandPayload): Promise<void> {
    await api.put(`/admin/brands/${id}`, data);
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/admin/brands/${id}`);
  },
};
