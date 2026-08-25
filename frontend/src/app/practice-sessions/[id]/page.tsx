"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getPracticeSessionDetail } from "@/lib/practiceSessionApi";
import { PracticeSessionDetailDto } from "@/types/practiceSession";
import { getApiErrorMessage } from "@/lib/apiError";

const DIRECTION_LABELS: Record<string, string> = {
  HiraganaToRomaji: "Hiragana → Romaji",
  RomajiToHiragana: "Romaji → Hiragana",
  KatakanaToRomaji: "Katakana → Romaji",
  RomajiToKatakana: "Romaji → Katakana",
};

export default function PracticeSessionDetailPage() {
  const { user, isLoading } = useAuth();
  const params = useParams<{ id: string }>();
  const [detail, setDetail] = useState<PracticeSessionDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading || !user || !params.id) return;
    load(params.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, user, params.id]);

  async function load(id: string) {
    setLoading(true);
    setError(null);
    try {
      setDetail(await getPracticeSessionDetail(id));
    } catch (err) {
      setError(getApiErrorMessage(err, "Không tải được chi tiết lượt chơi"));
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

      {loading && <p className="mt-4">Đang tải...</p>}
      {error && <p className="mt-4 text-red-600">{error}</p>}

      {detail && (
        <>
          <h1 className="text-2xl font-bold mt-4 mb-1">
            {DIRECTION_LABELS[detail.direction] ?? detail.direction}
          </h1>
          <p className="text-sm text-gray-500 mb-4">
            {new Date(detail.createdAt).toLocaleString("vi-VN")} — Điểm{" "}
            <strong>{detail.score}/{detail.totalQuestions}</strong>
          </p>

          <div className="flex flex-col gap-2">
            {detail.answers
              .slice()
              .sort((a, b) => a.answerOrder - b.answerOrder)
              .map((a) => (
                <div
                  key={a.answerOrder}
                  className={`border rounded px-4 py-3 flex justify-between items-center ${
                    a.isCorrect ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"
                  }`}
                >
                  <div>
                    <div className="text-sm text-gray-500">Câu {a.answerOrder + 1}</div>
                    <div className="text-lg">
                      Đề bài:{" "}
                      <strong>
                        {a.character
                          ? `${a.character.char} (${a.character.romaji})`
                          : "(admin đã xóa chữ này)"}
                      </strong>
                    </div>
                    <div className="text-sm">
                      Bạn chọn:{" "}
                      {a.selectedCharacter
                        ? `${a.selectedCharacter.char} (${a.selectedCharacter.romaji})`
                        : a.isCorrect
                        ? "—"
                        : "(không chọn kịp / chữ đã bị xóa)"}
                    </div>
                  </div>
                  <div className="text-xl">{a.isCorrect ? "✅" : "❌"}</div>
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  );
}