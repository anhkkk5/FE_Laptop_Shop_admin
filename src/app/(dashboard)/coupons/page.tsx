"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Plus, TicketPercent, Trash2 } from "lucide-react";
import {
  couponService,
  type Coupon,
  type CreateCouponPayload,
  type CouponDiscountType,
} from "@/lib/coupon-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type CouponForm = CreateCouponPayload & { id?: number };

const emptyForm: CouponForm = {
  code: "",
  name: "",
  description: "",
  discountType: "fixed_amount",
  discountValue: 0,
  minOrderValue: 0,
  maxDiscountAmount: undefined,
  usageLimit: undefined,
  usageLimitPerUser: undefined,
  startAt: "",
  endAt: "",
  isActive: true,
  applicableProductIds: [],
  applicableCategoryIds: [],
  applicableBrandIds: [],
  firstTimeCustomerOnly: false,
  isStackable: false,
  priority: 0,
  buyQuantity: undefined,
  getQuantity: undefined,
};

function formatPrice(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Có lỗi xảy ra, vui lòng thử lại";
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [form, setForm] = useState<CouponForm>(emptyForm);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [error, setError] = useState<string | null>(null);
  const [refetchTick, setRefetchTick] = useState(0);

  const isActiveFilter = useMemo(() => {
    if (statusFilter === "active") {
      return true;
    }

    if (statusFilter === "inactive") {
      return false;
    }

    return undefined;
  }, [statusFilter]);

  useEffect(() => {
    let isMounted = true;

    async function loadCoupons() {
      setLoading(true);
      setError(null);

      try {
        const data = await couponService.getAll({
          page: 1,
          limit: 100,
          search: search.trim() || undefined,
          isActive: isActiveFilter,
        });

        if (isMounted) {
          setCoupons(data.data);
        }
      } catch (err) {
        if (isMounted) {
          setError(getErrorMessage(err));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadCoupons();

    return () => {
      isMounted = false;
    };
  }, [isActiveFilter, refetchTick, search]);

  function openCreate() {
    setEditing(false);
    setForm(emptyForm);
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(coupon: Coupon) {
    setEditing(true);
    setForm({
      id: coupon.id,
      code: coupon.code,
      name: coupon.name,
      description: coupon.description || "",
      discountType: coupon.discountType,
      discountValue: Number(coupon.discountValue),
      minOrderValue: Number(coupon.minOrderValue),
      maxDiscountAmount: coupon.maxDiscountAmount ?? undefined,
      usageLimit: coupon.usageLimit ?? undefined,
      usageLimitPerUser: coupon.usageLimitPerUser ?? undefined,
      startAt: coupon.startAt ? coupon.startAt.slice(0, 16) : "",
      endAt: coupon.endAt ? coupon.endAt.slice(0, 16) : "",
      isActive: coupon.isActive,
      applicableProductIds: coupon.applicableProductIds ?? [],
      applicableCategoryIds: coupon.applicableCategoryIds ?? [],
      applicableBrandIds: coupon.applicableBrandIds ?? [],
      firstTimeCustomerOnly: coupon.firstTimeCustomerOnly ?? false,
      isStackable: coupon.isStackable ?? false,
      priority: coupon.priority ?? 0,
      buyQuantity: coupon.buyQuantity ?? undefined,
      getQuantity: coupon.getQuantity ?? undefined,
    });
    setError(null);
    setDialogOpen(true);
  }

  function buildPayload(): CreateCouponPayload {
    return {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      description: form.description?.trim() || undefined,
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      minOrderValue: Number(form.minOrderValue || 0),
      maxDiscountAmount:
        form.discountType === "percentage" && form.maxDiscountAmount
          ? Number(form.maxDiscountAmount)
          : undefined,
      usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
      usageLimitPerUser: form.usageLimitPerUser
        ? Number(form.usageLimitPerUser)
        : undefined,
      startAt: form.startAt || undefined,
      endAt: form.endAt || undefined,
      isActive: form.isActive,
      applicableProductIds:
        form.applicableProductIds && form.applicableProductIds.length > 0
          ? form.applicableProductIds
          : undefined,
      applicableCategoryIds:
        form.applicableCategoryIds && form.applicableCategoryIds.length > 0
          ? form.applicableCategoryIds
          : undefined,
      applicableBrandIds:
        form.applicableBrandIds && form.applicableBrandIds.length > 0
          ? form.applicableBrandIds
          : undefined,
      firstTimeCustomerOnly: form.firstTimeCustomerOnly || undefined,
      isStackable: form.isStackable || undefined,
      priority: form.priority ?? undefined,
      buyQuantity:
        form.discountType === "buy_x_get_y" && form.buyQuantity
          ? Number(form.buyQuantity)
          : undefined,
      getQuantity:
        form.discountType === "buy_x_get_y" && form.getQuantity
          ? Number(form.getQuantity)
          : undefined,
    };
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      const payload = buildPayload();

      if (editing && form.id) {
        await couponService.update(form.id, payload);
      } else {
        await couponService.create(payload);
      }

      setDialogOpen(false);
      setRefetchTick((prev) => prev + 1);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate() {
    if (!deletingId) {
      return;
    }

    setError(null);

    try {
      await couponService.deactivate(deletingId);
      setDeletingId(null);
      setDeleteDialogOpen(false);
      setRefetchTick((prev) => prev + 1);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mã giảm giá</h1>
          <p className="text-muted-foreground">
            Quản lý coupon cho khách hàng ({coupons.length} mã)
          </p>
        </div>
        <Button className="gap-2" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Tạo mã giảm giá
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Input
          value={search}
          placeholder="Tìm theo code hoặc tên"
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as "all" | "active" | "inactive")
          }
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="inactive">Đã tắt</option>
        </select>
        <Button
          variant="outline"
          onClick={() => setRefetchTick((prev) => prev + 1)}
        >
          Lọc dữ liệu
        </Button>
      </div>

      {error && !dialogOpen && !deleteDialogOpen && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Loại giảm</TableHead>
                <TableHead>Điều kiện</TableHead>
                <TableHead>Giới hạn</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-10 text-center text-muted-foreground"
                  >
                    <TicketPercent className="mx-auto mb-2 h-10 w-10 opacity-30" />
                    Chưa có mã giảm giá nào
                  </TableCell>
                </TableRow>
              ) : (
                coupons.map((coupon) => (
                  <TableRow key={coupon.id}>
                    <TableCell className="font-mono text-xs">
                      {coupon.id}
                    </TableCell>
                    <TableCell>
                      <p className="font-semibold">{coupon.code}</p>
                      <p className="text-xs text-muted-foreground">
                        {coupon.name}
                      </p>
                    </TableCell>
                    <TableCell>
                      {coupon.discountType === "percentage"
                        ? `${coupon.discountValue}%`
                        : formatPrice(Number(coupon.discountValue))}
                    </TableCell>
                    <TableCell>
                      {Number(coupon.minOrderValue) > 0
                        ? `Đơn từ ${formatPrice(Number(coupon.minOrderValue))}`
                        : "Không yêu cầu"}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">
                        Đã dùng: {coupon.usageCount}
                        {coupon.usageLimit ? ` / ${coupon.usageLimit}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Mỗi user: {coupon.usageLimitPerUser ?? "Không giới hạn"}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={coupon.isActive ? "default" : "secondary"}
                      >
                        {coupon.isActive ? "Hoạt động" : "Đã tắt"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(coupon)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            setDeletingId(coupon.id);
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
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>{editing ? "Cập nhật mã" : "Tạo mã mới"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {error && dialogOpen && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Mã coupon *</Label>
                <Input
                  value={form.code}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      code: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="SAVE20"
                />
              </div>
              <div className="space-y-2">
                <Label>Tên chương trình *</Label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Giảm giá 20%"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Mô tả</Label>
              <Textarea
                rows={2}
                value={form.description || ""}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Loại giảm</Label>
                <select
                  value={form.discountType}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      discountType: e.target.value as CouponDiscountType,
                    }))
                  }
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="fixed_amount">Giảm số tiền</option>
                  <option value="percentage">Giảm phần trăm</option>
                  <option value="free_shipping">Miễn phí vận chuyển</option>
                  <option value="buy_x_get_y">Mua X tặng Y</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Giá trị giảm *</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.discountValue}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      discountValue: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Đơn tối thiểu</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.minOrderValue || 0}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      minOrderValue: Number(e.target.value),
                    }))
                  }
                />
              </div>
            </div>

            {form.discountType === "percentage" && (
              <div className="space-y-2">
                <Label>Giảm tối đa (VND)</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.maxDiscountAmount || ""}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      maxDiscountAmount: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    }))
                  }
                />
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Tổng lượt dùng tối đa</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.usageLimit || ""}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      usageLimit: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Lượt dùng mỗi user</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.usageLimitPerUser || ""}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      usageLimitPerUser: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Bắt đầu</Label>
                <Input
                  type="datetime-local"
                  value={form.startAt || ""}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, startAt: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Kết thúc</Label>
                <Input
                  type="datetime-local"
                  value={form.endAt || ""}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, endAt: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="coupon-active"
                type="checkbox"
                checked={!!form.isActive}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, isActive: e.target.checked }))
                }
                className="h-4 w-4 rounded border"
              />
              <Label htmlFor="coupon-active">Kích hoạt coupon</Label>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Hủy</Button>
            </DialogClose>
            <Button
              onClick={handleSave}
              disabled={
                saving ||
                !form.code.trim() ||
                !form.name.trim() ||
                Number(form.discountValue) <= 0
              }
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Lưu thay đổi" : "Tạo coupon"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Khóa mã giảm giá</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Coupon sẽ bị tắt và không thể áp dụng cho đơn mới.
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Hủy</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleDeactivate}>
              Xác nhận khóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
