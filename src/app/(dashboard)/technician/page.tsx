"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { warrantyService } from "@/lib/warranty-service";
import { useAuth } from "@/context/auth-context";

const statusLabel: Record<string, string> = {
  PENDING: "Chờ xử lý",
  RECEIVED: "Đã tiếp nhận",
  DIAGNOSING: "Đang chẩn đoán",
  REPAIRING: "Đang sửa chữa",
  REPAIRED: "Đã sửa xong",
  RETURNED: "Đã trả hàng",
  REJECTED: "Từ chối",
};

const priorityLabel: Record<string, string> = {
  LOW: "Thấp",
  MEDIUM: "Trung bình",
  HIGH: "Cao",
  URGENT: "Khẩn cấp",
};

interface Ticket {
  id: number;
  ticketCode: string;
  productName: string;
  status: string;
  priority: string;
  createdAt: string;
  assignedTo?: number | null;
}

export default function TechnicianPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();

  useEffect(() => {
    async function fetchTickets() {
      try {
        const res = await warrantyService.getAll({ limit: 100 });
        const all = res.data ?? [];
        const mine = all.filter(
          (t: Ticket) =>
            t.assignedTo === user?.id ||
            (t.status !== "pending" &&
              t.status !== "rejected" &&
              t.status !== "returned"),
        );
        setTickets(mine);
      } catch {
        setError("Không thể tải danh sách ticket");
      } finally {
        setLoading(false);
      }
    }
    void fetchTickets();
  }, [user]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Công việc của tôi</h1>
        <p className="text-muted-foreground">
          Danh sách ticket bảo hành được giao
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã ticket</TableHead>
              <TableHead>Sản phẩm</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Ưu tiên</TableHead>
              <TableHead>Ngày tạo</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
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
                  Không có ticket nào
                </TableCell>
              </TableRow>
            ) : (
              tickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell className="font-medium">
                    {ticket.ticketCode}
                  </TableCell>
                  <TableCell>{ticket.productName}</TableCell>
                  <TableCell>{statusLabel[ticket.status]}</TableCell>
                  <TableCell>{priorityLabel[ticket.priority]}</TableCell>
                  <TableCell>
                    {new Date(ticket.createdAt).toLocaleString("vi-VN")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/technician/${ticket.id}`)}
                    >
                      Xử lý
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
