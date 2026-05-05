import api from "./api";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "ready_to_ship"
  | "shipping"
  | "delivered"
  | "completed"
  | "refunded"
  | "cancelled";

export interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  productImage: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface Order {
  id: number;
  userId: number;
  orderCode: string;
  status: OrderStatus;
  customerName: string;
  customerPhone: string;
  shippingAddress: string;
  paymentMethod: string;
  subtotal: number;
  shippingFee: number;
  discountAmount: number;
  total: number;
  note: string | null;
  createdAt: string;
  items: OrderItem[];
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

export interface OrderQuery {
  page?: number;
  limit?: number;
}

export const orderService = {
  async getAll(params?: OrderQuery): Promise<PaginatedResult<Order>> {
    const res = await api.get("/admin/orders", { params });
    return res.data.data;
  },

  async getById(id: number): Promise<Order> {
    const res = await api.get(`/admin/orders/${id}`);
    return res.data.data;
  },

  async updateStatus(id: number, status: OrderStatus): Promise<void> {
    await api.patch(`/admin/orders/${id}/status`, { status });
  },
};
