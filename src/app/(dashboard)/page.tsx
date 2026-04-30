"use client";

import {
  Users,
  ShoppingCart,
  Laptop,
  DollarSign,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const stats = [
  {
    title: "Tổng người dùng",
    value: "—",
    icon: Users,
    description: "Đang tải...",
  },
  {
    title: "Tổng đơn hàng",
    value: "—",
    icon: ShoppingCart,
    description: "Đang tải...",
  },
  {
    title: "Tổng sản phẩm",
    value: "—",
    icon: Laptop,
    description: "Đang tải...",
  },
  {
    title: "Doanh thu",
    value: "—",
    icon: DollarSign,
    description: "Đang tải...",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Tổng quan hoạt động cửa hàng
        </p>
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
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Chào mừng đến Admin Panel</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Đây là trang quản trị của Smart Laptop Store. Các module quản lý
            sản phẩm, đơn hàng, người dùng sẽ được triển khai ở các phase tiếp theo.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
