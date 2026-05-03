"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, Loader2, FolderTree } from "lucide-react";
import {
  categoryService,
  type Category,
  type CreateCategoryPayload,
} from "@/lib/category-service";

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

const emptyForm: CreateCategoryPayload & { id?: number } = {
  name: "",
  description: "",
  image: "",
  parentId: undefined,
  sortOrder: 0,
  isActive: true,
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      const data = await categoryService.getAll();
      setCategories(data);
    } catch {
      setError("Không thể tải danh mục");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  function openCreate() {
    setForm(emptyForm);
    setEditing(false);
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(cat: Category) {
    setForm({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description || "",
      image: cat.image || "",
      parentId: cat.parentId || undefined,
      sortOrder: cat.sortOrder,
      isActive: cat.isActive,
    });
    setEditing(true);
    setError(null);
    setDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const payload = { ...form };
      delete (payload as Record<string, unknown>).id;
      if (!payload.parentId) delete payload.parentId;
      if (!editing) {
        delete payload.slug;
      }

      if (editing && form.id) {
        await categoryService.update(form.id, payload);
      } else {
        await categoryService.create(payload as CreateCategoryPayload);
      }
      setDialogOpen(false);
      await fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi khi lưu");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setError(null);
    try {
      await categoryService.delete(deleting);
      setDeleteDialogOpen(false);
      setDeleting(null);
      await fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xóa");
    }
  }

  function flattenCategories(
    cats: Category[],
    depth = 0,
  ): (Category & { depth: number })[] {
    const result: (Category & { depth: number })[] = [];
    for (const cat of cats) {
      result.push({ ...cat, depth });
      if (cat.children && cat.children.length > 0) {
        result.push(...flattenCategories(cat.children, depth + 1));
      }
    }
    return result;
  }

  const flatList = flattenCategories(categories);
  const autoSlug = slugify(form.name || "");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Danh mục</h1>
          <p className="text-muted-foreground">
            Quản lý danh mục sản phẩm ({categories.length} danh mục)
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Thêm danh mục
        </Button>
      </div>

      {error && !dialogOpen && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">ID</TableHead>
              <TableHead>Tên danh mục</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead className="w-20 text-center">Thứ tự</TableHead>
              <TableHead className="w-24 text-center">Trạng thái</TableHead>
              <TableHead className="w-28 text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {flatList.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-10 text-muted-foreground"
                >
                  <FolderTree className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  Chưa có danh mục nào
                </TableCell>
              </TableRow>
            ) : (
              flatList.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell className="font-mono text-xs">{cat.id}</TableCell>
                  <TableCell>
                    <span
                      style={{ paddingLeft: `${cat.depth * 24}px` }}
                      className="flex items-center gap-2"
                    >
                      {cat.depth > 0 && (
                        <span className="text-muted-foreground">└</span>
                      )}
                      <span className="font-medium">{cat.name}</span>
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {cat.slug}
                  </TableCell>
                  <TableCell className="text-center">{cat.sortOrder}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={cat.isActive ? "default" : "secondary"}>
                      {cat.isActive ? "Hoạt động" : "Ẩn"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(cat)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          setDeleting(cat.id);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Sửa danh mục" : "Thêm danh mục"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {error && dialogOpen && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label>Tên danh mục *</Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Laptop Gaming"
              />
            </div>
            <div className="space-y-2">
              <Label>Slug (tự tạo)</Label>
              <Input
                value={editing ? (form.slug ?? autoSlug) : autoSlug}
                placeholder="laptop-gaming"
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label>Mô tả</Label>
              <Textarea
                value={form.description || ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Mô tả ngắn..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Danh mục cha</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  value={form.parentId || ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      parentId: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    }))
                  }
                >
                  <option value="">Không có</option>
                  {categories
                    .filter((c) => c.id !== form.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
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
                checked={form.isActive}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
              />
              <Label>Hoạt động</Label>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Hủy</Button>
            </DialogClose>
            <Button onClick={handleSave} disabled={saving || !form.name}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Cập nhật" : "Tạo mới"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Xác nhận xóa</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Bạn có chắc muốn xóa danh mục này? Hành động không thể hoàn tác.
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Hủy</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleDelete}>
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
