import apiClient from "@/lib/axios";
import { LoginRequest, RegisterRequest, AuthResponse } from "@/types/auth";

export async function login(data: LoginRequest): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>("/api/auth/login", data);
  return response.data;
}

export async function register(data: RegisterRequest): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>("/api/auth/register", data);
  return response.data;
}

export async function logout(): Promise<void> {
  await apiClient.post("/api/auth/logout");
}