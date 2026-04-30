"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { productService, type Product } from "@/lib/product-service";
import { Button } from "@/components/ui/button";

const LOW_STOCK_THRESHOLD = 5;

export default function AnalyticsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchInventoryStats() {
    setLoading(true);
    setError(null);
    try {
      const res = await productService.getAll({ page: 1, limit: 1000 });
      setProducts(res.data);
    } catch {
      setError("Không thể tải dữ liệu thống kê tồn kho");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchInventoryStats();
  }, []);

  const stats = useMemo(() => {
    const total = products.length;
    const outOfStock = products.filter((p) => p.stockQuantity <= 0).length;
    const lowStock = products.filter(
      (p) => p.stockQuantity > 0 && p.stockQuantity <= LOW_STOCK_THRESHOLD,
    ).length;

    return { total, outOfStock, lowStock };
  }, [products]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Thống kê</h1>
          <p className="text-muted-foreground">
            Tổng quan tồn kho sản phẩm cho quản trị viên.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={fetchInventoryStats}
          disabled={loading}
        >
          Làm mới
        </Button>
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Tổng sản phẩm</p>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </div>
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <p className="text-sm text-muted-foreground">Hết hàng</p>
            <p className="text-2xl font-bold mt-1 text-destructive">
              {stats.outOfStock}
            </p>
          </div>
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
            <p className="text-sm text-muted-foreground">Sắp hết (≤ 5)</p>
            <p className="text-2xl font-bold mt-1 text-amber-700">
              {stats.lowStock}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
