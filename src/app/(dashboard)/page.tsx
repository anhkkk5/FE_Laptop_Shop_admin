"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ShoppingCart,
  Laptop,
  DollarSign,
  ShieldCheck,
  CalendarDays,
  ClipboardList,
  Package,
  Wrench,
  ArrowRight,
  UserCog,
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
import { staffService } from "@/lib/staff-service";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";

type AdminUserMetrics = {
  total: number;
  internal: number;
  verified: number;
};

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
  const { user } = useAuth();
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminUserMetrics, setAdminUserMetrics] = useState<AdminUserMetrics>({
    total: 0,
    internal: 0,
    verified: 0,
  });
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

  useEffect(() => {
    async function fetchAdminUsers() {
      if (user?.role !== "admin") return;
      try {
        const response = await staffService.getAll({ limit: 200 });
        const internalRoles = new Set([
          "admin",
          "staff",
          "technician",
          "warehouse",
        ]);
        const internal = response.data.filter((item) =>
          internalRoles.has(item.role),
        ).length;
        const verified = response.data.filter((item) => item.isVerified).length;
        setAdminUserMetrics({
          total: response.data.length,
          internal,
          verified,
        });
      } catch {
        setAdminUserMetrics({ total: 0, internal: 0, verified: 0 });
      }
    }

    void fetchAdminUsers();
  }, [user?.role]);

  const revenueByStatus = data?.revenueByStatus ?? [];
  const ordersByStatus = data?.ordersByStatus ?? [];
  const warrantyByStatus = data?.warrantyByStatus ?? [];
  const topProducts = data?.topProducts ?? [];
  const recentOrders = data?.recentOrders ?? [];
  const totalRevenue = Number(data?.totalRevenue ?? 0);
  const orderCount = Number(data?.orderCount ?? 0);
  const productCount = Number(data?.productCount ?? 0);
  const warrantyCount = Number(data?.warrantyCount ?? 0);
  const pendingOrders =
    ordersByStatus.find((o) => o.status === "pending")?.count ?? 0;
  const shippingOrders =
    ordersByStatus.find((o) => o.status === "shipping")?.count ?? 0;
  const warehouseBacklog = ordersByStatus
    .filter((o) =>
      ["confirmed", "processing", "ready_to_ship"].includes(o.status),
    )
    .reduce((total, item) => total + item.count, 0);
  const activeWarranty = warrantyByStatus
    .filter(
      (item) => !["completed", "returned", "rejected"].includes(item.status),
    )
    .reduce((total, item) => total + item.count, 0);

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

  const role = user?.role;
  const roleTitle: Record<string, string> = {
    admin: "Bảng điều hành quản trị",
    staff: "Bảng vận hành chăm sóc khách hàng",
    warehouse: "Bảng điều phối kho",
    technician: "Bảng theo dõi kỹ thuật",
  };

  const quickActionsByRole: Record<
    string,
    Array<{ href: string; label: string; description: string }>
  > = {
    admin: [
      {
        href: "/analytics",
        label: "Xem phân tích tổng hợp",
        description: "Theo dõi doanh thu, tồn kho và hiệu suất vận hành",
      },
      {
        href: "/users",
        label: "Quản trị người dùng",
        description: "Kiểm soát tài khoản và phân quyền nội bộ",
      },
      {
        href: "/settings",
        label: "Cấu hình hệ thống",
        description: "Điều chỉnh tham số hệ thống và chính sách",
      },
    ],
    staff: [
      {
        href: "/orders",
        label: "Xử lý đơn hàng",
        description: "Xác nhận đơn mới, hoàn tất đơn đã giao",
      },
      {
        href: "/coupons",
        label: "Quản lý ưu đãi",
        description: "Theo dõi mã giảm giá và chiến dịch bán hàng",
      },
      {
        href: "/notifications",
        label: "Trung tâm thông báo",
        description: "Theo dõi cảnh báo thanh toán và ticket mới",
      },
    ],
    warehouse: [
      {
        href: "/warehouse",
        label: "Điều phối tồn kho",
        description: "Nhập, xuất và điều chỉnh số lượng theo ca",
      },
      {
        href: "/products",
        label: "Tra cứu sản phẩm",
        description: "Kiểm tra mã hàng và tồn theo sản phẩm",
      },
    ],
    technician: [
      {
        href: "/technician",
        label: "Danh sách ticket của tôi",
        description: "Xử lý ticket được giao theo độ ưu tiên",
      },
      {
        href: "/warranty",
        label: "Theo dõi bảo hành",
        description: "Giám sát luồng received → diagnosing → repairing",
      },
    ],
  };

  const roleStatsByRole: Record<
    string,
    Array<{
      title: string;
      value: string;
      icon: typeof ShoppingCart;
      description: string;
    }>
  > = {
    admin: [
      {
        title: "Tổng doanh thu",
        value: data ? formatVND(totalRevenue) : "—",
        icon: DollarSign,
        description: "Toàn bộ doanh thu đã ghi nhận",
      },
      {
        title: "Tổng đơn hàng",
        value: data ? orderCount.toLocaleString("vi-VN") : "—",
        icon: ShoppingCart,
        description: `${pendingOrders} đơn chờ xác nhận`,
      },
      {
        title: "Sản phẩm hoạt động",
        value: data ? productCount.toLocaleString("vi-VN") : "—",
        icon: Laptop,
        description: "Danh mục đang kinh doanh",
      },
      {
        title: "Ticket bảo hành mở",
        value: data ? activeWarranty.toLocaleString("vi-VN") : "—",
        icon: ShieldCheck,
        description: "Ticket cần theo dõi liên phòng ban",
      },
    ],
    staff: [
      {
        title: "Đơn chờ xác nhận",
        value: pendingOrders.toLocaleString("vi-VN"),
        icon: ClipboardList,
        description: "Ưu tiên xử lý ngay trong ca",
      },
      {
        title: "Đơn đang giao",
        value: shippingOrders.toLocaleString("vi-VN"),
        icon: ShoppingCart,
        description: "Theo dõi để chốt delivered/completed",
      },
      {
        title: "Doanh thu kỳ chọn",
        value: data ? formatVND(totalRevenue) : "—",
        icon: DollarSign,
        description: "Tổng doanh thu theo bộ lọc ngày",
      },
    ],
    warehouse: [
      {
        title: "Backlog kho",
        value: warehouseBacklog.toLocaleString("vi-VN"),
        icon: Package,
        description: "Đơn confirmed/processing/ready_to_ship",
      },
      {
        title: "Sản phẩm hoạt động",
        value: productCount.toLocaleString("vi-VN"),
        icon: Laptop,
        description: "Sản phẩm cần theo dõi tồn kho",
      },
      {
        title: "Đơn đã xuất giao",
        value: shippingOrders.toLocaleString("vi-VN"),
        icon: ShoppingCart,
        description: "Đơn đã rời kho",
      },
    ],
    technician: [
      {
        title: "Ticket đang xử lý",
        value: activeWarranty.toLocaleString("vi-VN"),
        icon: Wrench,
        description: "Tổng ticket chưa kết thúc",
      },
      {
        title: "Ticket hoàn thành",
        value: (
          warrantyByStatus.find((item) => item.status === "completed")?.count ??
          0
        ).toLocaleString("vi-VN"),
        icon: ShieldCheck,
        description: "Đã sửa xong, chờ hoặc đã trả khách",
      },
      {
        title: "Ticket chờ linh kiện",
        value: (
          warrantyByStatus.find((item) => item.status === "waiting_parts")
            ?.count ?? 0
        ).toLocaleString("vi-VN"),
        icon: Package,
        description: "Cần phối hợp kho để xử lý nhanh",
      },
    ],
  };

  const roleStats = role
    ? (roleStatsByRole[role] ?? roleStatsByRole.admin)
    : roleStatsByRole.admin;
  const quickActions = role
    ? (quickActionsByRole[role] ?? quickActionsByRole.admin)
    : quickActionsByRole.admin;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {role ? (roleTitle[role] ?? "Dashboard") : "Dashboard"}
          </h1>
          <p className="text-muted-foreground">
            {role === "staff" &&
              "Theo dõi trạng thái đơn và ưu tiên vận hành trong ngày"}
            {role === "warehouse" &&
              "Giám sát backlog kho và tiến độ xuất hàng"}
            {role === "technician" &&
              "Ưu tiên ticket bảo hành theo trạng thái xử lý"}
            {role === "admin" &&
              "Tổng quan hoạt động đa phòng ban theo thời gian thực"}
            {!role && "Tổng quan hoạt động cửa hàng"}
          </p>
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
        {roleStats.map((stat) => (
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Hành động trọng tâm theo vai trò
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group rounded-lg border p-4 transition-colors hover:bg-muted/40"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">{action.label}</p>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {action.description}
              </p>
            </Link>
          ))}
        </CardContent>
      </Card>

      {role === "admin" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserCog className="h-4 w-4" />
              Quản trị tài khoản nội bộ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Tổng tài khoản</p>
                <p className="mt-1 text-xl font-semibold">
                  {adminUserMetrics.total}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">
                  Tài khoản nội bộ
                </p>
                <p className="mt-1 text-xl font-semibold">
                  {adminUserMetrics.internal}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Đã xác minh</p>
                <p className="mt-1 text-xl font-semibold">
                  {adminUserMetrics.verified}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/users"
                className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
              >
                Mở quản lý user
              </Link>
              <span className="inline-flex h-9 items-center rounded-md border px-3 text-xs text-muted-foreground">
                Có thể tạo tài khoản test không cần verify email
              </span>
            </div>
          </CardContent>
        </Card>
      )}

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
