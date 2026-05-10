"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ImageIcon,
  Plus,
  Loader2,
  Trash2,
  Pencil,
  X,
  Check,
  Eye,
  EyeOff,
  UploadCloud,
  ExternalLink,
  GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  bannerAdminService,
  type Banner,
  type CreateBannerDto,
} from "@/lib/banner-service";

/* ─── ImageUploadZone ─────────────────────────────────────── */
interface UploadZoneProps {
  currentUrl?: string;
  onUploaded: (url: string) => void;
  onLocalPreview: (url: string | null) => void;
  localPreview: string | null;
  uploading: boolean;
  setUploading: (v: boolean) => void;
  setError: (e: string | null) => void;
}

function ImageUploadZone({
  currentUrl,
  onUploaded,
  onLocalPreview,
  localPreview,
  uploading,
  setUploading,
  setError,
}: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const preview = localPreview ?? currentUrl ?? null;

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Chỉ chấp nhận file ảnh (JPG, PNG, WEBP...)");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File ảnh không được vượt quá 10MB");
      return;
    }
    // Show local preview immediately
    onLocalPreview(URL.createObjectURL(file));
    setUploading(true);
    setError(null);
    try {
      const url = await bannerAdminService.uploadImage(file);
      onUploaded(url);
    } catch {
      setError("Upload ảnh thất bại. Kiểm tra kết nối và thử lại.");
      onLocalPreview(null);
    } finally {
      setUploading(false);
    }
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div
      className={`relative flex min-h-[160px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-colors ${
        dragOver
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/30 hover:border-primary/60 hover:bg-accent/30"
      }`}
      onClick={() => !uploading && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onInputChange}
      />

      {preview ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="preview"
            className="h-full w-full object-cover"
          />
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onLocalPreview(null);
              onUploaded("");
            }}
            className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
          >
            <X className="h-4 w-4" />
          </button>
          {!uploading && (
            <div className="absolute bottom-2 right-2 rounded-full bg-black/50 px-2 py-1 text-xs text-white">
              Nhấn để thay ảnh
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center gap-2 p-6 text-center text-muted-foreground">
          {uploading ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-sm">Đang upload...</p>
            </>
          ) : (
            <>
              <UploadCloud className="h-10 w-10 opacity-50" />
              <p className="text-sm font-medium">
                Kéo thả ảnh vào đây hoặc <span className="text-primary">nhấn để chọn</span>
              </p>
              <p className="text-xs">JPG, PNG, WEBP · Tối đa 10MB</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── BannerForm (dùng chung cho create & edit) ──────────── */
interface BannerFormProps {
  value: CreateBannerDto;
  onChange: (v: CreateBannerDto) => void;
  setError: (e: string | null) => void;
}

function BannerFormFields({ value, onChange, setError }: BannerFormProps) {
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  return (
    <div className="space-y-4">
      <div>
        <Label className="mb-1.5 block">
          Ảnh banner <span className="text-destructive">*</span>
        </Label>
        <ImageUploadZone
          currentUrl={value.imageUrl ?? undefined}
          onUploaded={(url) => onChange({ ...value, imageUrl: url })}
          onLocalPreview={setLocalPreview}
          localPreview={localPreview}
          uploading={uploading}
          setUploading={setUploading}
          setError={setError}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Tiêu đề (overlay trên ảnh)</Label>
          <Input
            placeholder="VD: SIÊU SALE CÔNG NGHỆ"
            value={value.title}
            onChange={(e) => onChange({ ...value, title: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Mô tả ngắn</Label>
          <Input
            placeholder="VD: Laptop giảm đến 30%..."
            value={value.subtitle}
            onChange={(e) => onChange({ ...value, subtitle: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Text nút CTA</Label>
          <Input
            placeholder="VD: Mua ngay"
            value={value.ctaText}
            onChange={(e) => onChange({ ...value, ctaText: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Link nút CTA</Label>
          <Input
            placeholder="VD: /products?category=laptop"
            value={value.ctaLink}
            onChange={(e) => onChange({ ...value, ctaLink: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Thứ tự hiển thị</Label>
          <Input
            type="number"
            min={0}
            value={value.sortOrder ?? 0}
            onChange={(e) => onChange({ ...value, sortOrder: Number(e.target.value) })}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={value.isActive ?? true}
          onCheckedChange={(v) => onChange({ ...value, isActive: v })}
        />
        <Label>Hiển thị ngay</Label>
      </div>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────── */
const EMPTY: CreateBannerDto = {
  title: "",
  subtitle: "",
  imageUrl: "",
  ctaText: "",
  ctaLink: "",
  isActive: true,
  sortOrder: 0,
};

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<CreateBannerDto>(EMPTY);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<CreateBannerDto>(EMPTY);
  const [saving, setSaving] = useState(false);

  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const fetchBanners = useCallback(async () => {
    setLoading(true);
    try {
      const data = await bannerAdminService.getAll();
      setBanners(data.sort((a, b) => a.sortOrder - b.sortOrder));
    } catch {
      setError("Không thể tải danh sách banner");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBanners(); }, [fetchBanners]);

  function flash(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  }

  async function handleCreate() {
    if (!createForm.imageUrl?.trim()) {
      setError("Vui lòng upload ảnh cho banner");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const created = await bannerAdminService.create({
        ...createForm,
        sortOrder: banners.length,
      });
      setBanners((prev) => [...prev, created]);
      setCreateForm(EMPTY);
      setShowCreate(false);
      flash("Đã thêm banner mới");
    } catch {
      setError("Thêm banner thất bại");
    } finally {
      setCreating(false);
    }
  }

  function startEdit(b: Banner) {
    setEditingId(b.id);
    setEditForm({
      title: b.title,
      subtitle: b.subtitle,
      imageUrl: b.imageUrl ?? "",
      ctaText: b.ctaText,
      ctaLink: b.ctaLink,
      isActive: b.isActive,
      sortOrder: b.sortOrder,
    });
  }

  async function handleSave(id: number) {
    setSaving(true);
    setError(null);
    try {
      const updated = await bannerAdminService.update(id, editForm);
      setBanners((prev) => prev.map((b) => (b.id === id ? updated : b)));
      setEditingId(null);
      flash("Đã cập nhật banner");
    } catch {
      setError("Cập nhật thất bại");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm("Xóa banner này?")) return;
    setDeletingId(id);
    try {
      await bannerAdminService.remove(id);
      setBanners((prev) => prev.filter((b) => b.id !== id));
      if (editingId === id) setEditingId(null);
      flash("Đã xóa banner");
    } catch {
      setError("Xóa banner thất bại");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleToggle(banner: Banner) {
    setTogglingId(banner.id);
    try {
      const updated = await bannerAdminService.toggleActive(banner.id, !banner.isActive);
      setBanners((prev) => prev.map((b) => (b.id === banner.id ? updated : b)));
    } catch {
      setError("Không thể thay đổi trạng thái");
    } finally {
      setTogglingId(null);
    }
  }

  const activeBanners = banners.filter((b) => b.isActive).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ImageIcon className="h-5 w-5" /> Quản lý Banner
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {banners.length} banner · {activeBanners} đang hiển thị · Tự động cuộn khi có ≥ 2 banner
          </p>
        </div>
        <Button
          onClick={() => { setShowCreate(true); setError(null); }}
          disabled={showCreate}
        >
          <Plus className="h-4 w-4 mr-1" /> Thêm banner
        </Button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center justify-between rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          {error}
          <button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
          <Check className="h-4 w-4 shrink-0" /> {success}
        </div>
      )}

      {/* ── Create form ── */}
      {showCreate && (
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Thêm banner mới</h2>
            <button
              onClick={() => { setShowCreate(false); setCreateForm(EMPTY); setError(null); }}
              className="rounded-md p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <BannerFormFields value={createForm} onChange={setCreateForm} setError={setError} />

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => { setShowCreate(false); setCreateForm(EMPTY); }}>
              Hủy
            </Button>
            <Button onClick={handleCreate} disabled={creating || !createForm.imageUrl?.trim()}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Thêm banner"}
            </Button>
          </div>
        </div>
      )}

      {/* ── List ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      ) : banners.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-16 text-center text-muted-foreground">
          <ImageIcon className="h-12 w-12 mb-3 opacity-25" />
          <p className="font-medium">Chưa có banner nào</p>
          <p className="text-sm mt-1">Nhấn "Thêm banner" để cấu hình banner trang chủ</p>
        </div>
      ) : (
        <div className="space-y-3">
          {banners.map((banner) => (
            <div key={banner.id} className="rounded-xl border bg-card shadow-sm overflow-hidden">
              {editingId === banner.id ? (
                /* ── Edit mode ── */
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">Chỉnh sửa banner #{banner.id}</h3>
                    <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <BannerFormFields value={editForm} onChange={setEditForm} setError={setError} />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>Hủy</Button>
                    <Button size="sm" onClick={() => handleSave(banner.id)} disabled={saving || !editForm.imageUrl?.trim()}>
                      {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Lưu thay đổi"}
                    </Button>
                  </div>
                </div>
              ) : (
                /* ── View mode ── */
                <div className="flex items-center gap-3 p-3">
                  <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/30" />

                  {/* Thumb */}
                  <div className="relative h-[72px] w-32 shrink-0 overflow-hidden rounded-lg border bg-muted">
                    {banner.imageUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={banner.imageUrl}
                        alt={banner.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-muted-foreground/25" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {banner.title || <span className="italic text-muted-foreground">Không có tiêu đề</span>}
                    </p>
                    {banner.subtitle && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{banner.subtitle}</p>
                    )}
                    {banner.ctaLink && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground truncate">
                        <ExternalLink className="h-3 w-3 shrink-0" />
                        {banner.ctaLink}
                      </p>
                    )}
                  </div>

                  {/* Order badge */}
                  <span className="hidden sm:flex h-6 w-8 items-center justify-center rounded-md bg-muted text-xs font-medium text-muted-foreground">
                    #{banner.sortOrder}
                  </span>

                  {/* Toggle visible */}
                  <button
                    onClick={() => handleToggle(banner)}
                    disabled={togglingId === banner.id}
                    className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition ${
                      banner.isActive
                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                        : "bg-muted text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {togglingId === banner.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : banner.isActive ? (
                      <><Eye className="h-3 w-3" /> Hiển thị</>
                    ) : (
                      <><EyeOff className="h-3 w-3" /> Ẩn</>
                    )}
                  </button>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={() => startEdit(banner)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(banner.id)}
                      disabled={deletingId === banner.id}
                    >
                      {deletingId === banner.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Trash2 className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Tip: Banner sắp xếp theo thứ tự (sortOrder). Khi có ≥ 2 banner &quot;Hiển thị&quot;, trang chủ tự động chạy carousel.
      </p>
    </div>
  );
}
