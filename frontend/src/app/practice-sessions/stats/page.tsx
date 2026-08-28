"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { getMyCharacterStats } from "@/lib/characterApi";
import { CharacterStatDto } from "@/types/character";
import { getApiErrorMessage } from "@/lib/apiError";

export default function CharacterStatsPage() {
  const { user, isLoading } = useAuth();
  const [stats, setStats] = useState<CharacterStatDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading || !user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, user]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await getMyCharacterStats();
      // Chữ hay sai nhất lên đầu — đúng mục đích màn hình (README: "biết chữ nào cần luyện thêm")
      setStats([...res].sort((a, b) => b.wrongRate - a.wrongRate));
    } catch (err) {
      setError(getApiErrorMessage(err, "Không tải được thống kê"));
    } finally {
      setLoading(false);
    }
  }

  // Màu theo mức độ tỉ lệ sai — thuần hiển thị, không đổi số liệu/thứ tự
  function severityColor(rate: number): { text: string; bar: string } {
    if (rate >= 0.5) return { text: "text-danger", bar: "bg-danger" };
    if (rate >= 0.2) return { text: "text-warning", bar: "bg-warning" };
    return { text: "text-success", bar: "bg-success" };
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <p className="text-sm text-foreground/50">Đang tải...</p>
      </div>
    );
  }
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <p className="text-sm text-foreground/70">
          Bạn chưa đăng nhập.{" "}
          <Link href="/login" className="font-medium text-secondary hover:underline">
            Đăng nhập
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-2xl px-6 py-10">
        <Link
          href="/practice-sessions"
          className="text-sm font-medium text-secondary transition hover:text-secondary-hover hover:underline"
        >
          ← Quay lại lịch sử
        </Link>

        <p className="mt-6 text-xs font-bold uppercase tracking-wider text-secondary">
          Module 1
        </p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-foreground">
          Thống kê tỉ lệ sai
        </h1>
        <p className="mt-2 text-sm text-foreground/60">
          Xếp theo tỉ lệ sai giảm dần — chữ đầu danh sách là chữ bạn cần luyện thêm nhất.
        </p>

        {loading && (
          <p className="mt-8 py-12 text-center text-sm text-foreground/50">Đang tải...</p>
        )}
        {error && (
          <p className="mt-6 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        )}
        {!loading && !error && stats.length === 0 && (
          <div className="mt-6 rounded-xl border border-dashed border-border bg-background px-6 py-12 text-center">
            <p className="text-sm text-foreground/50">
              Chưa có dữ liệu — hãy luyện tập vài lượt trước.
            </p>
            <Link
              href="/alphabet"
              className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
            >
              Bắt đầu luyện tập →
            </Link>
          </div>
        )}

        {!loading && !error && stats.length > 0 && (
          <div className="mt-6 overflow-hidden rounded-xl border border-border bg-background shadow-sm">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-surface text-left text-xs font-semibold uppercase tracking-wide text-foreground/50">
                  <th className="py-3 pl-5">Chữ</th>
                  <th className="py-3">Romaji</th>
                  <th className="py-3 text-right">Tổng số lần</th>
                  <th className="py-3 text-right">Số lần sai</th>
                  <th className="w-40 py-3 pr-5 text-right">Tỉ lệ sai</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s) => {
                  const color = severityColor(s.wrongRate);
                  const percent = Math.round(s.wrongRate * 100);
                  return (
                    <tr
                      key={s.characterId}
                      className="border-b border-border last:border-0 transition hover:bg-surface"
                    >
                      <td className="py-3 pl-5 text-2xl font-semibold text-foreground">
                        {s.char}
                      </td>
                      <td className="py-3 text-foreground/70">{s.romaji}</td>
                      <td className="py-3 text-right text-foreground/70">{s.totalAnswered}</td>
                      <td className="py-3 text-right text-foreground/70">{s.wrongCount}</td>
                      <td className="py-3 pr-5">
                        <div className="flex items-center justify-end gap-2">
                          <span className={`w-10 text-right font-bold ${color.text}`}>
                            {percent}%
                          </span>
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-border">
                            <div
                              className={`h-full rounded-full ${color.bar}`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}