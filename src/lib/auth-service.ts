import api from "./api";
import { AxiosError } from "axios";

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
  async login(email: string, password: string): Promise<AdminUser> {
    try {
      const res = await api.post<ApiResponse<{ user: AdminUser }>>(
        "/auth/login",
        {
          email,
          password,
        },
      );
      return res.data.data.user;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  async logout(): Promise<void> {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      // Ignore errors during logout
      console.error("Logout error:", error);
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

  async checkAuth(): Promise<boolean> {
    try {
      await this.getMe();
      return true;
    } catch {
      return false;
    }
  },
};
