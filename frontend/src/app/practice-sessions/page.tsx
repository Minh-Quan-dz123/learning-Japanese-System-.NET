"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { getMyPracticeSessions } from "@/lib/practiceSessionApi";
import { PracticeSessionSummaryDto } from "@/types/practiceSession";
import { getApiErrorMessage } from "@/lib/apiError";

const PAGE_SIZE = 20;

const DIRECTION_LABELS: Record<string, string> = {
  HiraganaToRomaji: "Hiragana → Romaji",
  RomajiToHiragana: "Romaji → Hiragana",
  KatakanaToRomaji: "Katakana → Romaji",
  RomajiToKatakana: "Romaji → Katakana",
};

export default function PracticeSessionsPage() {
  const { user, isLoading } = useAuth();
  const [sessions, setSessions] = useState<PracticeSessionSummaryDto[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading || !user) return;
    load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, user, page]);

  async function load(p: number) {
    setLoading(true);
    setError(null);
    try {
      const res = await getMyPracticeSessions(p, PAGE_SIZE);
      setSessions(res.items);
      setTotalPages(res.totalPages);
    } catch (err) {
      setError(getApiErrorMessage(err, "Không tải được lịch sử luyện tập"));
    } finally {
      setLoading(false);
    }
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
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-secondary">
              Module 1
            </p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-foreground">
              Lịch sử luyện tập
            </h1>
          </div>
          <div className="flex gap-4 text-sm">
            <Link
              href="/practice-sessions/stats"
              className="font-medium text-secondary transition hover:text-secondary-hover hover:underline"
            >
              Xem thống kê tỉ lệ sai
            </Link>
            <Link
              href="/alphabet"
              className="font-medium text-primary transition hover:text-primary-hover hover:underline"
            >
              Luyện tập ngay
            </Link>
          </div>
        </div>

        {loading && (
          <p className="py-12 text-center text-sm text-foreground/50">Đang tải...</p>
        )}
        {error && (
          <p className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        )}
        {!loading && !error && sessions.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-background px-6 py-12 text-center">
            <p className="text-sm text-foreground/50">Chưa có lượt luyện tập nào.</p>
            <Link
              href="/alphabet"
              className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
            >
              Bắt đầu luyện tập đầu tiên →
            </Link>
          </div>
        )}

        {!loading && !error && sessions.length > 0 && (
          <div className="flex flex-col gap-3">
            {sessions.map((s) => {
              const ratio = s.totalQuestions > 0 ? s.score / s.totalQuestions : 0;
              const scoreColor =
                ratio >= 0.8 ? "text-success" : ratio >= 0.5 ? "text-secondary" : "text-danger";
              return (
                <Link
                  key={s.id}
                  href={`/practice-sessions/${s.id}`}
                  className="flex items-center justify-between rounded-xl border border-border bg-background px-5 py-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
                >
                  <div>
                    <div className="font-bold text-foreground">
                      {DIRECTION_LABELS[s.direction] ?? s.direction}
                    </div>
                    <div className="mt-0.5 text-sm text-foreground/50">
                      {new Date(s.createdAt).toLocaleString("vi-VN")}
                    </div>
                  </div>
                  <div className={`text-xl font-extrabold ${scoreColor}`}>
                    {s.score}
                    <span className="text-foreground/30">/{s.totalQuestions}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-3">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground/70 transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:text-foreground/70"
            >
              ← Trước
            </button>
            <span className="text-sm font-medium text-foreground/60">
              Trang {page}/{totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground/70 transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:text-foreground/70"
            >
              Sau →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}