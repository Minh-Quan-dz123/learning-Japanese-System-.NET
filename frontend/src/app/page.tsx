"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { logout } from "@/lib/authApi";

interface ModuleInfo {
  title: string;
  glyph: string; // ký tự tiếng Nhật dùng làm icon — không cần thư viện icon
  description: string;
  href: string | null; // null = chưa có UI, hiện dạng "Sắp ra mắt"
  accent: "primary" | "secondary"; // chỉ dùng khi href !== null
}

const modules: ModuleInfo[] = [
  {
    title: "Module 1 — Bảng chữ cái",
    glyph: "あ",
    description: "Luyện tập hiragana, katakana ↔ romaji, xem thống kê tỉ lệ sai.",
    href: "/alphabet",
    accent: "primary",
  },
  {
    title: "Module 2 — Luyện chính tả",
    glyph: "書",
    description: "Viết tay trên canvas, AI nhận diện chữ.",
    href: null,
    accent: "secondary",
  },
  {
    title: "Module 3 — Quản lý từ vựng",
    glyph: "語",
    description: "Quản lý chủ đề, từ vựng riêng, luyện tập điền đáp án.",
    href: "/topics",
    accent: "secondary",
  },
  {
    title: "Module 4 — Ngữ pháp",
    glyph: "文",
    description: "Đang chờ mô tả nghiệp vụ chi tiết.",
    href: null,
    accent: "primary",
  },
];

// ← THÊM MỚI: module ảo cho Admin, tách riêng khỏi mảng `modules` cố định
// vì cái này chỉ hiện có điều kiện (theo role), không phải danh sách tĩnh.
const adminModule: ModuleInfo = {
  title: "Quản lý bảng chữ cái",
  glyph: "管",
  description: "Thêm / sửa / xóa hiragana, katakana (chỉ Admin).",
  href: "/admin/characters",
  accent: "primary",
};

export default function HomePage() {
  const { user, isLoading, clearAuth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [isLoading, user, router]);

  async function handleLogout() {
    try {
      await logout();
    } catch {
      // Kể cả API logout lỗi (VD mất mạng), vẫn dọn state phía FE
    } finally {
      clearAuth();
      router.push("/login");
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-foreground/50">Đang tải...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // ← THÊM MỚI: ghép thêm adminModule vào cuối danh sách nếu user là Admin,
  // không sửa mảng `modules` gốc (giữ nó là hằng số cố định, tách biệt phần động theo role).
  const visibleModules =
    user.role === "Admin" ? [...modules, adminModule] : modules;

  return (
    <div className="min-h-screen bg-surface">
      <nav className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-lg font-bold text-white">
              日
            </span>
            <span className="text-base font-bold tracking-tight text-foreground">
              Japanese Learning
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-md border border-border px-3 py-1.5 text-sm font-semibold text-foreground/70 transition hover:border-danger hover:text-danger"
          >
            Đăng xuất
          </button>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-10">
          <p className="flex items-center gap-2 text-sm font-semibold text-secondary">
            Xin chào, {user.username}
            <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-xs font-semibold text-secondary">
              {user.role}
            </span>
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground">
            Bạn muốn luyện tập gì hôm nay?
          </h1>
          <p className="mt-2 text-sm text-foreground/60">
            Chọn 1 module bên dưới để bắt đầu.
          </p>
        </div>

        {/* ← THAY ĐỔI: map qua `visibleModules` thay vì `modules` */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {visibleModules.map((mod) =>
            mod.href ? (
              <Link
                key={mod.title}
                href={mod.href}
                className={`group flex items-start gap-4 rounded-xl border border-border bg-background p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                  mod.accent === "primary"
                    ? "hover:border-primary/40"
                    : "hover:border-secondary/40"
                }`}
              >
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-xl font-bold ${
                    mod.accent === "primary"
                      ? "bg-primary/10 text-primary"
                      : "bg-secondary/10 text-secondary"
                  }`}
                >
                  {mod.glyph}
                </span>
                <div className="min-w-0">
                  <h2 className="font-bold text-foreground">{mod.title}</h2>
                  <p className="mt-1 text-sm text-foreground/60">
                    {mod.description}
                  </p>
                </div>
                <span
                  className={`ml-auto self-center text-lg opacity-0 transition group-hover:opacity-100 ${
                    mod.accent === "primary" ? "text-primary" : "text-secondary"
                  }`}
                  aria-hidden="true"
                >
                  →
                </span>
              </Link>
            ) : (
              <div
                key={mod.title}
                className="relative flex items-start gap-4 rounded-xl border border-dashed border-border bg-background p-5"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-surface text-xl font-bold text-foreground/40">
                  {mod.glyph}
                </span>
                <div className="min-w-0">
                  <h2 className="font-bold text-foreground/70">{mod.title}</h2>
                  <p className="mt-1 text-sm text-foreground/50">
                    {mod.description}
                  </p>
                </div>
                <span className="absolute right-4 top-4 rounded-full bg-caution/15 px-2 py-0.5 text-xs font-semibold text-foreground/70">
                  Sắp ra mắt
                </span>
              </div>
            )
          )}
        </div>
      </main>
    </div>
  );
}