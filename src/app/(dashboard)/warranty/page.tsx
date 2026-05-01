"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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

type WarrantyExportField =
  | "ticketCode"
  | "productName"
  | "status"
  | "priority"
  | "assignedTo"
  | "issueDescription"
  | "createdAt";

const warrantyExportFieldOptions: Array<{
  key: WarrantyExportField;
  label: string;
  header: string;
}> = [
  { key: "ticketCode", label: "Mã ticket", header: "TicketCode" },
  { key: "productName", label: "Sản phẩm", header: "ProductName" },
  { key: "status", label: "Trạng thái", header: "Status" },
  { key: "priority", label: "Ưu tiên", header: "Priority" },
  { key: "assignedTo", label: "Technician", header: "AssignedTo" },
  {
    key: "issueDescription",
    label: "Mô tả lỗi",
    header: "IssueDescription",
  },
  { key: "createdAt", label: "Ngày tạo", header: "CreatedAt" },
];

const defaultWarrantyExportFields: WarrantyExportField[] = [
  "ticketCode",
  "productName",
  "status",
  "priority",
  "createdAt",
];

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }
  return parsed;
}

function parseStatus(value: string | null): WarrantyTicketStatus | "all" {
  if (!value) {
    return "all";
  }
  return statusOptions.includes(value as WarrantyTicketStatus)
    ? (value as WarrantyTicketStatus)
    : "all";
}

function WarrantyAdminPageContent() {
  const PAGE_SIZE = 10;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialPage = parsePositiveInt(searchParams.get("page"), 1);
  const initialStatus = parseStatus(searchParams.get("status"));
  const initialSearch = searchParams.get("search") ?? "";

  const [summary, setSummary] = useState<WarrantySummary | null>(null);
  const [tickets, setTickets] = useState<WarrantyTicket[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [selectedExportFields, setSelectedExportFields] = useState<
    WarrantyExportField[]
  >(defaultWarrantyExportFields);
  const [statusFilter, setStatusFilter] = useState<
    WarrantyTicketStatus | "all"
  >(initialStatus);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [page, setPage] = useState(initialPage);

  const [techByTicket, setTechByTicket] = useState<Record<number, string>>({});
  const tableSectionRef = useRef<HTMLDivElement | null>(null);
  const shouldFocusTableRef = useRef(false);

  function markKeepTableInView() {
    shouldFocusTableRef.current = true;
  }

  function clearFilters() {
    markKeepTableInView();
    setStatusFilter("all");
    setSearchInput("");
    setDebouncedSearch("");
    setPage(1);
  }

  function escapeCsv(value: string | number | null): string {
    if (value === null) {
      return "";
    }
    const text = String(value);
    if (text.includes(",") || text.includes('"') || text.includes("\n")) {
      return `"${text.replaceAll('"', '""')}"`;
    }
    return text;
  }

  function formatDateForCsv(value: string): string {
    return new Date(value).toLocaleString("vi-VN");
  }

  function toggleExportField(field: WarrantyExportField) {
    setSelectedExportFields((prev) => {
      if (prev.includes(field)) {
        return prev.filter((item) => item !== field);
      }
      return [...prev, field];
    });
  }

  function selectAllExportFields() {
    setSelectedExportFields(
      warrantyExportFieldOptions.map((field) => field.key),
    );
  }

  function resetDefaultExportFields() {
    setSelectedExportFields(defaultWarrantyExportFields);
  }

  function clearExportFields() {
    setSelectedExportFields([]);
  }

  async function handleExportCsv() {
    setExportingCsv(true);
    setError(null);
    try {
      if (selectedExportFields.length === 0) {
        setError("Vui lòng chọn ít nhất 1 cột để export");
        return;
      }

      const status = statusFilter === "all" ? undefined : statusFilter;
      const keyword = debouncedSearch.trim() || undefined;

      const allTickets: WarrantyTicket[] = [];
      let exportPage = 1;
      let exportTotalPages = 1;

      while (exportPage <= exportTotalPages) {
        const result = await warrantyService.getAll({
          page: exportPage,
          limit: 100,
          status,
          search: keyword,
        });
        allTickets.push(...result.data);
        exportTotalPages = result.meta.totalPages || 1;
        exportPage += 1;
      }

      const orderedFields = warrantyExportFieldOptions
        .map((item) => item.key)
        .filter((field) => selectedExportFields.includes(field));

      const headers = warrantyExportFieldOptions
        .filter((item) => orderedFields.includes(item.key))
        .map((item) => item.header);

      const rows = allTickets.map((ticket) => {
        const values = orderedFields.map((field) => {
          switch (field) {
            case "ticketCode":
              return ticket.ticketCode;
            case "productName":
              return ticket.productName;
            case "status":
              return ticket.status;
            case "priority":
              return ticket.priority;
            case "assignedTo":
              return ticket.assignedTo;
            case "issueDescription":
              return ticket.issueDescription;
            case "createdAt":
              return formatDateForCsv(ticket.createdAt);
            default:
              return "";
          }
        });

        return values.map((cell) => escapeCsv(cell)).join(",");
      });

      const csvContent = [headers.join(","), ...rows].join("\n");
      const blob = new Blob(["\uFEFF", csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `warranty-export-${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      setError("Không thể export CSV bảo hành");
    } finally {
      setExportingCsv(false);
    }
  }

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const status = statusFilter === "all" ? undefined : statusFilter;
      const keyword = debouncedSearch.trim() || undefined;
      const [summaryData, ticketData] = await Promise.all([
        warrantyService.getSummary(),
        warrantyService.getAll({
          page,
          limit: PAGE_SIZE,
          status,
          search: keyword,
        }),
      ]);
      setSummary(summaryData);
      setTickets(ticketData.data);
      setTotal(ticketData.meta.total);
      setTotalPages(Math.max(1, ticketData.meta.totalPages || 1));
    } catch {
      setError("Không thể tải dữ liệu bảo hành");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, debouncedSearch]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 400);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, debouncedSearch]);

  useEffect(() => {
    if (!loading && shouldFocusTableRef.current) {
      tableSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      shouldFocusTableRef.current = false;
    }
  }, [loading]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (page > 1) {
      params.set("page", String(page));
    }
    if (statusFilter !== "all") {
      params.set("status", statusFilter);
    }
    const keyword = debouncedSearch.trim();
    if (keyword) {
      params.set("search", keyword);
    }

    const nextQuery = params.toString();
    const currentQuery = searchParams.toString();
    if (nextQuery !== currentQuery) {
      const href = nextQuery ? `${pathname}?${nextQuery}` : pathname;
      router.replace(href, { scroll: false });
    }
  }, [page, statusFilter, debouncedSearch, pathname, router, searchParams]);

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
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={statusFilter}
          onChange={(event) => {
            markKeepTableInView();
            setStatusFilter(event.target.value as WarrantyTicketStatus | "all");
          }}
        >
          <option value="all">Tất cả trạng thái</option>
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {statusLabel[status]}
            </option>
          ))}
        </select>
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">
            {total} ticket phù hợp
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleExportCsv()}
              disabled={exportingCsv || total === 0}
            >
              {exportingCsv ? "Đang export..." : "Export CSV"}
            </Button>
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground">
            Cột export CSV ({selectedExportFields.length}/
            {warrantyExportFieldOptions.length})
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={selectAllExportFields}>
              Chọn tất cả
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={resetDefaultExportFields}
            >
              Mặc định
            </Button>
            <Button variant="outline" size="sm" onClick={clearExportFields}>
              Bỏ chọn
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {warrantyExportFieldOptions.map((field) => (
            <label key={field.key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedExportFields.includes(field.key)}
                onChange={() => toggleExportField(field.key)}
              />
              {field.label}
            </label>
          ))}
        </div>
      </div>

      <div ref={tableSectionRef} className="rounded-lg border">
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
            ) : tickets.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-muted-foreground"
                >
                  Không có ticket phù hợp bộ lọc
                </TableCell>
              </TableRow>
            ) : (
              tickets.map((ticket) => (
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
            onClick={() => {
              markKeepTableInView();
              setPage((prev) => Math.max(1, prev - 1));
            }}
          >
            Trước
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => {
              markKeepTableInView();
              setPage((prev) => Math.min(totalPages, prev + 1));
            }}
          >
            Sau
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function WarrantyAdminPage() {
  return (
    <Suspense
      fallback={
        <div className="p-4 text-sm text-muted-foreground">Đang tải...</div>
      }
    >
      <WarrantyAdminPageContent />
    </Suspense>
  );
}
