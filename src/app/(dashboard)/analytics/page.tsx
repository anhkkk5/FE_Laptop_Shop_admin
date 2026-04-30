"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { productService, type InventorySummary } from "@/lib/product-service";
import { Button } from "@/components/ui/button";

export default function AnalyticsPage() {
  const isFetchingRef = useRef(false);
  const [summary, setSummary] = useState<InventorySummary | null>(null);
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
  if (alertRate >= 30) {
    inventoryHealthLabel = "Cần chú ý";
  }
  if (alertRate >= 50) {
    inventoryHealthLabel = "Rủi ro cao";
  }

  async function fetchInventoryStats() {
    if (isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const data = await productService.getInventorySummary(appliedThreshold);
      setSummary(data);
      setLastUpdatedAt(new Date(data.generatedAt).toLocaleString("vi-VN"));
    } catch {
      setError("Không thể tải dữ liệu thống kê tồn kho");
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

    void fetchInventoryStats();
  }, [appliedThreshold, thresholdReady]);

  useEffect(() => {
    if (!thresholdReady || !autoRefreshEnabled) {
      return;
    }

    const timer = window.setInterval(() => {
      void fetchInventoryStats();
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
            Tổng quan tồn kho sản phẩm cho quản trị viên.
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
          <Button
            variant="outline"
            onClick={fetchInventoryStats}
            disabled={loading}
          >
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
            <p className="text-2xl font-bold mt-1 text-amber-700">{lowStock}</p>
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
          <div className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-4">
            <p className="text-sm text-muted-foreground">Tỷ lệ cảnh báo</p>
            <p className="text-2xl font-bold mt-1 text-orange-700">
              {alertRate}%
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
