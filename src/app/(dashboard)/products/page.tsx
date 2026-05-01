"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
  Package,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  productService,
  type Product,
  type ProductQueryParams,
  type PaginatedResult,
  type CreateProductPayload,
} from "@/lib/product-service";
import { useAuth } from "@/context/auth-context";
import { categoryService, type Category } from "@/lib/category-service";
import { brandService, type Brand } from "@/lib/brand-service";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);
}

const statusLabels: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  active: { label: "Đang bán", variant: "default" },
  draft: { label: "Nháp", variant: "secondary" },
  out_of_stock: { label: "Hết hàng", variant: "destructive" },
  discontinued: { label: "Ngừng bán", variant: "outline" },
};

const LOW_STOCK_THRESHOLD = 5;

const emptyForm: CreateProductPayload & { id?: number } = {
  name: "",
  slug: "",
  description: "",
  shortDescription: "",
  price: 0,
  salePrice: undefined,
  sku: "",
  stockQuantity: 0,
  categoryId: undefined,
  brandId: undefined,
  status: "draft",
  isFeatured: false,
  sortOrder: 0,
};

export default function ProductsPage() {
  const { hasRole } = useAuth();
  const canManageProducts = hasRole("admin");
  const [result, setResult] = useState<PaginatedResult<Product>>({
    data: [],
    meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState<ProductQueryParams>({
    page: 1,
    limit: 10,
  });
  const [searchInput, setSearchInput] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stockFilter, setStockFilter] = useState<"all" | "out" | "low">("all");

  const fetchProducts = useCallback(async (q: ProductQueryParams) => {
    setLoading(true);
    try {
      const data = await productService.getAll(q);
      setResult(data);
    } catch {
      setError("Không thể tải sản phẩm");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMeta = useCallback(async () => {
    const [cats, brs] = await Promise.all([
      categoryService.getAll(),
      brandService.getAll(),
    ]);
    setCategories(cats);
    setBrands(brs);
  }, []);

  useEffect(() => {
    fetchMeta();
  }, [fetchMeta]);

  useEffect(() => {
    fetchProducts(query);
  }, [query, fetchProducts]);

  function handleSearch() {
    setQuery((q) => ({ ...q, page: 1, search: searchInput || undefined }));
  }

  function openCreate() {
    if (!canManageProducts) return;
    setForm(emptyForm);
    setEditing(false);
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(p: Product) {
    if (!canManageProducts) return;
    setForm({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description || "",
      shortDescription: p.shortDescription || "",
      price: p.price,
      salePrice: p.salePrice || undefined,
      sku: p.sku || "",
      stockQuantity: p.stockQuantity,
      categoryId: p.categoryId || undefined,
      brandId: p.brandId || undefined,
      status: p.status,
      isFeatured: p.isFeatured,
      sortOrder: p.sortOrder,
    });
    setEditing(true);
    setError(null);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!canManageProducts) return;
    setSaving(true);
    setError(null);
    try {
      const payload = { ...form };
      const id = payload.id;
      delete (payload as Record<string, unknown>).id;
      if (!payload.categoryId) delete payload.categoryId;
      if (!payload.brandId) delete payload.brandId;
      if (!payload.salePrice) delete payload.salePrice;

      if (editing && id) {
        await productService.update(id, payload);
      } else {
        await productService.create(payload as CreateProductPayload);
      }
      setDialogOpen(false);
      await fetchProducts(query);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi khi lưu");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!canManageProducts) return;
    if (!deleting) return;
    try {
      await productService.delete(deleting);
      setDeleteDialogOpen(false);
      setDeleting(null);
      await fetchProducts(query);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xóa");
    }
  }

  const { data: products, meta } = result;
  const filteredProducts = products.filter((p) => {
    if (stockFilter === "out") return p.stockQuantity <= 0;
    if (stockFilter === "low") {
      return p.stockQuantity > 0 && p.stockQuantity <= LOW_STOCK_THRESHOLD;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sản phẩm</h1>
          <p className="text-muted-foreground">
            Quản lý sản phẩm ({meta.total} sản phẩm)
          </p>
        </div>
        {canManageProducts && (
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Thêm sản phẩm
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex gap-2">
          <Input
            placeholder="Tìm kiếm..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-64"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleSearch}
            className="gap-1 h-9"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <select
          className="flex h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          value={query.categoryId || ""}
          onChange={(e) =>
            setQuery((q) => ({
              ...q,
              page: 1,
              categoryId: e.target.value ? Number(e.target.value) : undefined,
            }))
          }
        >
          <option value="">Tất cả danh mục</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className="flex h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          value={query.brandId || ""}
          onChange={(e) =>
            setQuery((q) => ({
              ...q,
              page: 1,
              brandId: e.target.value ? Number(e.target.value) : undefined,
            }))
          }
        >
          <option value="">Tất cả thương hiệu</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <select
          className="flex h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          value={query.status || ""}
          onChange={(e) =>
            setQuery((q) => ({
              ...q,
              page: 1,
              status: e.target.value || undefined,
            }))
          }
        >
          <option value="">Tất cả trạng thái</option>
          <option value="active">Đang bán</option>
          <option value="draft">Nháp</option>
          <option value="out_of_stock">Hết hàng</option>
          <option value="discontinued">Ngừng bán</option>
        </select>
        <select
          className="flex h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          value={stockFilter}
          onChange={(e) =>
            setStockFilter(e.target.value as "all" | "out" | "low")
          }
        >
          <option value="all">Tất cả tồn kho</option>
          <option value="out">Hết hàng</option>
          <option value="low">Sắp hết (≤ {LOW_STOCK_THRESHOLD})</option>
        </select>
      </div>

      {error && !dialogOpen && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">ID</TableHead>
              <TableHead>Tên sản phẩm</TableHead>
              <TableHead>Danh mục</TableHead>
              <TableHead>Thương hiệu</TableHead>
              <TableHead className="text-right">Giá</TableHead>
              <TableHead className="w-16 text-center">Kho</TableHead>
              <TableHead className="w-24 text-center">Trạng thái</TableHead>
              <TableHead className="w-28 text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-10 text-muted-foreground"
                >
                  <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  Không có sản phẩm phù hợp bộ lọc hiện tại
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((p) => {
                const st = statusLabels[p.status] || statusLabels.draft;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.id}</TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium">{p.name}</span>
                        {p.isFeatured && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Nổi bật
                          </Badge>
                        )}
                      </div>
                      {p.sku && (
                        <span className="text-xs text-muted-foreground">
                          SKU: {p.sku}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {p.category?.name || "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {p.brand?.name || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div>
                        {p.salePrice ? (
                          <>
                            <span className="font-medium text-destructive">
                              {formatPrice(p.salePrice)}
                            </span>
                            <br />
                            <span className="text-xs text-muted-foreground line-through">
                              {formatPrice(p.price)}
                            </span>
                          </>
                        ) : (
                          <span className="font-medium">
                            {formatPrice(p.price)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="inline-flex flex-col items-center gap-1">
                        <span className="font-medium">{p.stockQuantity}</span>
                        {p.stockQuantity <= 0 ? (
                          <Badge variant="destructive" className="text-[10px]">
                            Hết hàng
                          </Badge>
                        ) : p.stockQuantity <= LOW_STOCK_THRESHOLD ? (
                          <Badge className="bg-amber-500/10 text-amber-700 text-[10px]">
                            Sắp hết
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {canManageProducts ? (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(p)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              setDeleting(p.id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Chỉ xem
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Trang {meta.page}/{meta.totalPages} — {meta.total} sản phẩm
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={meta.page <= 1}
              onClick={() =>
                setQuery((q) => ({ ...q, page: (q.page || 1) - 1 }))
              }
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={meta.page >= meta.totalPages}
              onClick={() =>
                setQuery((q) => ({ ...q, page: (q.page || 1) + 1 }))
              }
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Sửa sản phẩm" : "Thêm sản phẩm"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {error && dialogOpen && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Tên sản phẩm *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setForm((f) => ({
                      ...f,
                      name,
                      slug: editing ? f.slug : slugify(name),
                    }));
                  }}
                  placeholder="ASUS ROG Strix G16"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Slug *</Label>
                <Input
                  value={form.slug}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, slug: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Mô tả ngắn</Label>
                <Textarea
                  value={form.shortDescription || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, shortDescription: e.target.value }))
                  }
                  rows={2}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Mô tả chi tiết</Label>
                <Textarea
                  value={form.description || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label>Giá (VNĐ) *</Label>
                <Input
                  type="number"
                  value={form.price}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, price: Number(e.target.value) }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Giá khuyến mãi</Label>
                <Input
                  type="number"
                  value={form.salePrice || ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      salePrice: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>SKU</Label>
                <Input
                  value={form.sku || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, sku: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Tồn kho</Label>
                <Input
                  type="number"
                  value={form.stockQuantity}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      stockQuantity: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Danh mục</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  value={form.categoryId || ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      categoryId: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    }))
                  }
                >
                  <option value="">Chọn danh mục</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Thương hiệu</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  value={form.brandId || ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      brandId: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    }))
                  }
                >
                  <option value="">Chọn thương hiệu</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Trạng thái</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, status: e.target.value }))
                  }
                >
                  <option value="draft">Nháp</option>
                  <option value="active">Đang bán</option>
                  <option value="out_of_stock">Hết hàng</option>
                  <option value="discontinued">Ngừng bán</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Thứ tự</Label>
                <Input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      sortOrder: Number(e.target.value),
                    }))
                  }
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.isFeatured}
                onCheckedChange={(v) =>
                  setForm((f) => ({ ...f, isFeatured: v }))
                }
              />
              <Label>Sản phẩm nổi bật</Label>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Hủy</Button>
            </DialogClose>
            <Button
              onClick={handleSave}
              disabled={
                !canManageProducts ||
                saving ||
                !form.name ||
                !form.slug ||
                !form.price
              }
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Cập nhật" : "Tạo mới"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Xác nhận xóa</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Bạn có chắc muốn xóa sản phẩm này? Hành động không thể hoàn tác.
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Hủy</Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={!canManageProducts}
              onClick={handleDelete}
            >
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
