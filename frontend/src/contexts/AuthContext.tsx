"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { UserDto } from "@/types/auth";
import apiClient, { setAccessToken, registerAuthFailureHandler } from "@/lib/axios"; // thêm registerAuthFailureHandler
import { AuthResponse } from "@/types/auth";

interface AuthContextType {
  accessToken: string | null;
  user: UserDto | null;
  isLoading: boolean;
  setAuth: (accessToken: string, user: UserDto) => void;
  clearAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<UserDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  function setAuth(token: string, userData: UserDto) {
    setAccessTokenState(token);
    setAccessToken(token);
    setUser(userData);
    setIsLoading(false);
  }

  function clearAuth() {
    setAccessTokenState(null);
    setAccessToken(null);
    setUser(null);
    setIsLoading(false);
  }

  useEffect(() => {
    // Cho axios.ts biết: nếu sau này refresh thất bại giữa chừng lúc dùng app,
    // hãy gọi clearAuth() này để đưa UI về trạng thái "chưa đăng nhập".
    registerAuthFailureHandler(clearAuth);

    async function tryRefresh() {
      try {
        const response = await apiClient.post<AuthResponse>("/api/auth/refresh");
        setAccessToken(response.data.accessToken);
        const meResponse = await apiClient.get<UserDto>("/api/auth/me");
        setAuth(response.data.accessToken, meResponse.data);
      } catch {
        clearAuth();
      }
    }

    tryRefresh();
  }, []);

  return (
    <AuthContext.Provider value={{ accessToken, user, isLoading, setAuth, clearAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth phải được gọi bên trong AuthProvider");
  }
  return context;
}