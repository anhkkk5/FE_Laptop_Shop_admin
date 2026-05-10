"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  ArrowDownToLine,
  ArrowUpFromLine,
  SlidersHorizontal,
  AlertTriangle,
  Search,
  Package,
  X,
  Check,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inventoryService, type InventoryItem } from "@/lib/inventory-service";
import { useAuth } from "@/context/auth-context";

function fmt(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n);
}

type ActionType = "import" | "export" | "adjust";
type AdjustTarget = "available" | "damaged" | "incoming";

interface ActionState {
  type: ActionType;
  item: InventoryItem;
  adjustTarget: AdjustTarget;
}

const ADJUST_TARGETS: { value: AdjustTarget; label: string }[] = [
  { value: "available", label: "Có sẵn (sẵn bán)" },
  { value: "damaged", label: "Hỏng / Lỗi" },
  { value: "incoming", label: "Đang về (Incoming)" },
];

const ACTION_CONFIG = {
  import: {
    label: "Nhập kho",
    icon: ArrowDownToLine,
    color: "text-emerald-600",
    btnClass: "bg-emerald-600 hover:bg-emerald-700",
    desc: "Thêm số lượng vào kho — tăng tồn kho có sẵn",
  },
  export: {
    label: "Xuất kho",
    icon: ArrowUpFromLine,
    color: "text-blue-600",
    btnClass: "bg-blue-600 hover:bg-blue-700",
    desc: "Lấy hàng ra khỏi kho — giảm tồn kho có sẵn",
  },
  adjust: {
    label: "Điều chỉnh tồn",
    icon: SlidersHorizontal,
    color: "text-amber-600",
    btnClass: "bg-amber-600 hover:bg-amber-700",
    desc: "Điều chỉnh số lượng theo loại (có thể âm để giảm)",
  },
} as const;

export default function WarehousePage() {
  const { user } = useAuth();
  const canManage = user?.role === "admin" || user?.role === "warehouse";

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal state
  const [action, setAction] = useState<ActionState | null>(null);
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const loadItems = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await inventoryService.getAll(1, 200);
      setItems(res.data);
    } catch {
      setError("Không thể tải dữ liệu kho hàng");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadItems(); }, [loadItems]);

  const filtered = items.filter((i) =>
    (i.productName || `SP #${i.productId}`)
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const lowStock = items.filter((i) => i.availableQty <= 10);

  function openAction(type: ActionType, item: InventoryItem) {
    setAction({ type, item, adjustTarget: "available" });
    setQty(1);
    setReason("");
    setError(null);
  }

  function closeModal() {
    setAction(null);
    setQty(1);
    setReason("");
  }

  async function handleConfirm() {
    if (!action) return;
    if (qty < 1 && action.type !== "adjust") return;
    setBusy(true);
    setError(null);
    try {
      const { type, item, adjustTarget } = action;
      if (type === "import") {
        await inventoryService.importStock(item.productId, qty, reason || undefined);
      } else if (type === "export") {
        await inventoryService.exportStock(item.productId, qty, reason || undefined);
      } else {
        await inventoryService.adjustStock(item.productId, qty, adjustTarget, reason || undefined);
      }
      closeModal();
      setSuccess(`${ACTION_CONFIG[type].label} thành công!`);
      setTimeout(() => setSuccess(null), 3000);
      await loadItems(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Thao tác thất bại");
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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quản lý kho hàng</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {items.length} sản phẩm · {lowStock.length} cảnh báo tồn thấp
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => loadItems(true)} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
          Làm mới
        </Button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center justify-between rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <span>{error}</span>
          <button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <Check className="h-4 w-4 shrink-0" />{success}
        </div>
      )}

      {/* Low stock warning */}
      {lowStock.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 text-amber-800 font-semibold">
            <AlertTriangle className="h-4 w-4" />
            Cảnh báo tồn kho thấp ({lowStock.length} sản phẩm ≤ 10)
          </div>
          <ul className="mt-2 space-y-0.5 text-sm text-amber-700">
            {lowStock.slice(0, 5).map((i) => (
              <li key={i.id}>
                • {i.productName || `Sản phẩm #${i.productId}`} — còn{" "}
                <span className="font-semibold">{fmt(i.availableQty)}</span>
              </li>
            ))}
            {lowStock.length > 5 && (
              <li className="text-amber-500">...và {lowStock.length - 5} sản phẩm khác</li>
            )}
          </ul>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Tìm theo tên sản phẩm..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/60">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Sản phẩm</th>
              <th className="px-4 py-3 text-right font-medium text-emerald-700">Có sẵn</th>
              <th className="px-4 py-3 text-right font-medium text-blue-700">Đã đặt</th>
              <th className="px-4 py-3 text-right font-medium text-red-700">Hỏng</th>
              <th className="px-4 py-3 text-right font-medium text-amber-700">Incoming</th>
              <th className="px-4 py-3 text-right font-medium">Tổng</th>
              {canManage && <th className="px-4 py-3 text-center font-medium">Thao tác</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => {
              const total = item.availableQty + item.reservedQty + item.damagedQty + item.incomingQty;
              const isLow = item.availableQty <= 10;
              return (
                <tr key={item.id} className="border-t hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div>
                        <p className="font-medium leading-tight">
                          {item.productName || `Sản phẩm #${item.productId}`}
                        </p>
                        <p className="text-xs text-muted-foreground">ID: {item.productId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-semibold ${isLow ? "text-red-600" : "text-emerald-700"}`}>
                      {fmt(item.availableQty)}
                      {isLow && <span className="ml-1 text-xs">⚠</span>}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-blue-700">{fmt(item.reservedQty)}</td>
                  <td className="px-4 py-3 text-right text-red-700">{fmt(item.damagedQty)}</td>
                  <td className="px-4 py-3 text-right text-amber-700">{fmt(item.incomingQty)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{fmt(total)}</td>
                  {canManage && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openAction("import", item)}
                          title="Nhập kho"
                          className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50 transition-colors"
                        >
                          <ArrowDownToLine className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openAction("export", item)}
                          title="Xuất kho"
                          className="rounded-md p-1.5 text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <ArrowUpFromLine className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openAction("adjust", item)}
                          title="Điều chỉnh tồn"
                          className="rounded-md p-1.5 text-amber-600 hover:bg-amber-50 transition-colors"
                        >
                          <SlidersHorizontal className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={canManage ? 7 : 6} className="px-4 py-12 text-center text-muted-foreground">
                  {search ? `Không tìm thấy "${search}"` : "Chưa có dữ liệu kho hàng"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {action && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border bg-card shadow-xl">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div className="flex items-center gap-2">
                {(() => {
                  const cfg = ACTION_CONFIG[action.type];
                  return <cfg.icon className={`h-5 w-5 ${cfg.color}`} />;
                })()}
                <h2 className="font-semibold">{ACTION_CONFIG[action.type].label}</h2>
              </div>
              <button onClick={closeModal} className="rounded-md p-1 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Product info */}
              <div className="rounded-lg bg-muted/40 px-4 py-3">
                <p className="text-xs text-muted-foreground">Sản phẩm</p>
                <p className="font-semibold mt-0.5">
                  {action.item.productName || `Sản phẩm #${action.item.productId}`}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Tồn có sẵn hiện tại:{" "}
                  <span className="font-medium text-foreground">{fmt(action.item.availableQty)}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{ACTION_CONFIG[action.type].desc}</p>
              </div>

              {/* Adjust target selector */}
              {action.type === "adjust" && (
                <div>
                  <Label className="mb-1.5 block">Loại điều chỉnh</Label>
                  <div className="grid grid-cols-1 gap-2">
                    {ADJUST_TARGETS.map((t) => (
                      <label
                        key={t.value}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                          action.adjustTarget === t.value
                            ? "border-primary bg-primary/5"
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="adjustTarget"
                          value={t.value}
                          checked={action.adjustTarget === t.value}
                          onChange={() => setAction({ ...action, adjustTarget: t.value })}
                          className="accent-primary"
                        />
                        <span className="text-sm">{t.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div>
                <Label htmlFor="qty" className="mb-1.5 block">
                  Số lượng
                  {action.type === "adjust" && (
                    <span className="ml-1 text-xs text-muted-foreground">(âm để giảm)</span>
                  )}
                </Label>
                <Input
                  id="qty"
                  type="number"
                  min={action.type === "adjust" ? undefined : 1}
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value))}
                />
              </div>

              {/* Reason */}
              <div>
                <Label htmlFor="reason" className="mb-1.5 block">
                  Lý do <span className="text-muted-foreground">(không bắt buộc)</span>
                </Label>
                <Input
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="VD: Nhập hàng từ nhà cung cấp A"
                />
              </div>

              {error && (
                <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={closeModal} disabled={busy}>
                  Hủy
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={busy || (action.type !== "adjust" && qty < 1)}
                  className={ACTION_CONFIG[action.type].btnClass}
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : ACTION_CONFIG[action.type].label}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
