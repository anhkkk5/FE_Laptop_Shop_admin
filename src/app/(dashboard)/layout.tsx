"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Laptop,
  ShoppingCart,
  BarChart3,
  Settings,
  LogOut,
  ShieldCheck,
  ChevronLeft,
  Menu,
  FolderTree,
  Tag,
  Wrench,
  MessageSquare,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";

const sidebarItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/categories", label: "Danh mục", icon: FolderTree },
  { href: "/brands", label: "Thương hiệu", icon: Tag },
  { href: "/products", label: "Sản phẩm", icon: Laptop },
  { href: "/users", label: "Người dùng", icon: Users },
  { href: "/orders", label: "Đơn hàng", icon: ShoppingCart },
  { href: "/warranty", label: "Bảo hành", icon: Wrench },
  { href: "/reviews", label: "Đánh giá", icon: MessageSquare },
  { href: "/analytics", label: "Thống kê", icon: BarChart3 },
  { href: "/settings", label: "Cài đặt", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col border-r bg-card transition-all duration-300
          lg:relative lg:z-auto
          ${collapsed ? "w-[68px]" : "w-64"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          {!collapsed && (
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <span className="text-sm font-bold tracking-tight">
                Admin Panel
              </span>
            </Link>
          )}
          <button
            onClick={() => {
              setCollapsed(!collapsed);
              setMobileOpen(false);
            }}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <ChevronLeft
              className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`}
            />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {sidebarItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`
                  flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
                  ${isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"}
                  ${collapsed ? "justify-center px-2" : ""}
                `}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t p-3">
          {!collapsed && user && (
            <div className="mb-2 rounded-lg bg-muted/50 px-3 py-2">
              <p className="text-xs font-medium truncate">
                {user.fullName || user.email}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user.email}
              </p>
            </div>
          )}
          <Button
            variant="ghost"
            onClick={logout}
            className={`w-full text-muted-foreground hover:text-destructive ${collapsed ? "justify-center px-2" : "justify-start gap-3"}`}
            title={collapsed ? "Đăng xuất" : undefined}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="text-sm">Đăng xuất</span>}
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center gap-4 border-b bg-card px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-semibold tracking-tight">
            {sidebarItems.find(
              (item) =>
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href)),
            )?.label || "Dashboard"}
          </h2>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
