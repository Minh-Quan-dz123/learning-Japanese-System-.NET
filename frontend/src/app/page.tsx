"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { logout } from "@/lib/authApi";

interface ModuleInfo {
  title: string;
  description: string;
  href: string | null; // null = chưa có UI, hiện dạng disabled
}

const modules: ModuleInfo[] = [
  {
    title: "Module 1 — Bảng chữ cái",
    description: "Luyện tập hiragana, katakana ↔ romaji, xem thống kê tỉ lệ sai.",
    href: "/alphabet",
  },
  {
    title: "Module 2 — Luyện chính tả",
    description: "Viết tay trên canvas, AI nhận diện chữ.",
    href: null,
  },
  {
    title: "Module 3 — Quản lý từ vựng",
    description: "Quản lý chủ đề, từ vựng riêng, luyện tập điền đáp án.",
    href: "/topics",
  },
  {
    title: "Module 4 — Ngữ pháp",
    description: "Đang chờ mô tả nghiệp vụ chi tiết.",
    href: null,
  },
];

export default function HomePage() {
  const { user, isLoading, clearAuth } = useAuth();
  const router = useRouter();

  // Guard: chưa đăng nhập thì đá về /login.
  // Giống 1 câu `if (!isValid) return;` chặn đầu hàm, nhưng ở đây là chặn đầu component.
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
      // để tránh user bị kẹt ở trạng thái "tưởng đã đăng xuất nhưng chưa".
    } finally {
      clearAuth();
      router.push("/login");
    }
  }

  // Đang chờ tryRefresh() chạy xong (xem AuthContext) — tránh nháy UI.
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Đang tải...</p>
      </div>
    );
  }

  // user === null nghĩa là useEffect ở trên đang redirect —
  // render tạm rỗng để tránh hiện nội dung 1 nhoáng trước khi chuyển trang.
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="flex items-center justify-between border-b bg-white px-6 py-4 shadow-sm">
        <span className="text-lg font-semibold">Japanese Learning System</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            Xin chào <strong>{user.username}</strong> ({user.role})
          </span>
          <button
            onClick={handleLogout}
            className="rounded bg-red-500 px-3 py-1.5 text-sm text-white hover:bg-red-600"
          >
            Đăng xuất
          </button>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="mb-6 text-2xl font-bold">Các module luyện tập</h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {modules.map((mod) =>
            mod.href ? (
              <Link
                key={mod.title}
                href={mod.href}
                className="rounded-lg border bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <h2 className="mb-2 font-semibold">{mod.title}</h2>
                <p className="text-sm text-gray-600">{mod.description}</p>
              </Link>
            ) : (
              <div
                key={mod.title}
                className="relative rounded-lg border bg-gray-100 p-5 opacity-60"
              >
                <span className="absolute right-3 top-3 rounded bg-gray-400 px-2 py-0.5 text-xs text-white">
                  Sắp ra mắt
                </span>
                <h2 className="mb-2 font-semibold">{mod.title}</h2>
                <p className="text-sm text-gray-600">{mod.description}</p>
              </div>
            )
          )}
        </div>
      </main>
    </div>
  );
}