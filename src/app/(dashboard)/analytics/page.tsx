"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { productService, type InventorySummary } from "@/lib/product-service";
import { Button } from "@/components/ui/button";

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [thresholdInput, setThresholdInput] = useState("");
  const [appliedThreshold, setAppliedThreshold] = useState(5);
  const [thresholdReady, setThresholdReady] = useState(false);
  const totalProducts = summary?.totalProducts || 0;
  const outOfStock = summary?.outOfStock || 0;
  const lowStock = summary?.lowStock || 0;
  const outOfStockRate =
    totalProducts > 0 ? Math.round((outOfStock / totalProducts) * 100) : 0;
  const lowStockRate =
    totalProducts > 0 ? Math.round((lowStock / totalProducts) * 100) : 0;

  async function fetchInventoryStats() {
    setLoading(true);
    setError(null);
    try {
      const data = await productService.getInventorySummary(appliedThreshold);
      setSummary(data);
    } catch {
      setError("Không thể tải dữ liệu thống kê tồn kho");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const savedThreshold = window.localStorage.getItem(
      "inventoryLowStockThreshold",
    );
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

  function applyThreshold() {
    const parsed = Number(thresholdInput);
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
        </div>
        <div className="flex items-center gap-2">
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
            disabled={loading}
          >
            Áp dụng
          </Button>
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Tổng sản phẩm</p>
            <p className="text-2xl font-bold mt-1">{totalProducts}</p>
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
        </div>
      )}
    </div>
  );
}
