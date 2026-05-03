import api from "./api";

export interface StaffUser {
  id: number;
  email: string;
  fullName: string;
  phone: string | null;
  avatar: string | null;
  role: string;
  isVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface StaffListResponse {
  data: StaffUser[];
  total: number;
  page: number;
  limit: number;
}

type StaffApiPayload =
  | StaffUser[]
  | {
      data?:
        | StaffUser[]
        | { data?: StaffUser[]; meta?: Partial<StaffListResponse> };
      meta?: Partial<StaffListResponse>;
      total?: number;
      page?: number;
      limit?: number;
    };

function normalizeStaffListResponse(
  payload: StaffApiPayload,
): StaffListResponse {
  const data = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.data?.data)
        ? payload.data.data
        : [];

  const meta =
    !Array.isArray(payload) && payload?.meta
      ? payload.meta
      : !Array.isArray(payload) && !Array.isArray(payload?.data)
        ? payload?.data?.meta
        : undefined;

  return {
    data,
    total: Number(
      meta?.total ??
        (!Array.isArray(payload) ? payload?.total : undefined) ??
        data.length,
    ),
    page: Number(
      meta?.page ?? (!Array.isArray(payload) ? payload?.page : undefined) ?? 1,
    ),
    limit: Number(
      (meta?.limit ??
        (!Array.isArray(payload) ? payload?.limit : undefined) ??
        data.length) ||
        1,
    ),
  };
}

export interface UpdateStaffDto {
  fullName?: string;
  phone?: string;
  avatar?: string;
  role?: string;
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
    const { data } = await api.get<StaffApiPayload>(
      `/admin/users${qs ? `?${qs}` : ""}`,
    );
    return normalizeStaffListResponse(data);
  },

  async getById(id: number): Promise<StaffUser> {
    const { data } = await api.get(`/admin/users/${id}`);
    return data?.data ?? data;
  },

  async update(id: number, dto: UpdateStaffDto): Promise<StaffUser> {
    const { data } = await api.patch(`/admin/users/${id}`, dto);
    return data?.data ?? data;
  },
};
