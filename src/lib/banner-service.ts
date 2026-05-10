import api from "./api";

export interface Banner {
  id: number;
  title: string;
  subtitle: string;
  imageUrl: string | null;
  ctaText: string;
  ctaLink: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBannerDto {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  ctaText?: string;
  ctaLink?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export type UpdateBannerDto = Partial<CreateBannerDto>;

export const bannerAdminService = {
  async uploadImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("files", file);
    const res = await api.post<{ data?: { imageUrls?: string[] }; imageUrls?: string[] }>(
      "/admin/products/upload-images",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    const urls =
      res.data?.data?.imageUrls ?? res.data?.imageUrls ?? [];
    if (!urls[0]) throw new Error("Upload thất bại");
    return urls[0];
  },


  async getAll(): Promise<Banner[]> {
    const res = await api.get<{ data: Banner[] }>("/banners");
    return res.data.data;
  },

  async create(dto: CreateBannerDto): Promise<Banner> {
    const res = await api.post<{ data: Banner }>("/banners", dto);
    return res.data.data;
  },

  async update(id: number, dto: UpdateBannerDto): Promise<Banner> {
    const res = await api.patch<{ data: Banner }>(`/banners/${id}`, dto);
    return res.data.data;
  },

  async remove(id: number): Promise<void> {
    await api.delete(`/banners/${id}`);
  },

  async toggleActive(id: number, isActive: boolean): Promise<Banner> {
    const res = await api.patch<{ data: Banner }>(`/banners/${id}`, { isActive });
    return res.data.data;
  },
};
