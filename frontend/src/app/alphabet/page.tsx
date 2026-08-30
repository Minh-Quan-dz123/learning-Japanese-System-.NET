"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { CharacterDto, CharacterType, VariantGroup } from "@/types/character";
import { Direction, SubmitAnswerDto, PracticeSessionResultDto } from "@/types/practiceSession";
import { getCharacters } from "@/lib/characterApi";
import { submitPracticeSession } from "@/lib/practiceSessionApi";
import { getApiErrorMessage } from "@/lib/apiError";
import { playSound } from "@/lib/sound";

type Phase = "setup" | "playing" | "result";

const DIRECTION_LABELS: Record<Direction, string> = {
  HiraganaToRomaji: "Hiragana → Romaji",
  RomajiToHiragana: "Romaji → Hiragana",
  KatakanaToRomaji: "Katakana → Romaji",
  RomajiToKatakana: "Romaji → Katakana",
};

// Thời gian (ms) hiện feedback đúng/sai trước khi tự chuyển bước tiếp theo
const FEEDBACK_DELAY_MS = 700;

// Chữ nào hiện ở PHÍA CÂU HỎI theo từng hướng chơi
function getQuestionText(c: CharacterDto, direction: Direction): string {
  return direction === "RomajiToHiragana" || direction === "RomajiToKatakana" ? c.romaji : c.char;
}

// Chữ nào hiện ở PHÍA ĐÁP ÁN (ngược lại với câu hỏi)
function getOptionText(c: CharacterDto, direction: Direction): string {
  return direction === "RomajiToHiragana" || direction === "RomajiToKatakana" ? c.char : c.romaji;
}

function characterTypeOf(direction: Direction): CharacterType {
  return direction === "HiraganaToRomaji" || direction === "RomajiToHiragana" ? "Hiragana" : "Katakana";
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Feedback hiển thị ngay sau khi user bấm 1 đáp án, trước khi biết
// bước tiếp theo là "thử lại" hay "chuyển câu"
type SelectionFeedback = { selectedId: string; isCorrect: boolean };

export default function AlphabetPage() {
  const { user, isLoading } = useAuth();
  const [phase, setPhase] = useState<Phase>("setup");

  // --- Setup state ---
  const [direction, setDirection] = useState<Direction>("HiraganaToRomaji");
  const [allCharacters, setAllCharacters] = useState<CharacterDto[]>([]);
  const [loadingChars, setLoadingChars] = useState(true);
  const [charError, setCharError] = useState<string | null>(null);
  const [selectedCharIds, setSelectedCharIds] = useState<Set<string>>(new Set());
  const [timePerQuestionSec, setTimePerQuestionSec] = useState(30);
  const [maxMistakes, setMaxMistakes] = useState(1);
  const [setupError, setSetupError] = useState<string | null>(null);

  // --- Playing state ---
  const [questions, setQuestions] = useState<CharacterDto[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<SubmitAnswerDto[]>([]);
  // Đếm số lần sai CỦA CÂU HIỆN TẠI — reset về 0 mỗi khi sang câu mới
  // (cập nhật 2026-08-25: không còn cộng dồn cả ván, xem DECISIONS_LOG.md)
  const [questionMistakes, setQuestionMistakes] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [feedback, setFeedback] = useState<SelectionFeedback | null>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Result state ---
  const [result, setResult] = useState<PracticeSessionResultDto | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading || !user) return;
    loadCharacters(direction);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, user]);

  // Dọn timer feedback nếu component unmount giữa chừng (tránh setState sau khi unmount)
  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, []);

  async function loadCharacters(dir: Direction) {
    setLoadingChars(true);
    setCharError(null);
    try {
      const list = await getCharacters(characterTypeOf(dir));
      setAllCharacters(list);
      setSelectedCharIds(new Set()); // đổi hướng -> đổi bộ chữ -> reset lựa chọn cũ
    } catch (err) {
      setCharError(getApiErrorMessage(err, "Không tải được bảng chữ cái"));
    } finally {
      setLoadingChars(false);
    }
  }

  function handleDirectionChange(newDirection: Direction) {
    setDirection(newDirection);
    loadCharacters(newDirection);
  }

  function toggleChar(id: string) {
    setSelectedCharIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Chọn nhanh theo nhóm biến âm — README: bấm vào thì các chữ thuộc nhóm
  // tự tô xanh (được thêm vào lựa chọn), user vẫn tự tick/bỏ tick từng chữ sau đó.
  function selectGroup(predicate: (v: VariantGroup) => boolean) {
    setSelectedCharIds((prev) => {
      const next = new Set(prev);
      allCharacters.filter((c) => predicate(c.variantGroup)).forEach((c) => next.add(c.id));
      return next;
    });
  }

  function handleStartQuiz() {
    setSetupError(null);
    if (selectedCharIds.size === 0) {
      setSetupError("Cần chọn ít nhất 1 chữ cái để luyện tập.");
      return;
    }
    if (timePerQuestionSec < 0) {
      setSetupError("Thời gian mỗi câu không hợp lệ.");
      return;
    }
    if (maxMistakes < 1) {
      setSetupError("Số lần cho phép sai tối thiểu là 1.");
      return;
    }
    const selected = allCharacters.filter((c) => selectedCharIds.has(c.id));
    setQuestions(shuffle(selected));
    setCurrentIndex(0);
    setAnswers([]);
    setQuestionMistakes(0);
    setFeedback(null);
    setResult(null);
    setSubmitError(null);
    setPhase("playing");
  }

  // Đếm giờ mỗi câu — chỉ chạy khi có giới hạn thời gian (0 = vô hạn).
  // Không đếm tiếp trong lúc đang hiện feedback (tránh hết giờ đúng lúc feedback
  // đang chạy, gây xử lý trùng lặp) — dừng interval, resetTimeLeft khi sang câu mới.
  useEffect(() => {
    if (phase !== "playing" || timePerQuestionSec === 0) return;
    setTimeLeft(timePerQuestionSec);
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentIndex]);

  // Đáp án hiển thị mỗi câu — random lại thứ tự mỗi khi sang câu mới
  const currentOptions = useMemo(() => shuffle(questions), [currentIndex, questions]);

  // Ghi nhận 1 câu đã CHỐT xong (đúng, hoặc sai đủ số lần, hoặc hết giờ) —
  // đẩy vào mảng answers gửi lên Backend, reset bộ đếm sai, rồi chuyển câu/kết thúc ván.
  function finalizeQuestion(selectedCharacterId: string | null) {
    const currentQuestion = questions[currentIndex];
    const newAnswers = [...answers, { characterId: currentQuestion.id, selectedCharacterId }];
    setAnswers(newAnswers);
    setQuestionMistakes(0);

    const isLastQuestion = currentIndex + 1 >= questions.length;
    if (isLastQuestion) {
      playSound("finish");
      finishQuiz(newAnswers);
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  }

  // Xử lý sau khi biết đúng/sai (không tính hết giờ): đúng -> chốt câu ngay;
  // sai nhưng còn lượt thử -> ở lại câu này, chỉ tăng bộ đếm; sai hết lượt -> chốt câu là sai.
  function resolveSelection(selectedCharacterId: string, isCorrect: boolean) {
    if (isCorrect) {
      finalizeQuestion(selectedCharacterId);
      return;
    }
    const newMistakes = questionMistakes + 1;
    if (newMistakes < maxMistakes) {
      setQuestionMistakes(newMistakes);
    } else {
      finalizeQuestion(selectedCharacterId);
    }
  }

  function handleTimeout() {
    if (feedback) return; // đang hiện feedback của lượt bấm trước thì bỏ qua, tránh chốt trùng
    // Hết giờ = hết thời gian của câu này luôn, không có khái niệm "thử lại"
    // (khác với bấm sai còn thời gian) — chốt câu là sai ngay.
    playSound("wrong");
    finalizeQuestion(null);
  }

  function handleSelectOption(charId: string) {
    if (feedback || isSubmitting) return; // đang hiện feedback hoặc đang nộp bài thì chặn bấm dồn
    const currentQuestion = questions[currentIndex];
    const isCorrect = charId === currentQuestion.id;

    playSound(isCorrect ? "correct" : "wrong");
    setFeedback({ selectedId: charId, isCorrect });

    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedback(null);
      resolveSelection(charId, isCorrect);
    }, FEEDBACK_DELAY_MS);
  }

  function handleEndEarly() {
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    setFeedback(null);
    // Người chơi tự bấm kết thúc giữa chừng — nộp bài với số câu đã trả lời tới lúc này
    finishQuiz(answers);
  }

  async function finishQuiz(finalAnswers: SubmitAnswerDto[]) {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await submitPracticeSession({
        moduleType: "AlphabetQuiz",
        direction,
        timePerQuestionSec,
        maxMistakes,
        answers: finalAnswers,
      });
      setResult(res);
      setPhase("result");
    } catch (err) {
      setSubmitError(getApiErrorMessage(err, "Nộp bài thất bại"));
    } finally {
      setIsSubmitting(false);
    }
  }

  function handlePlaySame() {
    setQuestions(shuffle(questions));
    setCurrentIndex(0);
    setAnswers([]);
    setQuestionMistakes(0);
    setFeedback(null);
    setResult(null);
    setSubmitError(null);
    setPhase("playing");
  }

  function handlePlayNew() {
    setResult(null);
    setPhase("setup");
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

  // ============================= PHASE: SETUP =============================
  if (phase === "setup") {
    return (
      <div className="min-h-screen bg-surface">
        <div className="mx-auto max-w-3xl px-6 py-10">
          <Link
            href="/"
            className="group mb-4 inline-flex items-center gap-2 text-sm font-semibold text-foreground/60 transition hover:text-primary"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-base transition group-hover:border-primary group-hover:bg-primary group-hover:text-white">
              ←
            </span>
            Trang chủ
          </Link>
          <p className="text-xs font-bold uppercase tracking-wider text-secondary">
            Module 1
          </p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-foreground">
            Luyện tập Bảng chữ cái
          </h1>
          <p className="mt-2 text-sm text-foreground/60">
            Chọn hướng chơi, bộ chữ muốn luyện và tùy chỉnh độ khó trước khi bắt đầu.
          </p>

          {/* Card: hướng chơi + bảng chữ cái */}
          <div className="mt-8 rounded-xl border border-border bg-background p-6 shadow-sm">
            <label className="mb-2 block text-sm font-semibold text-foreground">
              Hướng chơi
            </label>
            <select
              value={direction}
              onChange={(e) => handleDirectionChange(e.target.value as Direction)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              {Object.entries(DIRECTION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                onClick={() => selectGroup((v) => v === "Base")}
                className="rounded-full border border-border px-3 py-1.5 text-sm font-medium text-foreground/70 transition hover:border-primary hover:text-primary"
              >
                Chữ thường
              </button>
              <button
                onClick={() => selectGroup((v) => v !== "Base")}
                className="rounded-full border border-border px-3 py-1.5 text-sm font-medium text-foreground/70 transition hover:border-primary hover:text-primary"
              >
                Tất cả biến âm
              </button>
              <button
                onClick={() => selectGroup(() => true)}
                className="rounded-full border border-border px-3 py-1.5 text-sm font-medium text-foreground/70 transition hover:border-primary hover:text-primary"
              >
                Chọn toàn bộ
              </button>
              <button
                onClick={() => setSelectedCharIds(new Set())}
                className="rounded-full border border-border px-3 py-1.5 text-sm font-medium text-foreground/70 transition hover:border-danger hover:text-danger"
              >
                Bỏ chọn hết
              </button>
            </div>

            <div className="mt-5">
              {loadingChars && (
                <p className="py-8 text-center text-sm text-foreground/50">
                  Đang tải bảng chữ cái...
                </p>
              )}
              {charError && <p className="text-sm text-danger">{charError}</p>}

              {!loadingChars && !charError && (
                <div className="grid grid-cols-5 gap-2 sm:grid-cols-6 md:grid-cols-8">
                  {allCharacters.map((c) => {
                    const selected = selectedCharIds.has(c.id);
                    return (
                      <button
                        key={c.id}
                        onClick={() => toggleChar(c.id)}
                        className={`rounded-lg border py-2.5 text-center transition ${
                          selected
                            ? "border-primary bg-primary text-white shadow-sm"
                            : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-primary/5"
                        }`}
                      >
                        <div className="text-lg font-semibold">{c.char}</div>
                        <div
                          className={`text-xs ${
                            selected ? "text-white/80" : "text-foreground/50"
                          }`}
                        >
                          {c.romaji}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <p className="mt-4 text-sm font-medium text-foreground/60">
              Đã chọn <span className="font-bold text-primary">{selectedCharIds.size}</span> chữ
            </p>
          </div>

          {/* Card: thời gian + số lần sai */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-background p-5 shadow-sm">
              <label className="mb-2 block text-sm font-semibold text-foreground">
                Thời gian mỗi câu (giây)
              </label>
              <input
                type="number"
                min={0}
                value={timePerQuestionSec}
                onChange={(e) => setTimePerQuestionSec(Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <p className="mt-1.5 text-xs text-foreground/50">0 = vô hạn thời gian</p>
            </div>
            <div className="rounded-xl border border-border bg-background p-5 shadow-sm">
              <label className="mb-2 block text-sm font-semibold text-foreground">
                Cho phép sai tối đa (mỗi câu)
              </label>
              <input
                type="number"
                min={1}
                value={maxMistakes}
                onChange={(e) => setMaxMistakes(Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <p className="mt-1.5 text-xs text-foreground/50">Áp dụng riêng cho từng câu</p>
            </div>
          </div>

          {setupError && (
            <p className="mt-4 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
              {setupError}
            </p>
          )}

          <button
            onClick={handleStartQuiz}
            className="mt-6 w-full rounded-lg bg-primary px-6 py-3 text-base font-bold text-white shadow-sm transition hover:bg-primary-hover sm:w-auto"
          >
            Bắt đầu luyện tập
          </button>
        </div>
      </div>
    );
  }

  // ============================= PHASE: PLAYING =============================
  if (phase === "playing") {
    const currentQuestion = questions[currentIndex];
    const progress = (currentIndex / questions.length) * 100;
    return (
      <div className="min-h-screen bg-surface">
        <div className="mx-auto max-w-2xl px-6 py-10">
          {/* Thanh tiến độ */}
          <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium text-foreground/60">
              Câu <span className="font-bold text-foreground">{currentIndex + 1}</span>/
              {questions.length}
              {" · "}Sai {questionMistakes}/{maxMistakes}
            </span>
            <div className="flex items-center gap-3">
              {timePerQuestionSec > 0 && (
                <span
                  className={`rounded-full px-3 py-1 text-sm font-bold ${
                    timeLeft <= 5 ? "bg-danger/10 text-danger" : "bg-secondary/10 text-secondary"
                  }`}
                >
                  {timeLeft}s
                </span>
              )}
              <button
                onClick={handleEndEarly}
                className="text-sm font-medium text-danger transition hover:underline"
              >
                Kết thúc
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-background px-8 py-12 text-center shadow-sm">
            <div className="text-6xl font-extrabold text-foreground">
              {getQuestionText(currentQuestion, direction)}
            </div>

            {/* Feedback đúng/sai ngay sau khi bấm, trước khi chuyển bước tiếp theo */}
            <div className="mt-4 h-6">
              {feedback && (
                <span
                  className={`text-sm font-bold ${
                    feedback.isCorrect ? "text-success" : "text-danger"
                  }`}
                >
                  {feedback.isCorrect
                    ? "✓ Chính xác!"
                    : questionMistakes + 1 < maxMistakes
                    ? "Sai rồi, thử lại!"
                    : "Sai rồi!"}
                </span>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {currentOptions.map((c) => {
              const isSelected = feedback?.selectedId === c.id;
              const isCorrectAnswer = c.id === currentQuestion.id;
              // Trong lúc hiện feedback: tô xanh lá đáp án đúng, tô đỏ đáp án vừa chọn sai
              let extraClass =
                "border-border bg-background text-foreground hover:border-primary/40 hover:bg-primary/5";
              if (feedback) {
                if (isCorrectAnswer && feedback.isCorrect)
                  extraClass = "border-success bg-success text-white";
                else if (isSelected && !feedback.isCorrect)
                  extraClass = "border-danger bg-danger text-white";
              }
              return (
                <button
                  key={c.id}
                  onClick={() => handleSelectOption(c.id)}
                  disabled={isSubmitting || feedback !== null}
                  className={`rounded-lg border-2 py-4 text-lg font-semibold transition disabled:opacity-90 ${extraClass}`}
                >
                  {getOptionText(c, direction)}
                </button>
              );
            })}
          </div>

          {isSubmitting && (
            <p className="mt-6 text-center text-sm text-foreground/50">Đang nộp bài...</p>
          )}
          {submitError && (
            <p className="mt-6 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-center text-sm text-danger">
              {submitError}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ============================= PHASE: RESULT =============================
  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <Link
          href="/"
          className="group mb-4 inline-flex items-center gap-2 text-sm font-semibold text-foreground/60 transition hover:text-primary"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-base transition group-hover:border-primary group-hover:bg-primary group-hover:text-white">
            ←
          </span>
          Trang chủ
        </Link>
        <p className="text-xs font-bold uppercase tracking-wider text-secondary">Kết quả</p>
        <h1 className="mt-1 text-2xl font-extrabold text-foreground">
          Hoàn thành lượt luyện tập
        </h1>

        {result && (
          <div className="mt-8 inline-flex flex-col items-center rounded-2xl border border-border bg-background px-12 py-8 shadow-sm">
            <span className="text-5xl font-extrabold text-primary">
              {result.score}
              <span className="text-foreground/30">/{result.totalQuestions}</span>
            </span>
            <span className="mt-2 text-sm font-medium text-foreground/50">
              câu trả lời đúng
            </span>
          </div>
        )}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            onClick={handlePlaySame}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-primary-hover"
          >
            Chơi lại ván này
          </button>
          <button
            onClick={handlePlayNew}
            className="rounded-lg border border-border px-5 py-2.5 text-sm font-bold text-foreground/70 transition hover:border-primary hover:text-primary"
          >
            Chơi ván mới
          </button>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
          {result && (
            <Link
              href={`/practice-sessions/${result.id}`}
              className="font-medium text-secondary transition hover:text-secondary-hover hover:underline"
            >
              Review bài làm
            </Link>
          )}
          <Link
            href="/practice-sessions"
            className="font-medium text-secondary transition hover:text-secondary-hover hover:underline"
          >
            Lịch sử luyện tập
          </Link>
          <Link
            href="/practice-sessions/stats"
            className="font-medium text-secondary transition hover:text-secondary-hover hover:underline"
          >
            Thống kê tỉ lệ sai
          </Link>
        </div>
      </div>
    </div>
  );
}