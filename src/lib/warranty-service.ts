import api from "./api";

export type WarrantyTicketStatus =
  | "pending"
  | "received"
  | "diagnosing"
  | "repairing"
  | "waiting_parts"
  | "completed"
  | "returned"
  | "rejected";

export type WarrantyPriority = "low" | "medium" | "high" | "urgent";

export interface WarrantyTicket {
  id: number;
  ticketCode: string;
  userId: number;
  orderId: number;
  orderItemId: number;
  productId: number;
  productName: string;
  status: WarrantyTicketStatus;
  priority: WarrantyPriority;
  issueDescription: string;
  diagnosis: string | null;
  resolution: string | null;
  assignedTo: number | null;
  estimatedDays: number | null;
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

export interface WarrantySummary {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  returned: number;
  rejected: number;
}

export const warrantyService = {
  async getSummary(): Promise<WarrantySummary> {
    const res = await api.get("/admin/warranty/summary");
    return res.data.data;
  },

  async getAll(page: number = 1, limit: number = 20): Promise<PaginatedResult<WarrantyTicket>> {
    const res = await api.get("/admin/warranty/all", { params: { page, limit } });
    return res.data.data;
  },

  async assign(ticketId: number, technicianId: number): Promise<WarrantyTicket> {
    const res = await api.patch(`/admin/warranty/${ticketId}/assign`, { technicianId });
    return res.data.data;
  },

  async updateStatus(
    ticketId: number,
    payload: {
      status: WarrantyTicketStatus;
      diagnosis?: string;
      resolution?: string;
      estimatedDays?: number;
    },
  ): Promise<WarrantyTicket> {
    const res = await api.patch(`/admin/warranty/${ticketId}/status`, payload);
    return res.data.data;
  },
};
