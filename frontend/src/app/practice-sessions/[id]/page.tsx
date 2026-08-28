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

        {loading && (
          <p className="mt-8 py-12 text-center text-sm text-foreground/50">Đang tải...</p>
        )}
        {error && (
          <p className="mt-6 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        )}

        {detail && (
          <>
            <p className="mt-6 text-xs font-bold uppercase tracking-wider text-secondary">
              Review bài làm
            </p>
            <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
                {DIRECTION_LABELS[detail.direction] ?? detail.direction}
              </h1>
              <span className="text-2xl font-extrabold text-primary">
                {detail.score}
                <span className="text-base font-medium text-foreground/40">
                  /{detail.totalQuestions}
                </span>
              </span>
            </div>
            <p className="mt-1 text-sm text-foreground/50">
              {new Date(detail.createdAt).toLocaleString("vi-VN")}
            </p>

            <div className="mt-6 flex flex-col gap-3">
              {detail.answers
                .slice()
                .sort((a, b) => a.answerOrder - b.answerOrder)
                .map((a) => (
                  <div
                    key={a.answerOrder}
                    className={`flex items-center justify-between rounded-xl border px-5 py-4 ${
                      a.isCorrect
                        ? "border-success/30 bg-success/5"
                        : "border-danger/30 bg-danger/5"
                    }`}
                  >
                    <div>
                      <div className="text-xs font-semibold text-foreground/40">
                        Câu {a.answerOrder + 1}
                      </div>
                      <div className="mt-0.5 text-lg font-bold text-foreground">
                        {a.character ? (
                          <>
                            {a.character.char}{" "}
                            <span className="text-base font-medium text-foreground/50">
                              ({a.character.romaji})
                            </span>
                          </>
                        ) : (
                          <span className="text-base font-medium italic text-foreground/40">
                            (admin đã xóa chữ này)
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-sm text-foreground/60">
                        Bạn chọn:{" "}
                        <span className="font-medium">
                          {a.selectedCharacter
                            ? `${a.selectedCharacter.char} (${a.selectedCharacter.romaji})`
                            : a.isCorrect
                            ? "—"
                            : "(không chọn kịp / chữ đã bị xóa)"}
                        </span>
                      </div>
                    </div>
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base font-bold ${
                        a.isCorrect
                          ? "bg-success/15 text-success"
                          : "bg-danger/15 text-danger"
                      }`}
                    >
                      {a.isCorrect ? "✓" : "✗"}
                    </div>
                  </div>
                ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}