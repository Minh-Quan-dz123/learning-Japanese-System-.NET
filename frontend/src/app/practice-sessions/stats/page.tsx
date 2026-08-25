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

  if (isLoading) return <p className="p-6">Đang tải...</p>;
  if (!user) {
    return (
      <p className="p-6">
        Bạn chưa đăng nhập. <Link href="/login" className="text-blue-600 underline">Đăng nhập</Link>
      </p>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Link href="/practice-sessions" className="text-blue-600 underline text-sm">
        ← Quay lại lịch sử
      </Link>
      <h1 className="text-2xl font-bold mt-4 mb-4">Thống kê tỉ lệ sai theo chữ cái</h1>

      {loading && <p>Đang tải...</p>}
      {error && <p className="text-red-600">{error}</p>}
      {!loading && !error && stats.length === 0 && (
        <p className="text-gray-500">Chưa có dữ liệu — hãy luyện tập vài lượt trước.</p>
      )}

      {!loading && !error && stats.length > 0 && (
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2">Chữ</th>
              <th className="py-2">Romaji</th>
              <th className="py-2 text-right">Tổng số lần</th>
              <th className="py-2 text-right">Số lần sai</th>
              <th className="py-2 text-right">Tỉ lệ sai</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s) => (
              <tr key={s.characterId} className="border-b">
                <td className="py-2 text-2xl">{s.char}</td>
                <td className="py-2">{s.romaji}</td>
                <td className="py-2 text-right">{s.totalAnswered}</td>
                <td className="py-2 text-right">{s.wrongCount}</td>
                <td className="py-2 text-right font-medium">
                  {(s.wrongRate * 100).toFixed(0)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}