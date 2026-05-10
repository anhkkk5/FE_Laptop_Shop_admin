import api from "./api";

export type ReturnStatus =
  | "pending_review"
  | "approved"
  | "rejected"
  | "label_generated"
  | "label_generation_failed"
  | "in_transit"
  | "received_at_warehouse"
  | "inspected"
  | "refund_pending"
  | "refunded"
  | "restocked"
  | "cancelled";

export type ReturnReason =
  | "defective"
  | "wrong_item"
  | "not_as_described"
  | "no_longer_needed"
  | "better_price"
  | "other";

export interface ReturnItem {
  id: number;
  productId: number;
  productName: string;
  productImage: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface RefundTransaction {
  id: number;
  amount: number;
  method: string;
  status: "pending" | "completed" | "failed";
  transactionRef: string | null;
  errorMessage: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface ReturnRequest {
  id: number;
  returnCode: string;
  userId: number;
  orderId: number;
  orderCode: string;
  status: ReturnStatus;
  returnReason: ReturnReason;
  returnDescription: string | null;
  evidencePhotos: string[] | null;
  refundMethod: string | null;
  refundAmount: number | null;
  refundBreakdown: Record<string, number> | null;
  bankAccount: string | null;
  bankName: string | null;
  bankHolder: string | null;
  trackingNumber: string | null;
  labelUrl: string | null;
  reviewedBy: number | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  cancelledAt: string | null;
  isFlaggedFraud: boolean;
  internalNotes: string | null;
  createdAt: string;
  updatedAt: string;
  items: ReturnItem[];
  refundTransactions?: RefundTransaction[];
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface InspectDto {
  condition: "perfect" | "minor_damage" | "significant_damage" | "missing_items";
  refundType: "full_refund" | "partial_refund" | "no_refund";
  deductionAmount?: number;
  deductionReason?: string;
  inspectionNotes: string;
  isFraud?: boolean;
}

export const returnService = {
  async findAll(
    page = 1,
    limit = 20,
    status?: string,
  ): Promise<{ data: ReturnRequest[]; total: number }> {
    const params: Record<string, unknown> = { page, limit };
    if (status) params.status = status;
    const res = await api.get<ApiResponse<{ data: ReturnRequest[]; total: number }>>(
      "/admin/returns",
      { params },
    );
    return res.data.data;
  },

  async findById(id: number): Promise<ReturnRequest> {
    const res = await api.get<ApiResponse<ReturnRequest>>(`/admin/returns/${id}`);
    return res.data.data;
  },

  async review(
    id: number,
    decision: "approved" | "rejected",
    rejectionReason?: string,
  ): Promise<ReturnRequest> {
    const res = await api.patch<ApiResponse<ReturnRequest>>(
      `/admin/returns/${id}/review`,
      { decision, rejectionReason },
    );
    return res.data.data;
  },

  async inspect(id: number, dto: InspectDto): Promise<void> {
    await api.patch(`/admin/returns/${id}/inspect`, dto);
  },

  async processRefund(id: number): Promise<void> {
    await api.post(`/admin/returns/${id}/process-refund`, {});
  },

  async addNote(id: number, note: string): Promise<ReturnRequest> {
    const res = await api.patch<ApiResponse<ReturnRequest>>(
      `/admin/returns/${id}/notes`,
      { note },
    );
    return res.data.data;
  },
};
