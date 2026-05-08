"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Loader2, Search, Trash2, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { staffService, type StaffUser } from "@/lib/staff-service";

const ROLE_LABELS: Record<string, string> = {
  customer: "Khách hàng",
  admin: "Quản trị viên",
  staff: "Nhân viên",
  technician: "Kỹ thuật viên",
  warehouse: "Kho hàng",
};

const ROLE_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "customer", label: "Khách hàng" },
  { value: "staff", label: "Nhân viên" },
  { value: "technician", label: "Kỹ thuật viên" },
  { value: "warehouse", label: "Kho hàng" },
  { value: "admin", label: "Quản trị viên" },
];

const EDIT_ROLE_OPTIONS = [
  { value: "customer", label: "Khách hàng" },
  { value: "staff", label: "Nhân viên" },
  { value: "technician", label: "Kỹ thuật viên" },
  { value: "warehouse", label: "Kho hàng" },
  { value: "admin", label: "Quản trị viên" },
];

const EDITABLE_ROLES = new Set(EDIT_ROLE_OPTIONS.map((role) => role.value));

type EditFormState = {
  fullName: string;
  phone: string;
  role: string;
};

type CreateFormState = {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  role: string;
};

export default function UsersPage() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>({
    fullName: "",
    phone: "",
    role: "customer",
  });
  const [createForm, setCreateForm] = useState<CreateFormState>({
    fullName: "",
    email: "",
    password: "",
    phone: "",
    role: "customer",
  });

  async function fetchUsers() {
    setLoading(true);
    setError(null);
    try {
      const res = await staffService.getAll({
        role: roleFilter === "all" ? undefined : roleFilter,
        limit: 100,
      });
      setUsers(res.data);
    } catch {
      setError("Không thể tải danh sách người dùng");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setError(null);
    setSuccess(null);
    try {
      const created = await staffService.create({
        fullName: createForm.fullName.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        phone: createForm.phone.trim() || undefined,
        role: createForm.role,
      });
      setUsers((prev) => [created, ...prev]);
      setCreateForm({
        fullName: "",
        email: "",
        password: "",
        phone: "",
        role: "customer",
      });
      setSuccess(
        "Tạo tài khoản test thành công. Tài khoản đã được xác minh ngay.",
      );
    } catch {
      setError("Tạo tài khoản thất bại");
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteUser(user: StaffUser) {
    const confirmed = window.confirm(`Xóa tài khoản ${user.email}?`);
    if (!confirmed) return;

    setDeletingId(user.id);
    setError(null);
    setSuccess(null);
    try {
      await staffService.remove(user.id);
      setUsers((prev) => prev.filter((item) => item.id !== user.id));
      if (editingId === user.id) {
        setEditingId(null);
      }
      setSuccess("Đã xóa tài khoản người dùng.");
    } catch {
      setError(
        "Xóa user thất bại (có thể tài khoản đang có dữ liệu ràng buộc).",
      );
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    void fetchUsers();
  }, [roleFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone || "").toLowerCase().includes(q),
    );
  }, [users, search]);

  function startEdit(user: StaffUser) {
    setEditingId(user.id);
    setEditForm({
      fullName: user.fullName,
      phone: user.phone || "",
      role: EDITABLE_ROLES.has(user.role) ? user.role : "customer",
    });
  }

  async function saveUser(id: number) {
    setSaving(true);
    setError(null);
    try {
      await staffService.update(id, {
        fullName: editForm.fullName.trim(),
        phone: editForm.phone.trim() || undefined,
        role: editForm.role,
      });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === id
            ? {
                ...u,
                fullName: editForm.fullName.trim(),
                phone: editForm.phone.trim() || null,
                role: editForm.role,
              }
            : u,
        ),
      );
      setEditingId(null);
    } catch {
      setError("Cập nhật người dùng thất bại");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-5 w-5" />
            Quản lý người dùng
          </h1>
          <p className="text-muted-foreground">
            Quản lý tài khoản theo 5 vai trò nghiệp vụ và chuyển quyền vận hành.
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          {users.length} tài khoản
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-emerald-400/40 bg-emerald-50 p-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          <h2 className="font-semibold">Tạo tài khoản test</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Tài khoản tạo tại đây sẽ được dùng test nội bộ và không cần xác nhận
          email.
        </p>
        <form
          onSubmit={handleCreateUser}
          className="grid gap-3 md:grid-cols-2 xl:grid-cols-6"
        >
          <Input
            placeholder="Họ tên"
            value={createForm.fullName}
            onChange={(e) =>
              setCreateForm((prev) => ({ ...prev, fullName: e.target.value }))
            }
            className="xl:col-span-1"
            required
          />
          <Input
            type="email"
            placeholder="Email"
            value={createForm.email}
            onChange={(e) =>
              setCreateForm((prev) => ({ ...prev, email: e.target.value }))
            }
            className="xl:col-span-2"
            required
          />
          <Input
            type="password"
            placeholder="Mật khẩu"
            value={createForm.password}
            onChange={(e) =>
              setCreateForm((prev) => ({ ...prev, password: e.target.value }))
            }
            minLength={6}
            className="xl:col-span-1"
            required
          />
          <Input
            placeholder="Số điện thoại (tuỳ chọn)"
            value={createForm.phone}
            onChange={(e) =>
              setCreateForm((prev) => ({ ...prev, phone: e.target.value }))
            }
            className="xl:col-span-1"
          />
          <Select
            value={createForm.role}
            onValueChange={(value) =>
              setCreateForm((prev) => ({ ...prev, role: value }))
            }
          >
            <SelectTrigger className="xl:col-span-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EDIT_ROLE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="md:col-span-2 xl:col-span-6 flex justify-end">
            <Button
              type="submit"
              disabled={
                creating ||
                !createForm.fullName.trim() ||
                !createForm.email.trim() ||
                createForm.password.length < 6
              }
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Tạo tài khoản"
              )}
            </Button>
          </div>
        </form>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên, email, số điện thoại..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Lọc vai trò" />
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          onClick={() => void fetchUsers()}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Làm mới"}
        </Button>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Tên</th>
              <th className="px-4 py-3 text-left font-medium">Email</th>
              <th className="px-4 py-3 text-left font-medium">Số điện thoại</th>
              <th className="px-4 py-3 text-left font-medium">Vai trò</th>
              <th className="px-4 py-3 text-left font-medium">Xác minh</th>
              <th className="px-4 py-3 text-right font-medium">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((user) => (
              <tr key={user.id} className="border-b last:border-0">
                <td className="px-4 py-3 font-medium">
                  {editingId === user.id ? (
                    <Input
                      value={editForm.fullName}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          fullName: e.target.value,
                        }))
                      }
                    />
                  ) : (
                    user.fullName
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {user.email}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {editingId === user.id ? (
                    <Input
                      value={editForm.phone}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          phone: e.target.value,
                        }))
                      }
                    />
                  ) : (
                    user.phone || "—"
                  )}
                </td>
                <td className="px-4 py-3">
                  {editingId === user.id ? (
                    <Select
                      value={editForm.role}
                      onValueChange={(value) =>
                        setEditForm((prev) => ({ ...prev, role: value }))
                      }
                    >
                      <SelectTrigger className="w-[160px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EDIT_ROLE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium">
                      {ROLE_LABELS[user.role] || user.role}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      user.isVerified
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {user.isVerified ? "Đã xác minh" : "Chưa xác minh"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {editingId === user.id ? (
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingId(null)}
                      >
                        Hủy
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => void saveUser(user.id)}
                        disabled={saving || !editForm.fullName.trim()}
                      >
                        {saving ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          "Lưu"
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEdit(user)}
                      >
                        Sửa
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => void handleDeleteUser(user)}
                        disabled={deletingId === user.id}
                      >
                        {deletingId === user.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && !loading && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  Không có dữ liệu
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
