"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Eye } from "lucide-react";
import {
  orderService,
  type Order,
  type OrderStatus,
  type PaginatedResult,
} from "@/lib/order-service";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatPrice(price: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);
}

const statusLabel: Record<OrderStatus, string> = {
  pending: "Chờ xử lý",
  confirmed: "Đã xác nhận",
  shipping: "Đang giao",
  completed: "Hoàn tất",
  cancelled: "Đã hủy",
};

export default function OrdersPage() {
  const [result, setResult] = useState<PaginatedResult<Order>>({
    data: [],
    meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await orderService.getAll({ page: 1, limit: 20 });
      setResult(data);
    } catch {
      setError("Không thể tải danh sách đơn hàng");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  async function openDetail(orderId: number) {
    try {
      const detail = await orderService.getById(orderId);
      setSelectedOrder(detail);
      setDialogOpen(true);
    } catch {
      setError("Không thể tải chi tiết đơn hàng");
    }
  }

  async function updateStatus(status: OrderStatus) {
    if (!selectedOrder) return;
    setUpdating(true);
    try {
      await orderService.updateStatus(selectedOrder.id, status);
      const fresh = await orderService.getById(selectedOrder.id);
      setSelectedOrder(fresh);
      await fetchOrders();
    } catch {
      setError("Không thể cập nhật trạng thái");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Quản lý đơn hàng</h1>
        <p className="text-muted-foreground">
          Tổng {result.meta.total} đơn hàng
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
              <TableHead>Mã đơn</TableHead>
              <TableHead>Khách hàng</TableHead>
              <TableHead>Điện thoại</TableHead>
              <TableHead className="text-right">Tổng tiền</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Ngày tạo</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : result.data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-10 text-muted-foreground"
                >
                  Chưa có đơn hàng nào
                </TableCell>
              </TableRow>
            ) : (
              result.data.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">
                    #{order.orderCode}
                  </TableCell>
                  <TableCell>{order.customerName}</TableCell>
                  <TableCell>{order.customerPhone}</TableCell>
                  <TableCell className="text-right">
                    {formatPrice(Number(order.total))}
                  </TableCell>
                  <TableCell>{statusLabel[order.status]}</TableCell>
                  <TableCell>
                    {new Date(order.createdAt).toLocaleString("vi-VN")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDetail(order.id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>
              {selectedOrder
                ? `Chi tiết đơn #${selectedOrder.orderCode}`
                : "Chi tiết đơn hàng"}
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <p>
                  <span className="text-muted-foreground">Khách hàng:</span>{" "}
                  {selectedOrder.customerName}
                </p>
                <p>
                  <span className="text-muted-foreground">SĐT:</span>{" "}
                  {selectedOrder.customerPhone}
                </p>
                <p className="col-span-2">
                  <span className="text-muted-foreground">Địa chỉ:</span>{" "}
                  {selectedOrder.shippingAddress}
                </p>
                <p>
                  <span className="text-muted-foreground">Thanh toán:</span>{" "}
                  {selectedOrder.paymentMethod.toUpperCase()}
                </p>
                <p>
                  <span className="text-muted-foreground">Trạng thái:</span>{" "}
                  {statusLabel[selectedOrder.status]}
                </p>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sản phẩm</TableHead>
                      <TableHead className="text-right">SL</TableHead>
                      <TableHead className="text-right">Đơn giá</TableHead>
                      <TableHead className="text-right">Thành tiền</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedOrder.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.productName}</TableCell>
                        <TableCell className="text-right">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatPrice(Number(item.unitPrice))}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatPrice(Number(item.lineTotal))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between">
                <p className="font-semibold">Tổng cộng</p>
                <p className="font-semibold text-lg">
                  {formatPrice(Number(selectedOrder.total))}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  disabled={updating}
                  onClick={() => updateStatus("pending")}
                >
                  Pending
                </Button>
                <Button
                  variant="outline"
                  disabled={updating}
                  onClick={() => updateStatus("confirmed")}
                >
                  Confirmed
                </Button>
                <Button
                  variant="outline"
                  disabled={updating}
                  onClick={() => updateStatus("shipping")}
                >
                  Shipping
                </Button>
                <Button
                  variant="outline"
                  disabled={updating}
                  onClick={() => updateStatus("completed")}
                >
                  Completed
                </Button>
                <Button
                  variant="destructive"
                  disabled={updating}
                  onClick={() => updateStatus("cancelled")}
                >
                  Cancelled
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
