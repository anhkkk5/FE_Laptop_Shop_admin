import api from "./api";

export type CouponDiscountType =
  | "fixed_amount"
  | "percentage"
  | "free_shipping"
  | "buy_x_get_y";

export interface Coupon {
  id: number;
  code: string;
  name: string;
  description: string | null;
  discountType: CouponDiscountType;
  discountValue: number;
  minOrderValue: number;
  maxDiscountAmount: number | null;
  usageLimit: number | null;
  usageCount: number;
  usageLimitPerUser: number | null;
  startAt: string | null;
  endAt: string | null;
  applicableProductIds: number[] | null;
  applicableCategoryIds: number[] | null;
  applicableBrandIds: number[] | null;
  firstTimeCustomerOnly: boolean;
  isStackable: boolean;
  priority: number;
  buyQuantity: number | null;
  getQuantity: number | null;
  isActive: boolean;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
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

export interface QueryCouponParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

export interface CreateCouponPayload {
  code: string;
  name: string;
  description?: string;
  discountType: CouponDiscountType;
  discountValue: number;
  minOrderValue?: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  usageLimitPerUser?: number;
  startAt?: string;
  endAt?: string;
  isActive?: boolean;
  applicableProductIds?: number[];
  applicableCategoryIds?: number[];
  applicableBrandIds?: number[];
  firstTimeCustomerOnly?: boolean;
  isStackable?: boolean;
  priority?: number;
  buyQuantity?: number;
  getQuantity?: number;
}

export type UpdateCouponPayload = Partial<CreateCouponPayload>;

export const couponService = {
  async getAll(
    params: QueryCouponParams = {},
  ): Promise<PaginatedResult<Coupon>> {
    const res = await api.get<ApiResponse<PaginatedResult<Coupon>>>(
      "/admin/coupons",
      {
        params,
      },
    );

    return res.data.data;
  },

  async getById(id: number): Promise<Coupon> {
    const res = await api.get<ApiResponse<Coupon>>(`/admin/coupons/${id}`);
    return res.data.data;
  },

  async create(data: CreateCouponPayload): Promise<Coupon> {
    const res = await api.post<ApiResponse<Coupon>>("/admin/coupons", data);
    return res.data.data;
  },

  async update(id: number, data: UpdateCouponPayload): Promise<Coupon> {
    const res = await api.patch<ApiResponse<Coupon>>(
      `/admin/coupons/${id}`,
      data,
    );
    return res.data.data;
  },

  async deactivate(id: number): Promise<void> {
    await api.delete(`/admin/coupons/${id}`);
  },
};
