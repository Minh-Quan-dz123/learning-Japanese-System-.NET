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

  if (isLoading) return <p className="p-6">Đang tải...</p>;
  if (!user) {
    return (
      <p className="p-6">
        Bạn chưa đăng nhập. <Link href="/login" className="text-blue-600 underline">Đăng nhập</Link>
      </p>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Lịch sử luyện tập</h1>
        <div className="flex gap-3">
          <Link href="/practice-sessions/stats" className="text-blue-600 underline text-sm">
            Xem thống kê tỉ lệ sai
          </Link>
          <Link href="/alphabet" className="text-blue-600 underline text-sm">
            Luyện tập ngay
          </Link>
        </div>
      </div>

      {loading && <p>Đang tải...</p>}
      {error && <p className="text-red-600">{error}</p>}
      {!loading && !error && sessions.length === 0 && (
        <p className="text-gray-500">Chưa có lượt luyện tập nào.</p>
      )}

      {!loading && !error && sessions.length > 0 && (
        <div className="flex flex-col gap-2">
          {sessions.map((s) => (
            <Link
              key={s.id}
              href={`/practice-sessions/${s.id}`}
              className="border rounded px-4 py-3 flex justify-between items-center hover:bg-gray-50"
            >
              <div>
                <div className="font-medium">{DIRECTION_LABELS[s.direction] ?? s.direction}</div>
                <div className="text-sm text-gray-500">
                  {new Date(s.createdAt).toLocaleString("vi-VN")}
                </div>
              </div>
              <div className="text-lg font-bold">
                {s.score}/{s.totalQuestions}
              </div>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="border rounded px-3 py-1 disabled:opacity-40"
          >
            Trước
          </button>
          <span className="px-2 py-1 text-sm">
            Trang {page}/{totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="border rounded px-3 py-1 disabled:opacity-40"
          >
            Sau
          </button>
        </div>
      )}
    </div>
  );
}