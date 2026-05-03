"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ArrowLeft } from "lucide-react";
import {
  warrantyService,
  type WarrantyTicket,
  type WarrantyTicketStatus,
  type RepairLog,
} from "@/lib/warranty-service";

const statusLabel: Record<string, string> = {
  pending: "Chờ xử lý",
  received: "Đã tiếp nhận",
  diagnosing: "Đang chẩn đoán",
  repairing: "Đang sửa chữa",
  waiting_parts: "Chờ linh kiện",
  completed: "Hoàn thành",
  returned: "Đã trả hàng",
  rejected: "Từ chối",
};

const priorityLabel: Record<string, string> = {
  low: "Thấp",
  medium: "Trung bình",
  high: "Cao",
  urgent: "Khẩn cấp",
};

const statusOptions: WarrantyTicketStatus[] = [
  "pending",
  "received",
  "diagnosing",
  "repairing",
  "waiting_parts",
  "completed",
  "returned",
  "rejected",
];

export default function TechnicianTicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = Number(params.id);

  const [ticket, setTicket] = useState<WarrantyTicket | null>(null);
  const [logs, setLogs] = useState<RepairLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState<WarrantyTicketStatus>("pending");
  const [diagnosis, setDiagnosis] = useState("");
  const [resolution, setResolution] = useState("");
  const [estimatedDays, setEstimatedDays] = useState("");
  const [saving, setSaving] = useState(false);

  const [logAction, setLogAction] = useState("");
  const [logNotes, setLogNotes] = useState("");
  const [addingLog, setAddingLog] = useState(false);

  async function fetchData() {
    setError(null);
    try {
      const [t, l] = await Promise.all([
        warrantyService.getTicketById(ticketId),
        warrantyService.getLogs(ticketId),
      ]);
      setTicket(t);
      setLogs(l);
      setStatus(t.status);
      setDiagnosis(t.diagnosis ?? "");
      setResolution(t.resolution ?? "");
      setEstimatedDays(t.estimatedDays?.toString() ?? "");
    } catch {
      setError("Không thể tải thông tin ticket");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchData();
  }, [ticketId]);

  async function handleUpdateStatus() {
    setSaving(true);
    setError(null);
    try {
      await warrantyService.updateStatus(ticketId, {
        status,
        diagnosis: diagnosis || undefined,
        resolution: resolution || undefined,
        estimatedDays: estimatedDays ? Number(estimatedDays) : undefined,
      });
      await fetchData();
    } catch {
      setError("Không thể cập nhật trạng thái");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddLog() {
    if (!logAction.trim()) return;
    setAddingLog(true);
    setError(null);
    try {
      await warrantyService.addRepairLog(ticketId, {
        action: logAction.trim(),
        notes: logNotes.trim() || undefined,
      });
      setLogAction("");
      setLogNotes("");
      await fetchData();
    } catch {
      setError("Không thể thêm log sửa chữa");
    } finally {
      setAddingLog(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!ticket && !loading) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Quay lại
        </Button>
        <p className="text-muted-foreground">Không tìm thấy ticket.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Quay lại
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {ticket?.ticketCode}
          </h1>
          <p className="text-muted-foreground">{ticket?.productName}</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-lg border p-4 space-y-4">
            <h2 className="font-semibold">Cập nhật trạng thái</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Trạng thái</label>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as WarrantyTicketStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((s) => (
                      <SelectItem key={s} value={s}>
                        {statusLabel[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Số ngày dự kiến</label>
                <Input
                  type="number"
                  value={estimatedDays}
                  onChange={(e) => setEstimatedDays(e.target.value)}
                  placeholder="Nhập số ngày"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-sm font-medium">Chẩn đoán</label>
                <Textarea
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="Mô tả chẩn đoán lỗi..."
                  rows={3}
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-sm font-medium">
                  Phương án xử lý
                </label>
                <Textarea
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  placeholder="Mô tả phương án xử lý..."
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleUpdateStatus} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Lưu cập nhật
              </Button>
            </div>
          </div>

          <div className="rounded-lg border p-4 space-y-4">
            <h2 className="font-semibold">Thêm log sửa chữa</h2>
            <div className="space-y-3">
              <Input
                placeholder="Hành động (VD: Thay màn hình, vệ sinh máy...)"
                value={logAction}
                onChange={(e) => setLogAction(e.target.value)}
              />
              <Textarea
                placeholder="Ghi chú thêm (tùy chọn)"
                value={logNotes}
                onChange={(e) => setLogNotes(e.target.value)}
                rows={3}
              />
              <div className="flex justify-end">
                <Button
                  onClick={handleAddLog}
                  disabled={addingLog || !logAction.trim()}
                  variant="secondary"
                >
                  {addingLog ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Thêm log
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-4 space-y-3">
            <h2 className="font-semibold">Lịch sử sửa chữa</h2>
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Chưa có log sửa chữa nào.
              </p>
            ) : (
              <div className="space-y-3">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-md border p-3 space-y-1"
                  >
                    <p className="text-sm font-medium">{log.action}</p>
                    {log.notes && (
                      <p className="text-sm text-muted-foreground">
                        {log.notes}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString("vi-VN")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border p-4 space-y-3">
            <h2 className="font-semibold">Thông tin ticket</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mã ticket</span>
                <span className="font-medium">{ticket?.ticketCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sản phẩm</span>
                <span className="font-medium">{ticket?.productName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Trạng thái</span>
                <span className="font-medium">
                  {ticket ? statusLabel[ticket.status] : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ưu tiên</span>
                <span className="font-medium">
                  {ticket ? priorityLabel[ticket.priority] : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ngày tạo</span>
                <span>
                  {ticket
                    ? new Date(ticket.createdAt).toLocaleString("vi-VN")
                    : "—"}
                </span>
              </div>
            </div>
            <hr />
            <div className="space-y-1">
              <p className="text-sm font-medium">Mô tả lỗi</p>
              <p className="text-sm text-muted-foreground">
                {ticket?.issueDescription}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
