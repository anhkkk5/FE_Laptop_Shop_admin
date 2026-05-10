"use client";

import { useState, useEffect, useRef } from "react";
import {
  UploadCloud,
  Save,
  Loader2,
  X,
  Check,
  ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { siteSettingService } from "@/lib/site-setting-service";

export default function SettingsPage() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoText, setLogoText] = useState("SMART LAPTOP");
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    siteSettingService
      .getPublicSettings()
      .then((s) => {
        setLogoUrl(s.logoUrl);
        setLogoText(s.logoText || "SMART LAPTOP");
      })
      .catch(() => setError("Không thể tải cài đặt hiện tại"))
      .finally(() => setLoading(false));
  }, []);

  function flash(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (!["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.type)) {
      setError("Chỉ chấp nhận file ảnh (JPEG, PNG, GIF, WebP)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("File không được vượt quá 5MB");
      return;
    }

    setLocalPreview(URL.createObjectURL(file));
    setUploading(true);
    setError(null);
    try {
      const result = await siteSettingService.uploadLogo(file, logoText);
      setLogoUrl(result.logoUrl);
      setLocalPreview(null);
      flash("Logo đã được cập nhật thành công!");
    } catch {
      setError("Upload thất bại. Vui lòng thử lại.");
      setLocalPreview(null);
    } finally {
      setUploading(false);
    }
  }

  async function handleSaveText() {
    if (!logoText.trim()) {
      setError("Text logo không được để trống");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await siteSettingService.updateLogoText(logoText.trim());
      flash("Text logo đã được lưu!");
    } catch {
      setError("Không thể lưu text logo");
    } finally {
      setSaving(false);
    }
  }

  const preview = localPreview ?? logoUrl;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cài đặt Website</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Quản lý logo và thông tin hiển thị trên website
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center justify-between rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <Check className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}

      {/* Logo card */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="border-b px-6 py-4">
          <h2 className="font-semibold">Logo Website</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ảnh logo hiển thị trên header và favicon
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Preview */}
          <div>
            <Label className="mb-2 block">Xem trước</Label>
            <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3 w-fit">
              {preview ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={preview}
                  alt="Logo preview"
                  className="h-10 w-10 object-contain"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <ImageIcon className="h-5 w-5" />
                </div>
              )}
              <span className="font-bold text-base">{logoText || "SMART LAPTOP"}</span>
            </div>
          </div>

          {/* Upload */}
          <div>
            <Label className="mb-2 block">Tải lên Logo mới</Label>
            <div
              className="flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors hover:border-primary/60 hover:bg-accent/20"
              onClick={() => !uploading && fileInputRef.current?.click()}
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <p className="text-sm">Đang upload lên Cloudinary...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 p-6 text-center text-muted-foreground">
                  <UploadCloud className="h-10 w-10 opacity-50" />
                  <p className="text-sm font-medium">
                    Kéo thả hoặc <span className="text-primary">nhấn để chọn ảnh</span>
                  </p>
                  <p className="text-xs">PNG, JPG, GIF, WebP · Tối đa 5MB</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Logo text */}
          <div>
            <Label htmlFor="logoText" className="mb-2 block">
              Text Logo
            </Label>
            <div className="flex gap-3">
              <Input
                id="logoText"
                value={logoText}
                onChange={(e) => setLogoText(e.target.value)}
                placeholder="SMART LAPTOP"
                className="max-w-xs"
              />
              <Button onClick={handleSaveText} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-1.5" />
                    Lưu
                  </>
                )}
              </Button>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Text hiển thị bên cạnh logo. Để trống nếu chỉ dùng hình ảnh.
            </p>
          </div>

          {/* Current URL */}
          {logoUrl && (
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">
                URL logo hiện tại
              </Label>
              <p className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground break-all">
                {logoUrl}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
