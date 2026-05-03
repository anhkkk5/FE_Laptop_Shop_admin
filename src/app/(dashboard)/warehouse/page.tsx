"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  ArrowUpCircle,
  ArrowDownCircle,
  SlidersHorizontal,
  AlertTriangle,
  Search,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { inventoryService, type InventoryItem } from "@/lib/inventory-service";
import { useAuth } from "@/context/auth-context";

function formatNumber(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(n);
}

export default function WarehousePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionProductId, setActionProductId] = useState<number | null>(null);
  const [actionType, setActionType] = useState<"import" | "export" | "adjust" | null>(null);
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    inventoryService
      .getAll(1, 100)
      .then((res) => setItems(res.data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = items.filter((i) =>
    String(i.productName || i.productId).toLowerCase().includes(search.toLowerCase()),
  );

  const lowStock = items.filter((i) => i.availableQty <= 10);

  async function doAction() {
    if (!actionProductId || !actionType) return;
    setBusy(true);
    try {
      if (actionType === "import") {
        await inventoryService.importStock(actionProductId, qty, reason || undefined);
      } else if (actionType === "export") {
        await inventoryService.exportStock(actionProductId, qty, reason || undefined);
      } else if (actionType === "adjust") {
        await inventoryService.adjustStock(actionProductId, qty, "available", reason || undefined);
      }
      const refreshed = await inventoryService.getAll(1, 100);
      setItems(refreshed.data);
      setActionProductId(null);
      setActionType(null);
      setQty(1);
      setReason("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Thao tác thất bại");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Quản lý kho hàng</h1>

      {lowStock.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-semibold">Cảnh báo tồn kho thấp</span>
          </div>
          <ul className="mt-2 space-y-1 text-sm text-amber-700 dark:text-amber-300">
            {lowStock.slice(0, 5).map((i) => (
              <li key={i.id}>
                {i.productName || `Sản phẩm #${i.productId}`} — còn {formatNumber(i.availableQty)}
              </li>
            ))}
            {lowStock.length > 5 && <li>...và {lowStock.length - 5} sản phẩm khác</li>}
          </ul>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm theo tên hoặc ID sản phẩm..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Sản phẩm</th>
              <th className="px-4 py-3 text-right font-medium">Có sẵn</th>
              <th className="px-4 py-3 text-right font-medium">Đã đặt</th>
              <th className="px-4 py-3 text-right font-medium">Hỏng</th>
              <th className="px-4 py-3 text-right font-medium">Incoming</th>
              <th className="px-4 py-3 text-right font-medium">Tổng</th>
              <th className="px-4 py-3 text-right font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id} className="border-t hover:bg-muted/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{item.productName || `SP #${item.productId}`}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">{formatNumber(item.availableQty)}</td>
                <td className="px-4 py-3 text-right">{formatNumber(item.reservedQty)}</td>
                <td className="px-4 py-3 text-right">{formatNumber(item.damagedQty)}</td>
                <td className="px-4 py-3 text-right">{formatNumber(item.incomingQty)}</td>
                <td className="px-4 py-3 text-right font-semibold">
                  {formatNumber(item.availableQty + item.reservedQty + item.damagedQty + item.incomingQty)}
                </td>
                <td className="px-4 py-3 text-right">
                  {isAdmin && (
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setActionProductId(item.productId);
                          setActionType("import");
                        }}
                        title="Nhập kho"
                      >
                        <ArrowUpCircle className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setActionProductId(item.productId);
                          setActionType("export");
                        }}
                        title="Xuất kho"
                      >
                        <ArrowDownCircle className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setActionProductId(item.productId);
                          setActionType("adjust");
                        }}
                        title="Điều chỉnh"
                      >
                        <SlidersHorizontal className="h-4 w-4 text-amber-600" />
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  Không có dữ liệu kho hàng.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {actionType && actionProductId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-xl border bg-card p-5 shadow-lg">
            <h2 className="text-lg font-bold">
              {actionType === "import" && "Nhập kho"}
              {actionType === "export" && "Xuất kho"}
              {actionType === "adjust" && "Điều chỉnh tồn"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Sản phẩm #{actionProductId}
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-sm font-medium">Số lượng</label>
                <Input
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Lý do</label>
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Nhập lý do..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setActionProductId(null);
                    setActionType(null);
                  }}
                  disabled={busy}
                >
                  Hủy
                </Button>
                <Button onClick={doAction} disabled={busy || qty < 1}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Xác nhận"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
