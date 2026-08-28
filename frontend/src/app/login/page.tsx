"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login } from "@/lib/authApi";
import { useAuth } from "@/contexts/AuthContext";

// 2 icon con mắt tự vẽ (paths kiểu feather-icons, MIT license) — không cần cài thư viện icon.
function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 7 11 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 1 11s4 7 11 7a9.7 9.7 0 0 0 5.39-1.61" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { setAuth } = useAuth();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await login({ username, password });
      setAuth(result.accessToken, result.user);
      router.push("/");
    } catch (err: any) {
      const message = err?.response?.data?.error?.message ?? "Đăng nhập thất bại";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      {/* overflow-hidden để thanh màu trên cùng bo góc theo đúng card, không tràn ra ngoài */}
      <div className="w-full max-w-sm overflow-hidden rounded-xl border border-border bg-background shadow-sm">
        {/* Thanh màu nhận diện riêng cho trang Login — khác Register để 2 trang không bị lẫn */}
        <div className="h-1.5 bg-secondary" />

        <div className="p-8">
          <div className="mb-6 flex flex-col items-center text-center">
            <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-md bg-secondary text-xl font-bold text-white">
              入
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              Đăng nhập
            </h1>
            <p className="mt-1 text-sm text-foreground/60">
              Tiếp tục hành trình luyện tập tiếng Nhật của bạn.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}

            <div>
              <label className="mb-1 block text-sm font-semibold text-foreground/70">
                Username
              </label>
              <input
                className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/50"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-foreground/70">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full rounded-md border border-border px-3 py-2 pr-10 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/50"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-foreground/40 transition hover:text-foreground/70"
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-md bg-primary py-2.5 text-sm font-bold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-foreground/60">
            Chưa có tài khoản?{" "}
            <Link href="/register" className="font-semibold text-secondary hover:underline">
              Đăng ký ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}