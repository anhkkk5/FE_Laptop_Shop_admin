import api from "./api";

export type PaymentMethod = "cod" | "vietqr" | "momo";
export type PaymentStatus = "pending" | "success" | "failed";

export interface Payment {
  id: number;
  orderId: number;
  userId: number;
  method: PaymentMethod;
  amount: number;
  status: PaymentStatus;
  transactionCode: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export const paymentService = {
  async getByOrderId(orderId: number): Promise<Payment> {
    const res = await api.get(`/admin/payments/${orderId}`);
    return res.data.data;
  },

  async simulateSuccess(orderId: number): Promise<Payment> {
    const res = await api.post(`/admin/payments/simulate/${orderId}/success`);
    return res.data.data;
  },

  async simulateFailed(orderId: number): Promise<Payment> {
    const res = await api.post(`/admin/payments/simulate/${orderId}/failed`);
    return res.data.data;
  },
};
