"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  X,
  RefreshCw,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Check,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  returnService,
  type ReturnRequest,
  type ReturnStatus,
  type InspectDto,
} from "@/lib/return-service";
import { useAuth } from "@/context/auth-context";

function fmt(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n);
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<ReturnStatus, string> = {
  pending_review: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
  label_generated: "Đã tạo nhãn",
  label_generation_failed: "Lỗi tạo nhãn",
  in_transit: "Đang vận chuyển",
  received_at_warehouse: "Đã nhận tại kho",
  inspected: "Đã kiểm tra",
  refund_pending: "Chờ hoàn tiền",
  refunded: "Đã hoàn tiền",
  restocked: "Đã nhập lại kho",
  cancelled: "Đã hủy",
};

const STATUS_COLOR: Record<ReturnStatus, string> = {
  pending_review: "bg-yellow-100 text-yellow-800 border-yellow-200",
  approved: "bg-blue-100 text-blue-800 border-blue-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  label_generated: "bg-sky-100 text-sky-800 border-sky-200",
  label_generation_failed: "bg-orange-100 text-orange-800 border-orange-200",
  in_transit: "bg-indigo-100 text-indigo-800 border-indigo-200",
  received_at_warehouse: "bg-purple-100 text-purple-800 border-purple-200",
  inspected: "bg-violet-100 text-violet-800 border-violet-200",
  refund_pending: "bg-amber-100 text-amber-800 border-amber-200",
  refunded: "bg-emerald-100 text-emerald-800 border-emerald-200",
  restocked: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-gray-100 text-gray-600 border-gray-200",
};

const REASON_LABEL: Record<string, string> = {
  defective: "Sản phẩm lỗi",
  wrong_item: "Giao nhầm hàng",
  not_as_described: "Không đúng mô tả",
  no_longer_needed: "Không cần nữa",
  better_price: "Tìm được giá tốt hơn",
  other: "Lý do khác",
};

const CONDITION_LABEL: Record<string, string> = {
  perfect: "Hoàn hảo",
  minor_damage: "Hư hỏng nhẹ",
  significant_damage: "Hư hỏng nặng",
  missing_items: "Thiếu phụ kiện",
};

const REFUND_TYPE_LABEL: Record<string, string> = {
  full_refund: "Hoàn toàn bộ",
  partial_refund: "Hoàn một phần",
  no_refund: "Không hoàn tiền",
};

const ALL_STATUSES: { value: ReturnStatus | ""; label: string }[] = [
  { value: "", label: "Tất cả" },
  { value: "pending_review", label: "Chờ duyệt" },
  { value: "approved", label: "Đã duyệt" },
  { value: "rejected", label: "Từ chối" },
  { value: "label_generated", label: "Đã tạo nhãn" },
  { value: "in_transit", label: "Đang vận chuyển" },
  { value: "received_at_warehouse", label: "Tại kho" },
  { value: "inspected", label: "Đã kiểm tra" },
  { value: "refund_pending", label: "Chờ hoàn tiền" },
  { value: "refunded", label: "Đã hoàn tiền" },
  { value: "cancelled", label: "Đã hủy" },
];

function StatusBadge({ status }: { status: ReturnStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function DetailModal({
  rr,
  onClose,
  onUpdated,
}: {
  rr: ReturnRequest;
  onClose: () => void;
  onUpdated: (updated: ReturnRequest) => void;
}) {
  const { user } = useAuth();
  const canAction = user?.role === "admin" || user?.role === "staff" || user?.role === "warehouse";

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Review state
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // Inspect state
  const [inspectForm, setInspectForm] = useState<InspectDto>({
    condition: "perfect",
    refundType: "full_refund",
    deductionAmount: 0,
    deductionReason: "",
    inspectionNotes: "",
    isFraud: false,
  });

  // Note state
  const [note, setNote] = useState("");

  async function handleApprove() {
    setBusy(true);
    setErr(null);
    try {
      const updated = await returnService.review(rr.id, "approved");
      setSuccess("Đã duyệt yêu cầu đổi trả");
      onUpdated(updated);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Thao tác thất bại");
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    if (!rejectionReason.trim() || rejectionReason.trim().length < 20) {
      setErr("Lý do từ chối phải có ít nhất 20 ký tự");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const updated = await returnService.review(rr.id, "rejected", rejectionReason);
      setSuccess("Đã từ chối yêu cầu đổi trả");
      onUpdated(updated);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Thao tác thất bại");
    } finally {
      setBusy(false);
    }
  }

  async function handleInspect() {
    if (!inspectForm.inspectionNotes.trim() || inspectForm.inspectionNotes.trim().length < 20) {
      setErr("Ghi chú kiểm tra phải có ít nhất 20 ký tự");
      return;
    }
    if (inspectForm.refundType === "partial_refund" && !inspectForm.deductionReason?.trim()) {
      setErr("Cần nhập lý do khấu trừ khi hoàn một phần");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await returnService.inspect(rr.id, inspectForm);
      const updated = await returnService.findById(rr.id);
      setSuccess("Đã lưu kết quả kiểm tra");
      onUpdated(updated);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Thao tác thất bại");
    } finally {
      setBusy(false);
    }
  }

  async function handleProcessRefund() {
    setBusy(true);
    setErr(null);
    try {
      await returnService.processRefund(rr.id);
      const updated = await returnService.findById(rr.id);
      setSuccess("Đã xử lý hoàn tiền thành công");
      onUpdated(updated);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Thao tác thất bại");
    } finally {
      setBusy(false);
    }
  }

  async function handleAddNote() {
    if (!note.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const updated = await returnService.addNote(rr.id, note);
      setNote("");
      setSuccess("Đã thêm ghi chú");
      onUpdated(updated);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Thao tác thất bại");
    } finally {
      setBusy(false);
    }
  }

  const itemTotal = rr.items?.reduce((s, i) => s + Number(i.lineTotal), 0) ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-xl border bg-card shadow-xl my-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4 sticky top-0 bg-card rounded-t-xl z-10">
          <div className="flex items-center gap-3">
            <RotateCcw className="h-5 w-5 text-muted-foreground" />
            <div>
              <h2 className="font-semibold">{rr.returnCode}</h2>
              <p className="text-xs text-muted-foreground">Đơn hàng: {rr.orderCode}</p>
            </div>
            <StatusBadge status={rr.status} />
            {rr.isFlaggedFraud && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 border border-red-200">
                <AlertTriangle className="h-3 w-3" /> Nghi gian lận
              </span>
            )}
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Alerts */}
          {err && (
            <div className="flex items-center justify-between rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <span>{err}</span>
              <button onClick={() => setErr(null)}><X className="h-4 w-4" /></button>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <Check className="h-4 w-4 shrink-0" />{success}
            </div>
          )}

          {/* Basic info */}
          <div className="grid grid-cols-2 gap-3 rounded-lg border p-4">
            <div>
              <p className="text-xs text-muted-foreground">Người dùng (ID)</p>
              <p className="font-medium">{rr.userId}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Ngày tạo</p>
              <p className="font-medium">{fmtDate(rr.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Lý do đổi trả</p>
              <p className="font-medium">{REASON_LABEL[rr.returnReason] ?? rr.returnReason}</p>
            </div>
            {rr.reviewedAt && (
              <div>
                <p className="text-xs text-muted-foreground">Ngày duyệt</p>
                <p className="font-medium">{fmtDate(rr.reviewedAt)}</p>
              </div>
            )}
            {rr.returnDescription && (
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Mô tả</p>
                <p className="text-sm mt-0.5">{rr.returnDescription}</p>
              </div>
            )}
            {rr.rejectionReason && (
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Lý do từ chối</p>
                <p className="text-sm mt-0.5 text-red-700">{rr.rejectionReason}</p>
              </div>
            )}
            {rr.trackingNumber && (
              <div>
                <p className="text-xs text-muted-foreground">Mã vận đơn hoàn trả</p>
                <p className="font-medium font-mono">{rr.trackingNumber}</p>
              </div>
            )}
          </div>

          {/* Evidence photos */}
          {rr.evidencePhotos && rr.evidencePhotos.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Ảnh minh chứng</p>
              <div className="flex flex-wrap gap-2">
                {rr.evidencePhotos.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                    className="block h-20 w-20 overflow-hidden rounded-lg border hover:opacity-80 transition-opacity">
                    <img src={url} alt={`evidence-${i}`} className="h-full w-full object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Items */}
          {rr.items && rr.items.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Sản phẩm đổi trả</p>
              <div className="overflow-hidden rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Sản phẩm</th>
                      <th className="px-3 py-2 text-right font-medium">SL</th>
                      <th className="px-3 py-2 text-right font-medium">Đơn giá</th>
                      <th className="px-3 py-2 text-right font-medium">Tổng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rr.items.map((item) => (
                      <tr key={item.id} className="border-t">
                        <td className="px-3 py-2">{item.productName}</td>
                        <td className="px-3 py-2 text-right">{item.quantity}</td>
                        <td className="px-3 py-2 text-right">{fmt(item.unitPrice)}đ</td>
                        <td className="px-3 py-2 text-right font-medium">{fmt(item.lineTotal)}đ</td>
                      </tr>
                    ))}
                    <tr className="border-t bg-muted/30">
                      <td colSpan={3} className="px-3 py-2 text-right font-semibold">Tổng giá trị</td>
                      <td className="px-3 py-2 text-right font-bold">{fmt(itemTotal)}đ</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Refund info */}
          {rr.refundAmount !== null && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-800 mb-2">Thông tin hoàn tiền</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-emerald-700">Số tiền hoàn:</span>
                  <span className="ml-2 font-bold text-emerald-900">{fmt(rr.refundAmount)}đ</span>
                </div>
                {rr.refundMethod && (
                  <div>
                    <span className="text-emerald-700">Phương thức:</span>
                    <span className="ml-2 font-medium">
                      {rr.refundMethod === "bank_transfer" ? "Chuyển khoản" :
                        rr.refundMethod === "store_credit" ? "Điểm thưởng" : "Hoàn gốc"}
                    </span>
                  </div>
                )}
                {rr.bankName && (
                  <>
                    <div><span className="text-emerald-700">Ngân hàng:</span> <span className="ml-1">{rr.bankName}</span></div>
                    <div><span className="text-emerald-700">Chủ TK:</span> <span className="ml-1">{rr.bankHolder}</span></div>
                    <div className="col-span-2"><span className="text-emerald-700">Số TK:</span> <span className="ml-1 font-mono">{rr.bankAccount}</span></div>
                  </>
                )}
                {rr.refundBreakdown && (
                  <div className="col-span-2 mt-1 border-t border-emerald-200 pt-2">
                    <p className="text-xs text-emerald-700 mb-1">Chi tiết:</p>
                    {Object.entries(rr.refundBreakdown).map(([k, v]) => (
                      <div key={k} className="flex justify-between text-xs">
                        <span className="text-emerald-700 capitalize">{k}</span>
                        <span className={v < 0 ? "text-red-600" : ""}>{v > 0 ? "+" : ""}{fmt(v)}đ</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── ACTIONS ── */}
          {canAction && (
            <>
              {/* Review */}
              {rr.status === "pending_review" && (
                <div className="rounded-lg border p-4 space-y-3">
                  <p className="text-sm font-semibold">Duyệt yêu cầu</p>
                  {!rejectMode ? (
                    <div className="flex gap-2">
                      <Button
                        onClick={handleApprove}
                        disabled={busy}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1.5" />}
                        Chấp thuận
                      </Button>
                      <Button variant="outline" onClick={() => setRejectMode(true)} disabled={busy}
                        className="text-red-600 border-red-300 hover:bg-red-50">
                        Từ chối
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label>Lý do từ chối <span className="text-muted-foreground text-xs">(tối thiểu 20 ký tự)</span></Label>
                      <textarea
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-ring"
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Lý do cụ thể để từ chối yêu cầu đổi trả..."
                      />
                      <div className="flex gap-2">
                        <Button onClick={handleReject} disabled={busy}
                          className="bg-red-600 hover:bg-red-700 text-white">
                          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Xác nhận từ chối"}
                        </Button>
                        <Button variant="outline" onClick={() => { setRejectMode(false); setRejectionReason(""); }}>
                          Quay lại
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Inspect */}
              {rr.status === "received_at_warehouse" && (
                <div className="rounded-lg border p-4 space-y-3">
                  <p className="text-sm font-semibold">Kiểm tra hàng nhận được</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="mb-1.5 block text-xs">Tình trạng hàng</Label>
                      <select
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        value={inspectForm.condition}
                        onChange={(e) => setInspectForm({ ...inspectForm, condition: e.target.value as InspectDto["condition"] })}
                      >
                        {Object.entries(CONDITION_LABEL).map(([v, l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="mb-1.5 block text-xs">Loại hoàn tiền</Label>
                      <select
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        value={inspectForm.refundType}
                        onChange={(e) => setInspectForm({ ...inspectForm, refundType: e.target.value as InspectDto["refundType"] })}
                      >
                        {Object.entries(REFUND_TYPE_LABEL).map(([v, l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {inspectForm.refundType === "partial_refund" && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="mb-1.5 block text-xs">Số tiền khấu trừ (đ)</Label>
                        <Input
                          type="number"
                          min={0}
                          value={inspectForm.deductionAmount ?? 0}
                          onChange={(e) => setInspectForm({ ...inspectForm, deductionAmount: Number(e.target.value) })}
                        />
                      </div>
                      <div>
                        <Label className="mb-1.5 block text-xs">Lý do khấu trừ</Label>
                        <Input
                          value={inspectForm.deductionReason ?? ""}
                          onChange={(e) => setInspectForm({ ...inspectForm, deductionReason: e.target.value })}
                          placeholder="VD: Màn hình bị xước..."
                        />
                      </div>
                    </div>
                  )}
                  <div>
                    <Label className="mb-1.5 block text-xs">Ghi chú kiểm tra <span className="text-muted-foreground">(tối thiểu 20 ký tự)</span></Label>
                    <textarea
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-ring"
                      value={inspectForm.inspectionNotes}
                      onChange={(e) => setInspectForm({ ...inspectForm, inspectionNotes: e.target.value })}
                      placeholder="Mô tả chi tiết tình trạng hàng nhận được..."
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isFraud"
                      checked={inspectForm.isFraud ?? false}
                      onChange={(e) => setInspectForm({ ...inspectForm, isFraud: e.target.checked })}
                      className="accent-primary"
                    />
                    <label htmlFor="isFraud" className="text-sm text-red-600">Đánh dấu nghi ngờ gian lận</label>
                  </div>
                  <Button onClick={handleInspect} disabled={busy} className="bg-violet-600 hover:bg-violet-700 text-white">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Lưu kết quả kiểm tra"}
                  </Button>
                </div>
              )}

              {/* Process Refund */}
              {(rr.status === "inspected" || rr.status === "refund_pending") && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 space-y-2">
                  <p className="text-sm font-semibold text-emerald-800">Xử lý hoàn tiền</p>
                  <p className="text-xs text-emerald-700">
                    Hệ thống sẽ tự động tính số tiền hoàn dựa trên kết quả kiểm tra và chính sách hoàn trả.
                  </p>
                  <Button onClick={handleProcessRefund} disabled={busy}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Xử lý hoàn tiền"}
                  </Button>
                </div>
              )}

              {/* Internal Note */}
              <div className="rounded-lg border p-4 space-y-2">
                <p className="text-sm font-semibold">Ghi chú nội bộ</p>
                {rr.internalNotes && (
                  <pre className="rounded-md bg-muted/50 p-3 text-xs whitespace-pre-wrap font-mono max-h-40 overflow-y-auto">
                    {rr.internalNotes}
                  </pre>
                )}
                <div className="flex gap-2">
                  <Input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Thêm ghi chú nội bộ..."
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleAddNote()}
                  />
                  <Button onClick={handleAddNote} disabled={busy || !note.trim()} variant="outline">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Thêm"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const LIMIT = 20;

export default function ReturnsPage() {
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<ReturnRequest | null>(null);

  const totalPages = Math.ceil(total / LIMIT);

  const load = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoading(true);
      else setRefreshing(true);
      try {
        const res = await returnService.findAll(page, LIMIT, statusFilter || undefined);
        setReturns(res.data);
        setTotal(res.total);
      } catch {
        // silently ignore
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, statusFilter],
  );

  useEffect(() => { load(); }, [load]);

  function handleUpdated(updated: ReturnRequest) {
    setSelected(updated);
    setReturns((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  }

  async function openDetail(rr: ReturnRequest) {
    try {
      const full = await returnService.findById(rr.id);
      setSelected(full);
    } catch {
      setSelected(rr);
    }
  }

  const pendingCount = returns.filter((r) => r.status === "pending_review").length;

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quản lý Đổi/Trả</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total} yêu cầu
            {pendingCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-yellow-700">
                <AlertTriangle className="h-3.5 w-3.5" />
                {pendingCount} chờ duyệt
              </span>
            )}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => load(true)} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
          Làm mới
        </Button>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-1 rounded-lg border bg-muted/30 p-1">
        {ALL_STATUSES.map((s) => (
          <button
            key={s.value}
            onClick={() => { setStatusFilter(s.value); setPage(1); }}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === s.value
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/60">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Mã đổi trả</th>
              <th className="px-4 py-3 text-left font-medium">Đơn hàng</th>
              <th className="px-4 py-3 text-left font-medium">Lý do</th>
              <th className="px-4 py-3 text-left font-medium">Trạng thái</th>
              <th className="px-4 py-3 text-right font-medium">Số tiền</th>
              <th className="px-4 py-3 text-left font-medium">Ngày tạo</th>
              <th className="px-4 py-3 text-center font-medium">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {returns.map((rr) => (
              <tr
                key={rr.id}
                className="border-t hover:bg-muted/30 transition-colors"
              >
                <td className="px-4 py-3">
                  <span className="font-mono text-xs font-semibold">{rr.returnCode}</span>
                  {rr.isFlaggedFraud && (
                    <AlertTriangle className="inline ml-1.5 h-3.5 w-3.5 text-red-500" />
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs">{rr.orderCode}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {REASON_LABEL[rr.returnReason] ?? rr.returnReason}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={rr.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  {rr.refundAmount !== null
                    ? <span className="font-semibold text-emerald-700">{fmt(rr.refundAmount)}đ</span>
                    : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {fmtDate(rr.createdAt)}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => openDetail(rr)}
                    className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Chi tiết
                  </button>
                </td>
              </tr>
            ))}
            {returns.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                  {statusFilter
                    ? `Không có yêu cầu nào ở trạng thái "${STATUS_LABEL[statusFilter as ReturnStatus] ?? statusFilter}"`
                    : "Chưa có yêu cầu đổi trả nào"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Trang {page}/{totalPages} · {total} kết quả
          </span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <DetailModal
          rr={selected}
          onClose={() => setSelected(null)}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  );
}
