"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ShoppingCart,
  Laptop,
  DollarSign,
  ShieldCheck,
  CalendarDays,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getDashboardOverview,
  type DashboardOverview,
} from "@/lib/dashboard-service";

function formatVND(n: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(n);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const orderStatusColor: Record<string, string> = {
  pending: "secondary",
  confirmed: "default",
  shipping: "default",
  completed: "default",
  cancelled: "destructive",
};

const orderStatusLabel: Record<string, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  shipping: "Đang giao",
  completed: "Hoàn thành",
  cancelled: "Đã huỷ",
};

const warrantyStatusLabel: Record<string, string> = {
  pending: "Chờ tiếp nhận",
  received: "Đã tiếp nhận",
  diagnosing: "Đang chẩn đoán",
  repairing: "Đang sửa chữa",
  waiting_parts: "Chờ linh kiện",
  completed: "Hoàn thành",
  returned: "Đã trả lại",
  rejected: "Từ chối",
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getDashboardOverview({
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });
      setData(result);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const revenueByStatus = data?.revenueByStatus ?? [];
  const ordersByStatus = data?.ordersByStatus ?? [];
  const warrantyByStatus = data?.warrantyByStatus ?? [];
  const topProducts = data?.topProducts ?? [];
  const recentOrders = data?.recentOrders ?? [];
  const totalRevenue = Number(data?.totalRevenue ?? 0);
  const orderCount = Number(data?.orderCount ?? 0);
  const productCount = Number(data?.productCount ?? 0);
  const warrantyCount = Number(data?.warrantyCount ?? 0);

  const stats = [
    {
      title: "Doanh thu",
      value: data ? formatVND(totalRevenue) : "—",
      icon: DollarSign,
      description: data
        ? `Thành công: ${formatVND(revenueByStatus.find((r) => r.status === "success")?.amount ?? 0)}`
        : "Đang tải...",
    },
    {
      title: "Tổng đơn hàng",
      value: data ? orderCount.toLocaleString("vi-VN") : "—",
      icon: ShoppingCart,
      description: data
        ? `Hoàn thành: ${ordersByStatus.find((o) => o.status === "completed")?.count ?? 0}`
        : "Đang tải...",
    },
    {
      title: "Sản phẩm active",
      value: data ? productCount.toLocaleString("vi-VN") : "—",
      icon: Laptop,
      description: "Đang bán",
    },
    {
      title: "Phiếu bảo hành",
      value: data ? warrantyCount.toLocaleString("vi-VN") : "—",
      icon: ShieldCheck,
      description: data
        ? `Chờ xử lý: ${warrantyByStatus.filter((w) => !["completed", "returned", "rejected"].includes(w.status)).reduce((s, w) => s + w.count, 0)}`
        : "Đang tải...",
    },
  ];

  const maxOrderCount = data
    ? Math.max(...ordersByStatus.map((o) => o.count), 1)
    : 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Tổng quan hoạt động cửa hàng</p>
        </div>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded-md border px-2 py-1 text-sm"
            placeholder="Từ ngày"
          />
          <span className="text-muted-foreground">—</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded-md border px-2 py-1 text-sm"
            placeholder="Đến ngày"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? (
                  <span className="text-muted-foreground">...</span>
                ) : (
                  stat.value
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Orders by status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Đơn hàng theo trạng thái
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data ? (
              ordersByStatus.map((item) => (
                <div key={item.status} className="flex items-center gap-3">
                  <span className="w-28 text-sm">
                    {orderStatusLabel[item.status] ?? item.status}
                  </span>
                  <div className="flex-1">
                    <div
                      className="h-6 rounded bg-primary/80 transition-all"
                      style={{
                        width: `${(item.count / maxOrderCount) * 100}%`,
                        minWidth: item.count > 0 ? "2rem" : "0",
                      }}
                    />
                  </div>
                  <Badge variant={orderStatusColor[item.status] as never}>
                    {item.count}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Đang tải...</p>
            )}
          </CardContent>
        </Card>

        {/* Warranty by status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Bảo hành theo trạng thái
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data ? (
              warrantyByStatus.map((item) => (
                <div key={item.status} className="flex items-center gap-3">
                  <span className="w-28 text-sm">
                    {warrantyStatusLabel[item.status] ?? item.status}
                  </span>
                  <Badge variant="outline">{item.count}</Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Đang tải...</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top products */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sản phẩm bán chạy</CardTitle>
          </CardHeader>
          <CardContent>
            {data && topProducts.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sản phẩm</TableHead>
                    <TableHead className="text-right">Đã bán</TableHead>
                    <TableHead className="text-right">Doanh thu</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProducts.map((p) => (
                    <TableRow key={p.productId}>
                      <TableCell className="font-medium">
                        {p.productName}
                      </TableCell>
                      <TableCell className="text-right">
                        {p.totalSold}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatVND(p.revenue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">
                {loading ? "Đang tải..." : "Chưa có dữ liệu"}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent orders */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Đơn hàng gần đây</CardTitle>
          </CardHeader>
          <CardContent>
            {data && recentOrders.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã đơn</TableHead>
                    <TableHead>Khách hàng</TableHead>
                    <TableHead className="text-right">Tổng</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Ngày tạo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-medium">
                        {o.orderCode}
                      </TableCell>
                      <TableCell>{o.customerName}</TableCell>
                      <TableCell className="text-right">
                        {formatVND(o.total)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={orderStatusColor[o.status] as never}>
                          {orderStatusLabel[o.status] ?? o.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(o.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">
                {loading ? "Đang tải..." : "Chưa có dữ liệu"}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
