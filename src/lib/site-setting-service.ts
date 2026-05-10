import api from "./api";

export interface SiteSettings {
  logoUrl: string | null;
  logoText: string;
}

export const siteSettingService = {
  async getPublicSettings(): Promise<SiteSettings> {
    const res = await api.get<{ data: SiteSettings }>("/site-settings/public");
    return res.data.data;
  },

  async getAllSettings(): Promise<Record<string, string | null>> {
    const res = await api.get<{ data: Record<string, string | null> }>("/site-settings");
    return res.data.data;
  },

  async uploadLogo(file: File, logoText?: string): Promise<{ message: string; logoUrl: string; logoText: string }> {
    const formData = new FormData();
    formData.append("file", file);
    if (logoText) {
      formData.append("logoText", logoText);
    }
    const res = await api.post<{ data: { message: string; logoUrl: string; logoText: string } }>(
      "/site-settings/logo",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return res.data.data;
  },

  async updateLogoText(
    logoText: string,
  ): Promise<{ message: string; logoText: string }> {
    const res = await api.post<{ data: { message: string; logoText: string } }>(
      "/site-settings/logo-text",
      { logoText },
    );
    return res.data.data;
  },
};
