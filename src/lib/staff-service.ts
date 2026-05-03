import api from "./api";

export interface StaffUser {
  id: number;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export interface StaffListResponse {
  data: StaffUser[];
  total: number;
  page: number;
  limit: number;
}

export interface UpdateStaffDto {
  fullName?: string;
  role?: string;
  isActive?: boolean;
}

export const staffService = {
  async getAll(options?: {
    role?: string;
    page?: number;
    limit?: number;
  }): Promise<StaffListResponse> {
    const params = new URLSearchParams();
    if (options?.role) params.set("role", options.role);
    if (options?.page) params.set("page", String(options.page));
    if (options?.limit) params.set("limit", String(options.limit));
    const qs = params.toString();
    const { data } = await api.get(`/admin/users${qs ? `?${qs}` : ""}`);
    return data;
  },

  async getById(id: number): Promise<StaffUser> {
    const { data } = await api.get(`/admin/users/${id}`);
    return data.data;
  },

  async update(id: number, dto: UpdateStaffDto): Promise<StaffUser> {
    const { data } = await api.patch(`/admin/users/${id}`, dto);
    return data.data;
  },
};
