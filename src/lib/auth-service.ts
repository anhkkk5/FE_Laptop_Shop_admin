import api from "./api";
import { AxiosError } from "axios";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface AdminUser {
  id: number;
  email: string;
  role: string;
  fullName?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
}

interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError && error.response?.data) {
    const data = error.response.data as ApiError;
    return data.message || "Đã xảy ra lỗi";
  }
  return "Không thể kết nối đến server";
}

export const authService = {
  async login(email: string, password: string): Promise<AuthTokens> {
    try {
      const res = await api.post<ApiResponse<AuthTokens>>("/auth/login", {
        email,
        password,
      });
      const tokens = res.data.data;
      localStorage.setItem("admin_accessToken", tokens.accessToken);
      localStorage.setItem("admin_refreshToken", tokens.refreshToken);
      return tokens;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  async logout(): Promise<void> {
    try {
      const refreshToken = localStorage.getItem("admin_refreshToken");
      if (refreshToken) {
        await api.post("/auth/logout", { refreshToken });
      }
    } finally {
      localStorage.removeItem("admin_accessToken");
      localStorage.removeItem("admin_refreshToken");
    }
  },

  async getMe(): Promise<AdminUser> {
    try {
      const res = await api.get<ApiResponse<AdminUser>>("/auth/me");
      return res.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  isAuthenticated(): boolean {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem("admin_accessToken");
  },
};
