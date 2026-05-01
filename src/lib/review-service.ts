import api from "./api";

export interface Review {
  id: number;
  productId: number;
  userId: number;
  orderItemId: number;
  rating: number;
  comment: string | null;
  images: string[] | null;
  isVerified: boolean;
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

export interface ReviewSummary {
  total: number;
  verified: number;
  averageRating: number;
  byRating: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export const reviewService = {
  async getSummary(): Promise<ReviewSummary> {
    const res = await api.get("/admin/reviews/summary");
    return res.data.data;
  },

  async getAll(page: number = 1, limit: number = 20): Promise<PaginatedResult<Review>> {
    const res = await api.get("/admin/reviews", { params: { page, limit } });
    return res.data.data;
  },

  async remove(id: number): Promise<void> {
    await api.delete(`/admin/reviews/${id}`);
  },
};
