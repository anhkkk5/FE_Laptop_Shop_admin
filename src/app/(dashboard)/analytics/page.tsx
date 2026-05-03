"use client";

import { useEffect, useRef, useState } from "react";
import {
  Loader2,
  TrendingUp,
  Package,
  ShoppingCart,
  Wrench,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { productService, type InventorySummary } from "@/lib/product-service";
import {
  getDashboardOverview,
  type DashboardOverview,
} from "@/lib/dashboard-service";
import { Button } from "@/components/ui/button";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function AnalyticsPage() {
  const isFetchingRef = useRef(false);
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [dashboard, setDashboard] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [thresholdInput, setThresholdInput] = useState("");
  const [appliedThreshold, setAppliedThreshold] = useState(5);
  const [thresholdReady, setThresholdReady] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [autoRefreshSeconds, setAutoRefreshSeconds] = useState(60);
  const totalProducts = summary?.totalProducts || 0;
  const outOfStock = summary?.outOfStock || 0;
  const lowStock = summary?.lowStock || 0;
  const totalAlerts = summary?.totalAlerts || 0;
  const outOfStockRate = summary?.outOfStockRate || 0;
  const lowStockRate = summary?.lowStockRate || 0;
  const alertRate = summary?.alertRate || 0;
  const parsedThresholdInput = Number(thresholdInput.trim());
  const isThresholdInputValid =
    Number.isInteger(parsedThresholdInput) && parsedThresholdInput > 0;
  const canApplyThreshold =
    isThresholdInputValid && parsedThresholdInput !== appliedThreshold;

  let inventoryHealthLabel = "Ổn định";
  if (alertRate >= 30) inventoryHealthLabel = "Cần chú ý";
  if (alertRate >= 50) inventoryHealthLabel = "Rủi ro cao";

  async function fetchData() {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const [invData, dashData] = await Promise.all([
        productService.getInventorySummary(appliedThreshold),
        getDashboardOverview({ topProductsLimit: 5 }),
      ]);
      setSummary(invData);
      setDashboard(dashData);
      setLastUpdatedAt(new Date(invData.generatedAt).toLocaleString("vi-VN"));
    } catch {
      setError("Không thể tải dữ liệu thống kê");
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }

  useEffect(() => {
    const savedThreshold = window.localStorage.getItem(
      "inventoryLowStockThreshold",
    );
    const savedAutoRefresh = window.localStorage.getItem(
      "inventoryAutoRefreshEnabled",
    );
    const savedAutoRefreshSeconds = window.localStorage.getItem(
      "inventoryAutoRefreshSeconds",
    );

    if (savedAutoRefresh === "true") {
      setAutoRefreshEnabled(true);
    }

    const parsedAutoRefreshSeconds = Number(savedAutoRefreshSeconds);
    if ([30, 60, 120].includes(parsedAutoRefreshSeconds)) {
      setAutoRefreshSeconds(parsedAutoRefreshSeconds);
    }

    if (!savedThreshold) {
      setThresholdInput("5");
      setThresholdReady(true);
      return;
    }

    const parsed = Number(savedThreshold);
    if (Number.isInteger(parsed) && parsed > 0) {
      setThresholdInput(String(parsed));
      setAppliedThreshold(parsed);
      setThresholdReady(true);
      return;
    }

    setThresholdInput("5");
    setThresholdReady(true);
  }, []);

  useEffect(() => {
    if (!thresholdReady) {
      return;
    }

    void fetchData();
  }, [appliedThreshold, thresholdReady]);

  useEffect(() => {
    if (!thresholdReady || !autoRefreshEnabled) {
      return;
    }

    const timer = window.setInterval(() => {
      void fetchData();
    }, autoRefreshSeconds * 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [
    autoRefreshEnabled,
    autoRefreshSeconds,
    thresholdReady,
    appliedThreshold,
  ]);

  const REVENUE_COLORS = [
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#3b82f6",
    "#8b5cf6",
  ];
  const ORDER_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  const revenueChartData =
    dashboard?.revenueByStatus.map((r) => ({
      name: r.status,
      amount: r.amount,
    })) || [];
  const ordersChartData =
    dashboard?.ordersByStatus.map((o) => ({
      name: o.status,
      count: o.count,
    })) || [];

  function applyThreshold() {
    const parsed = Number(thresholdInput.trim());
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Ngưỡng sắp hết phải là số lớn hơn 0");
      return;
    }
    setError(null);
    window.localStorage.setItem(
      "inventoryLowStockThreshold",
      String(Math.floor(parsed)),
    );
    setAppliedThreshold(Math.floor(parsed));
  }

  function resetThreshold() {
    const defaultThreshold = 5;
    setError(null);
    setThresholdInput(String(defaultThreshold));
    window.localStorage.setItem(
      "inventoryLowStockThreshold",
      String(defaultThreshold),
    );
    setAppliedThreshold(defaultThreshold);
  }

  function setQuickThreshold(value: number) {
    setThresholdInput(String(value));
    window.localStorage.setItem("inventoryLowStockThreshold", String(value));
    setError(null);
    setAppliedThreshold(value);
  }

  function toggleAutoRefresh() {
    const next = !autoRefreshEnabled;
    setAutoRefreshEnabled(next);
    window.localStorage.setItem("inventoryAutoRefreshEnabled", String(next));
  }

  function changeAutoRefreshSeconds(value: string) {
    const parsed = Number(value);
    if (![30, 60, 120].includes(parsed)) {
      return;
    }

    setAutoRefreshSeconds(parsed);
    window.localStorage.setItem("inventoryAutoRefreshSeconds", String(parsed));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Thống kê</h1>
          <p className="text-muted-foreground">
            Tổng quan doanh thu, đơn hàng và tồn kho.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Ngưỡng đang áp dụng: ≤ {appliedThreshold}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Cập nhật lần cuối: {lastUpdatedAt || "--"}
          </p>
          <p className="text-xs mt-1">
            Trạng thái kho:{" "}
            <span className="font-medium">{inventoryHealthLabel}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label
            htmlFor="low-stock-threshold"
            className="text-sm text-muted-foreground"
          >
            Ngưỡng sắp hết
          </label>
          <input
            id="low-stock-threshold"
            type="number"
            min={1}
            className="h-9 w-20 rounded-md border border-input bg-background px-2 text-sm"
            value={thresholdInput}
            onChange={(event) => {
              setThresholdInput(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                applyThreshold();
              }
            }}
          />
          <Button
            variant="secondary"
            onClick={applyThreshold}
            disabled={loading || !canApplyThreshold}
          >
            Áp dụng
          </Button>
          <Button variant="ghost" onClick={resetThreshold} disabled={loading}>
            Reset
          </Button>
          <div className="flex items-center gap-1">
            {[3, 5, 10].map((value) => (
              <Button
                key={value}
                variant={appliedThreshold === value ? "default" : "outline"}
                onClick={() => setQuickThreshold(value)}
                disabled={loading}
                className="h-8 px-2 text-xs"
              >
                ≤ {value}
              </Button>
            ))}
          </div>
          <select
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={autoRefreshSeconds}
            onChange={(event) => {
              changeAutoRefreshSeconds(event.target.value);
            }}
            disabled={loading}
          >
            <option value={30}>30s</option>
            <option value={60}>60s</option>
            <option value={120}>120s</option>
          </select>
          <Button
            variant="outline"
            onClick={toggleAutoRefresh}
            disabled={loading}
          >
            {autoRefreshEnabled ? "Tắt tự làm mới" : "Bật tự làm mới"}
          </Button>
          <span className="text-xs text-muted-foreground">
            {autoRefreshEnabled
              ? `Tự làm mới mỗi ${autoRefreshSeconds}s`
              : "Tự làm mới đang tắt"}
          </span>
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            Làm mới
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-lg border py-16">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Dashboard KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                <p className="text-sm text-muted-foreground">Tổng doanh thu</p>
              </div>
              <p className="text-2xl font-bold mt-1">
                {formatCurrency(dashboard?.totalRevenue || 0)}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-blue-600" />
                <p className="text-sm text-muted-foreground">Tổng đơn hàng</p>
              </div>
              <p className="text-2xl font-bold mt-1">
                {dashboard?.orderCount || 0}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-orange-600" />
                <p className="text-sm text-muted-foreground">Tổng sản phẩm</p>
              </div>
              <p className="text-2xl font-bold mt-1">
                {dashboard?.productCount || totalProducts}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-purple-600" />
                <p className="text-sm text-muted-foreground">Bảo hành</p>
              </div>
              <p className="text-2xl font-bold mt-1">
                {dashboard?.warrantyCount || 0}
              </p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border p-4">
              <h3 className="text-sm font-semibold mb-4">
                Doanh thu theo trạng thái
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis
                      tickFormatter={(v) =>
                        new Intl.NumberFormat("vi-VN", {
                          notation: "compact",
                          compactDisplay: "short",
                        }).format(v)
                      }
                    />
                    <Tooltip
                      formatter={(value) => formatCurrency(Number(value))}
                    />
                    <Bar dataKey="amount">
                      {revenueChartData.map((_, index) => (
                        <Cell
                          key={index}
                          fill={REVENUE_COLORS[index % REVENUE_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="text-sm font-semibold mb-4">
                Đơn hàng theo trạng thái
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ordersChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count">
                      {ordersChartData.map((_, index) => (
                        <Cell
                          key={index}
                          fill={ORDER_COLORS[index % ORDER_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Top Products */}
          {dashboard && dashboard.topProducts.length > 0 && (
            <div className="rounded-lg border p-4">
              <h3 className="text-sm font-semibold mb-3">Sản phẩm bán chạy</h3>
              <div className="divide-y">
                {dashboard.topProducts.map((p) => (
                  <div
                    key={p.productId}
                    className="flex items-center justify-between py-2"
                  >
                    <div>
                      <p className="text-sm font-medium">{p.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.totalSold} đã bán
                      </p>
                    </div>
                    <p className="text-sm font-semibold">
                      {formatCurrency(p.revenue)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Orders */}
          {dashboard && dashboard.recentOrders.length > 0 && (
            <div className="rounded-lg border p-4">
              <h3 className="text-sm font-semibold mb-3">Đơn hàng gần đây</h3>
              <div className="divide-y">
                {dashboard.recentOrders.map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center justify-between py-2"
                  >
                    <div>
                      <p className="text-sm font-medium">{o.orderCode}</p>
                      <p className="text-xs text-muted-foreground">
                        {o.customerName}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        {formatCurrency(o.total)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(o.createdAt).toLocaleDateString("vi-VN")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inventory Section */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Tổng sản phẩm</p>
              <p className="text-2xl font-bold mt-1">{totalProducts}</p>
            </div>
            <div className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-4">
              <p className="text-sm text-muted-foreground">
                Tổng cảnh báo tồn kho
              </p>
              <p className="text-2xl font-bold mt-1 text-orange-700">
                {totalAlerts}
              </p>
            </div>
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <p className="text-sm text-muted-foreground">Hết hàng</p>
              <p className="text-2xl font-bold mt-1 text-destructive">
                {outOfStock}
              </p>
            </div>
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
              <p className="text-sm text-muted-foreground">
                Sắp hết (≤ {summary?.lowStockThreshold || 5})
              </p>
              <p className="text-2xl font-bold mt-1 text-amber-700">
                {lowStock}
              </p>
            </div>
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <p className="text-sm text-muted-foreground">Tỷ lệ hết hàng</p>
              <p className="text-2xl font-bold mt-1 text-destructive">
                {outOfStockRate}%
              </p>
            </div>
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
              <p className="text-sm text-muted-foreground">Tỷ lệ sắp hết</p>
              <p className="text-2xl font-bold mt-1 text-amber-700">
                {lowStockRate}%
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
