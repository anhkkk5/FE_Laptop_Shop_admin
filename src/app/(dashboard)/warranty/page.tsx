"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  warrantyService,
  type WarrantySummary,
  type WarrantyTicket,
  type WarrantyTicketStatus,
} from "@/lib/warranty-service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const statusLabel: Record<WarrantyTicketStatus, string> = {
  pending: "Chờ tiếp nhận",
  received: "Đã tiếp nhận",
  diagnosing: "Đang chẩn đoán",
  repairing: "Đang sửa",
  waiting_parts: "Chờ linh kiện",
  completed: "Hoàn tất sửa chữa",
  returned: "Đã trả khách",
  rejected: "Từ chối",
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

export default function WarrantyAdminPage() {
  const PAGE_SIZE = 10;
  const [summary, setSummary] = useState<WarrantySummary | null>(null);
  const [tickets, setTickets] = useState<WarrantyTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    WarrantyTicketStatus | "all"
  >("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [techByTicket, setTechByTicket] = useState<Record<number, string>>({});

  const filteredTickets = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return tickets.filter((ticket) => {
      const matchesStatus =
        statusFilter === "all" ? true : ticket.status === statusFilter;

      const matchesKeyword =
        !keyword ||
        ticket.ticketCode.toLowerCase().includes(keyword) ||
        ticket.productName.toLowerCase().includes(keyword);

      return matchesStatus && matchesKeyword;
    });
  }, [tickets, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / PAGE_SIZE));
  const paginatedTickets = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredTickets.slice(start, start + PAGE_SIZE);
  }, [filteredTickets, page]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryData, ticketData] = await Promise.all([
        warrantyService.getSummary(),
        warrantyService.getAll(1, 30),
      ]);
      setSummary(summaryData);
      setTickets(ticketData.data);
    } catch {
      setError("Không thể tải dữ liệu bảo hành");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, search]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  async function handleAssign(ticketId: number) {
    const technicianId = Number(techByTicket[ticketId] || "");
    if (!technicianId || technicianId <= 0) {
      setError("Vui lòng nhập Technician ID hợp lệ");
      return;
    }

    setAssigningId(ticketId);
    setError(null);
    try {
      await warrantyService.assign(ticketId, technicianId);
      await fetchData();
    } catch {
      setError("Không thể assign kỹ thuật viên");
    } finally {
      setAssigningId(null);
    }
  }

  async function handleUpdateStatus(
    ticketId: number,
    status: WarrantyTicketStatus,
  ) {
    setUpdatingId(ticketId);
    setError(null);
    try {
      await warrantyService.updateStatus(ticketId, { status });
      await fetchData();
    } catch {
      setError("Không thể cập nhật trạng thái ticket");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Quản lý bảo hành</h1>
        <p className="text-muted-foreground">
          Theo dõi ticket và xử lý trạng thái bảo hành
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Tổng ticket</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{summary?.total ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Chờ xử lý</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{summary?.pending ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Đang xử lý</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{summary?.inProgress ?? "—"}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 rounded-lg border p-3 md:grid-cols-3">
        <input
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          placeholder="Tìm theo mã ticket hoặc tên sản phẩm"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as WarrantyTicketStatus | "all")
          }
        >
          <option value="all">Tất cả trạng thái</option>
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {statusLabel[status]}
            </option>
          ))}
        </select>
        <div className="flex items-center text-sm text-muted-foreground">
          {filteredTickets.length} ticket phù hợp
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã ticket</TableHead>
              <TableHead>Sản phẩm</TableHead>
              <TableHead>Ưu tiên</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Assign Tech</TableHead>
              <TableHead>Cập nhật trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : filteredTickets.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-muted-foreground"
                >
                  Không có ticket phù hợp bộ lọc
                </TableCell>
              </TableRow>
            ) : (
              paginatedTickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell className="font-medium">
                    {ticket.ticketCode}
                  </TableCell>
                  <TableCell>{ticket.productName}</TableCell>
                  <TableCell>{ticket.priority}</TableCell>
                  <TableCell>{statusLabel[ticket.status]}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <input
                        className="h-8 w-24 rounded-md border border-input bg-background px-2 text-sm"
                        placeholder="Tech ID"
                        value={techByTicket[ticket.id] || ""}
                        onChange={(event) =>
                          setTechByTicket((prev) => ({
                            ...prev,
                            [ticket.id]: event.target.value,
                          }))
                        }
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAssign(ticket.id)}
                        disabled={assigningId === ticket.id}
                      >
                        Assign
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <select
                      className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                      value={ticket.status}
                      onChange={(event) =>
                        void handleUpdateStatus(
                          ticket.id,
                          event.target.value as WarrantyTicketStatus,
                        )
                      }
                      disabled={updatingId === ticket.id}
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {statusLabel[status]}
                        </option>
                      ))}
                    </select>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Trang {page}/{totalPages}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          >
            Trước
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          >
            Sau
          </Button>
        </div>
      </div>
    </div>
  );
}
