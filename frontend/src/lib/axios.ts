import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true, // bắt buộc để trình duyệt gửi kèm cookie refreshToken (httpOnly) tới Backend
});

// ===== Phần 1: lưu accessToken hiện tại (đã có từ trước) =====
let currentAccessToken: string | null = null;

export function setAccessToken(token: string | null) {
  currentAccessToken = token;
}

// ===== Phần 2: cầu nối để axios.ts gọi được clearAuth() bên trong AuthContext =====
// Lý do cần: file này nằm ngoài React, không dùng useContext() được.
// AuthContext sẽ gọi registerAuthFailureHandler(clearAuth) 1 lần lúc khởi tạo.
let onAuthFailure: (() => void) | null = null;

export function registerAuthFailureHandler(handler: () => void) {
  onAuthFailure = handler;
}

// ===== Phần 3: request interceptor — tự gắn Authorization vào mọi request (đã có từ trước) =====
apiClient.interceptors.request.use((config) => {
  if (currentAccessToken) {
    config.headers.Authorization = `Bearer ${currentAccessToken}`;
  }
  return config;
});

// ===== Phần 4: response interceptor — tự refresh khi gặp 401 =====

// Cờ đánh dấu đang có 1 lượt refresh chạy hay chưa (tránh gọi refresh nhiều lần cùng lúc)
let isRefreshing = false;

// Hàng đợi các "resolver" của những request đang chờ refresh xong.
// Mỗi phần tử là 1 hàm sẽ được gọi (kèm token mới) khi refresh xong.
let pendingQueue: Array<(newToken: string) => void> = [];

function resolveQueue(newToken: string) {
  pendingQueue.forEach((resolve) => resolve(newToken));
  pendingQueue = [];
}

// Kiểu mở rộng để đánh dấu 1 request đã được retry rồi, tránh lặp vô hạn
interface RetryableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

apiClient.interceptors.response.use(
  // Response bình thường (không lỗi) → cho qua luôn
  (response) => response,

  // Response lỗi → xử lý ở đây
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableConfig | undefined;

    // Không phải lỗi 401, hoặc không có config (lỗi mạng...) → trả lỗi ra bình thường
    if (error.response?.status !== 401 || !originalRequest) {
      return Promise.reject(error);
    }

    // Chính request /api/auth/refresh cũng bị 401 → nghĩa là cookie refreshToken
    // đã hết hạn/không hợp lệ. KHÔNG được gọi refresh lại (tránh vòng lặp vô hạn).
    // → coi như phiên đăng nhập đã chết, gọi clearAuth() rồi trả lỗi ra ngoài.
    if (originalRequest.url?.includes("/api/auth/refresh")) {
      onAuthFailure?.();
      return Promise.reject(error);
    }

    // Request này đã từng retry rồi mà vẫn 401 → không thử nữa, coi như thất bại thật
    if (originalRequest._retry) {
      onAuthFailure?.();
      return Promise.reject(error);
    }
    originalRequest._retry = true;

    // Nếu đang có 1 lượt refresh khác chạy rồi → xếp hàng chờ, không tự gọi refresh nữa
    if (isRefreshing) {
      return new Promise((resolve) => {
        pendingQueue.push((newToken: string) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          resolve(apiClient(originalRequest));
        });
      });
    }

    // Request đầu tiên gặp 401 → chính nó sẽ đi gọi refresh
    isRefreshing = true;
    try {
      const response = await apiClient.post<{ accessToken: string }>("/api/auth/refresh");
      const newToken = response.data.accessToken;

      setAccessToken(newToken);
      resolveQueue(newToken); // đánh thức mọi request đang xếp hàng, dùng chung token mới

      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return apiClient(originalRequest); // gọi lại đúng request cũ, lần này có token mới
    } catch (refreshError) {
      // Refresh thất bại → coi như phiên đăng nhập đã chết
      pendingQueue = []; // dọn hàng đợi, không để các request khác chờ mãi
      onAuthFailure?.();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default apiClient;