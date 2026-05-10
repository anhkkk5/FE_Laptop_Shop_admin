"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Loader2, X, Check, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  productService,
  type ProductVariant,
  type CreateVariantPayload,
} from "@/lib/product-service";

function fmt(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n);
}

const emptyForm = (): CreateVariantPayload => ({
  name: "",
  sku: "",
  price: undefined,
  salePrice: undefined,
  stockQuantity: 0,
  attributes: {},
  isActive: true,
  sortOrder: 0,
});

interface AttrRow {
  key: string;
  value: string;
}

function attrsToRows(attrs: Record<string, string>): AttrRow[] {
  const rows = Object.entries(attrs).map(([key, value]) => ({ key, value }));
  return rows.length ? rows : [{ key: "", value: "" }];
}

function rowsToAttrs(rows: AttrRow[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const r of rows) {
    if (r.key.trim()) result[r.key.trim()] = r.value;
  }
  return result;
}

// ─── Variant form modal ───────────────────────────────────────────────────────

function VariantFormModal({
  productId,
  productName,
  variant,
  onClose,
  onSaved,
}: {
  productId: number;
  productName: string;
  variant: ProductVariant | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<CreateVariantPayload>(
    variant
      ? {
          name: variant.name,
          sku: variant.sku ?? "",
          price: variant.price ?? undefined,
          salePrice: variant.salePrice ?? undefined,
          stockQuantity: variant.stockQuantity,
          attributes: variant.attributes,
          isActive: variant.isActive,
          sortOrder: variant.sortOrder,
        }
      : emptyForm(),
  );
  const [attrRows, setAttrRows] = useState<AttrRow[]>(
    attrsToRows(variant?.attributes ?? {}),
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function updateAttr(idx: number, field: "key" | "value", val: string) {
    setAttrRows((rows) =>
      rows.map((r, i) => (i === idx ? { ...r, [field]: val } : r)),
    );
  }

  function addAttrRow() {
    setAttrRows((rows) => [...rows, { key: "", value: "" }]);
  }

  function removeAttrRow(idx: number) {
    setAttrRows((rows) => rows.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setErr("Tên phiên bản không được để trống");
      return;
    }
    setBusy(true);
    setErr(null);
    const payload: CreateVariantPayload = {
      ...form,
      attributes: rowsToAttrs(attrRows),
      sku: form.sku || undefined,
      price: form.price || undefined,
      salePrice: form.salePrice || undefined,
    };
    try {
      if (variant) {
        await productService.updateVariant(productId, variant.id, payload);
      } else {
        await productService.createVariant(productId, payload);
      }
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Lưu thất bại");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h3 className="font-semibold">
            {variant ? "Sửa phiên bản" : "Thêm phiên bản"} — {productName}
          </h3>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {err && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="mb-1.5 block text-xs">Tên phiên bản *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="VD: 16GB / 512GB SSD / Xám"
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">SKU</Label>
              <Input
                value={form.sku ?? ""}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                placeholder="Không bắt buộc"
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">Tồn kho *</Label>
              <Input
                type="number"
                min={0}
                value={form.stockQuantity}
                onChange={(e) => setForm({ ...form, stockQuantity: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">Giá riêng (đ) <span className="text-muted-foreground">— để trống dùng giá gốc</span></Label>
              <Input
                type="number"
                min={0}
                value={form.price ?? ""}
                onChange={(e) => setForm({ ...form, price: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="Giá sản phẩm"
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">Giá khuyến mãi (đ)</Label>
              <Input
                type="number"
                min={0}
                value={form.salePrice ?? ""}
                onChange={(e) => setForm({ ...form, salePrice: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="Không bắt buộc"
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">Thứ tự</Label>
              <Input
                type="number"
                min={0}
                value={form.sortOrder ?? 0}
                onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
              />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive ?? true}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="accent-primary"
              />
              <label htmlFor="isActive" className="text-sm">Đang bán</label>
            </div>
          </div>

          {/* Attributes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs">Thuộc tính <span className="text-muted-foreground">(RAM, Storage, Color...)</span></Label>
              <button onClick={addAttrRow} className="text-xs text-primary hover:underline flex items-center gap-1">
                <Plus className="h-3 w-3" /> Thêm
              </button>
            </div>
            <div className="space-y-1.5">
              {attrRows.map((row, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    className="flex-1"
                    placeholder="Tên (VD: RAM)"
                    value={row.key}
                    onChange={(e) => updateAttr(idx, "key", e.target.value)}
                  />
                  <Input
                    className="flex-1"
                    placeholder="Giá trị (VD: 16GB)"
                    value={row.value}
                    onChange={(e) => updateAttr(idx, "value", e.target.value)}
                  />
                  <button
                    onClick={() => removeAttrRow(idx)}
                    className="rounded-md p-1.5 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t px-5 py-4">
          <Button variant="outline" onClick={onClose} disabled={busy}>Hủy</Button>
          <Button onClick={handleSave} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
            Lưu
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main VariantManager dialog ───────────────────────────────────────────────

export function VariantManager({
  productId,
  productName,
  open,
  onClose,
}: {
  productId: number;
  productName: string;
  open: boolean;
  onClose: () => void;
}) {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null | "new">(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const loadVariants = useCallback(async () => {
    setLoading(true);
    try {
      const data = await productService.getVariants(productId);
      setVariants(data);
    } catch {
      setErr("Không thể tải phiên bản");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    if (open) void loadVariants();
  }, [open, loadVariants]);

  async function handleDelete(variantId: number) {
    setDeleting(variantId);
    try {
      await productService.deleteVariant(productId, variantId);
      setVariants((v) => v.filter((x) => x.id !== variantId));
    } catch {
      setErr("Xóa thất bại");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-muted-foreground" />
              Phiên bản — {productName}
            </DialogTitle>
          </DialogHeader>

          {err && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {err}
            </p>
          )}

          <div className="space-y-3">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setEditingVariant("new")}>
                <Plus className="h-4 w-4 mr-1.5" /> Thêm phiên bản
              </Button>
            </div>

            {loading ? (
              <div className="flex h-24 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : variants.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                Chưa có phiên bản nào. Nhấn "Thêm phiên bản" để bắt đầu.
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2.5 text-left font-medium">Tên</th>
                      <th className="px-3 py-2.5 text-left font-medium text-xs text-muted-foreground">Thuộc tính</th>
                      <th className="px-3 py-2.5 text-right font-medium">Giá</th>
                      <th className="px-3 py-2.5 text-right font-medium">Tồn</th>
                      <th className="px-3 py-2.5 text-center font-medium">Trạng thái</th>
                      <th className="px-3 py-2.5 text-center font-medium">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variants.map((v) => (
                      <tr key={v.id} className="border-t hover:bg-muted/20">
                        <td className="px-3 py-2.5 font-medium">{v.name}</td>
                        <td className="px-3 py-2.5 max-w-[160px]">
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(v.attributes).map(([k, val]) => (
                              <span key={k} className="rounded bg-muted px-1.5 py-0.5 text-xs">
                                {k}: {val}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right text-xs">
                          {v.salePrice ? (
                            <span className="text-destructive font-medium">{fmt(v.salePrice)}đ</span>
                          ) : v.price ? (
                            <span>{fmt(v.price)}đ</span>
                          ) : (
                            <span className="text-muted-foreground">Theo SP</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <span className={v.stockQuantity <= 0 ? "text-destructive font-medium" : v.stockQuantity <= 5 ? "text-amber-600 font-medium" : ""}>
                            {v.stockQuantity}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`text-xs font-medium ${v.isActive ? "text-emerald-700" : "text-muted-foreground"}`}>
                            {v.isActive ? "Đang bán" : "Ẩn"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setEditingVariant(v)}
                              className="rounded-md p-1 text-muted-foreground hover:text-foreground"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(v.id)}
                              disabled={deleting === v.id}
                              className="rounded-md p-1 text-muted-foreground hover:text-destructive"
                            >
                              {deleting === v.id
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <Trash2 className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {editingVariant !== null && (
        <VariantFormModal
          productId={productId}
          productName={productName}
          variant={editingVariant === "new" ? null : editingVariant}
          onClose={() => setEditingVariant(null)}
          onSaved={() => {
            setEditingVariant(null);
            void loadVariants();
          }}
        />
      )}
    </>
  );
}
