"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { authService, type AdminUser } from "@/lib/auth-service";

const ALLOWED_ROLES = ["admin", "staff", "warehouse", "technician"];

interface AuthContextType {
  user: AdminUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasRole: (...roles: string[]) => boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const refreshUser = useCallback(async () => {
    try {
      if (!authService.isAuthenticated()) {
        setUser(null);
        return;
      }
      const userData = await authService.getMe();
      if (!ALLOWED_ROLES.includes(userData.role)) {
        await authService.logout();
        setUser(null);
        return;
      }
      setUser(userData);
    } catch {
      setUser(null);
      localStorage.removeItem("admin_accessToken");
      localStorage.removeItem("admin_refreshToken");
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setIsLoading(false));
  }, [refreshUser]);

  useEffect(() => {
    if (isLoading) return;
    if (!user && pathname !== "/login") {
      router.replace("/login");
    }
    if (user && pathname === "/login") {
      router.replace("/");
    }
  }, [user, isLoading, pathname, router]);

  const login = useCallback(
    async (email: string, password: string) => {
      await authService.login(email, password);
      const userData = await authService.getMe();
      if (!ALLOWED_ROLES.includes(userData.role)) {
        await authService.logout();
        throw new Error("Tài khoản không có quyền truy cập trang quản trị");
      }
      setUser(userData);
      router.push("/");
    },
    [router],
  );

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
    router.push("/login");
  }, [router]);

  const hasRole = useCallback(
    (...roles: string[]) => {
      if (!user) return false;
      return roles.includes(user.role);
    },
    [user],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        hasRole,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
