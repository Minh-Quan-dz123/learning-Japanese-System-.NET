import { AxiosError } from "axios";
import { ApiErrorResponse } from "@/types/api-error";

// Lấy message dễ đọc từ lỗi axios, dùng chung cho mọi màn hình
export function getApiErrorMessage(error: unknown, fallback = "Đã có lỗi xảy ra"): string {
  const axiosError = error as AxiosError<ApiErrorResponse>;
  return axiosError.response?.data?.error?.message ?? fallback;
}

// Lấy danh sách lỗi theo từng field (dùng khi validate nhiều field, VD thiếu romaji+meaning)
export function getApiErrorDetails(error: unknown): { field: string; message: string }[] | null {
  const axiosError = error as AxiosError<ApiErrorResponse>;
  return axiosError.response?.data?.error?.details ?? null;
}