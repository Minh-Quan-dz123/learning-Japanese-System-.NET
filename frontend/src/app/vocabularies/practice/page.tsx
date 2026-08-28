"use client";

import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { TopicDto } from "@/types/topic";
import { getTopics } from "@/lib/topicApi";
import { prepareVocabularyPractice } from "@/lib/vocabularyApi";
import {
  PracticeField,
  PracticePrepareResponse,
  PracticeSourceMode,
  VocabularyDto,
} from "@/types/vocabulary";
import { splitMeanings } from "@/lib/meaningParser";
import { getApiErrorMessage } from "@/lib/apiError";
import { playSound } from "@/lib/sound";

type Phase = "setup" | "confirmPartial" | "playing" | "result";

const FIELD_LABELS: Record<PracticeField, string> = {
  Hiragana: "Hiragana",
  Katakana: "Katakana",
  Kanji: "Kanji",
  Romaji: "Romaji",
  Meaning: "Ý nghĩa",
};

const ALL_FIELDS: PracticeField[] = ["Hiragana", "Katakana", "Kanji", "Romaji", "Meaning"];

// Feedback delay + số gợi ý tối đa — giữ nhất quán với alphabet/page.tsx
const FEEDBACK_DELAY_MS = 900;
const MAX_HINT_OPTIONS = 12;

// Khắc phục CỤC BỘ (chỉ trong file này) vấn đề font Nunito không có glyph tiếng Nhật:
// nếu chuỗi chứa ký tự Hiragana/Katakana/Kanji, tự chuyển sang font hệ thống có hỗ trợ
// tiếng Nhật thay vì để trình duyệt fallback lung tung. Không ảnh hưởng chữ Việt/Latin.
const JP_UNICODE_RANGE = /[\u3040-\u30ff\u3400-\u9fff]/;
function jpFontStyle(text: string): React.CSSProperties {
  if (!JP_UNICODE_RANGE.test(text)) return {};
  return {
    fontFamily:
      '"Hiragino Kaku Gothic ProN", "Noto Sans JP", "Yu Gothic", "Meiryo", sans-serif',
  };
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getFieldValue(word: VocabularyDto, field: PracticeField): string {
  switch (field) {
    case "Hiragana":
      return word.hiragana ?? "";
    case "Katakana":
      return word.katakana ?? "";
    case "Kanji":
      return word.kanji ?? "";
    case "Romaji":
      return word.romaji;
    case "Meaning":
      return word.meaning;
  }
}

// So đúng/sai theo đúng 3 nhánh đã chốt ở api_design.md mục 4.3:
// - Meaning: khớp ÍT NHẤT 1 trong các nghĩa (trim + lowercase)
// - Romaji: trim + lowercase
// - Hiragana/Katakana/Kanji: so chính xác sau trim
function checkAnswer(word: VocabularyDto, answerField: PracticeField, rawInput: string): boolean {
  const trimmed = rawInput.trim();
  if (trimmed.length === 0) return false;
  if (answerField === "Meaning") {
    const lower = trimmed.toLowerCase();
    return splitMeanings(word.meaning).some((m) => m.toLowerCase() === lower);
  }
  if (answerField === "Romaji") {
    return word.romaji.trim().toLowerCase() === trimmed.toLowerCase();
  }
  return getFieldValue(word, answerField).trim() === trimmed;
}

// Sinh tối đa 12 lựa chọn gợi ý, đúng 1 đáp án đúng, không trùng giá trị,
// chỉ lấy trong đúng tập words của ván đang chơi (api_design.md mục 4.3).
function buildHintOptions(
  currentWord: VocabularyDto,
  allWords: VocabularyDto[],
  answerField: PracticeField
): string[] {
  function pickValueForHint(word: VocabularyDto): string | null {
    if (answerField === "Meaning") {
      const list = splitMeanings(word.meaning);
      if (list.length === 0) return null;
      return list[Math.floor(Math.random() * list.length)];
    }
    const v = getFieldValue(word, answerField).trim();
    return v.length > 0 ? v : null;
  }

  const correctValue = pickValueForHint(currentWord);
  if (!correctValue) return [];

  const seen = new Set<string>([correctValue.toLowerCase()]);
  const wrongCandidates: string[] = [];
  for (const w of allWords) {
    if (w.id === currentWord.id) continue;
    const v = pickValueForHint(w);
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    wrongCandidates.push(v);
  }

  const wrongPicked = shuffle(wrongCandidates).slice(0, MAX_HINT_OPTIONS - 1);
  return shuffle([correctValue, ...wrongPicked]);
}

type FinalizedAnswer = { userAnswer: string; isCorrect: boolean };

function PracticePageInner() {
  const { user, isLoading } = useAuth();
  const searchParams = useSearchParams();

  const [phase, setPhase] = useState<Phase>("setup");

  // --- Setup state ---
  const [allTopics, setAllTopics] = useState<TopicDto[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [topicsError, setTopicsError] = useState<string | null>(null);
  const [selectedTopicIds, setSelectedTopicIds] = useState<Set<string>>(new Set());
  const [questionField, setQuestionField] = useState<PracticeField>("Hiragana");
  const [answerField, setAnswerField] = useState<PracticeField>("Meaning");
  const [sourceType, setSourceType] = useState<"All" | "PercentRecent" | "CountRecent">("All");
  const [percent, setPercent] = useState(20);
  const [count, setCount] = useState(15);
  const [timePerQuestionSec, setTimePerQuestionSec] = useState(0); // 0 = vô hạn
  const [maxMistakes, setMaxMistakes] = useState(1);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [prepareResult, setPrepareResult] = useState<PracticePrepareResponse | null>(null);

  // --- Playing state ---
  const [gameWords, setGameWords] = useState<VocabularyDto[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [finalizedMap, setFinalizedMap] = useState<Record<number, FinalizedAnswer>>({});
  const [mistakesMap, setMistakesMap] = useState<Record<number, number>>({});
  const [inputValue, setInputValue] = useState("");
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; correctDisplay: string } | null>(null);
  const [hintOptions, setHintOptions] = useState<string[] | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Chỉ cho nhảy cóc câu khi KHÔNG giới hạn thời gian (đúng README/api_design.md mục 4.3)
  const allowJump = timePerQuestionSec === 0;

  useEffect(() => {
    if (isLoading || !user) return;
    loadTopics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, user]);

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, []);

  async function loadTopics() {
    setLoadingTopics(true);
    setTopicsError(null);
    try {
      const list = await getTopics();
      setAllTopics(list);
      // Bấm "Luyện tập" từ trang chi tiết 1 topic (?topicId=...) -> tự tick sẵn topic đó
      const preselect = searchParams.get("topicId");
      if (preselect && list.some((t) => t.id === preselect)) {
        setSelectedTopicIds(new Set([preselect]));
      }
    } catch (err) {
      setTopicsError(getApiErrorMessage(err, "Không tải được danh sách chủ đề"));
    } finally {
      setLoadingTopics(false);
    }
  }

  function toggleTopic(id: string) {
    setSelectedTopicIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function buildSourceMode(): PracticeSourceMode {
    if (sourceType === "PercentRecent") return { type: "PercentRecent", percent };
    if (sourceType === "CountRecent") return { type: "CountRecent", count };
    return { type: "All" };
  }

  async function handlePrepare() {
    setSetupError(null);
    if (selectedTopicIds.size === 0) {
      setSetupError("Cần chọn ít nhất 1 chủ đề.");
      return;
    }
    if (questionField === answerField) {
      setSetupError("Trường câu hỏi và câu trả lời phải khác nhau.");
      return;
    }
    if (timePerQuestionSec !== 0 && timePerQuestionSec < 3) {
      setSetupError("Thời gian mỗi câu tối thiểu 3 giây (hoặc để 0 = vô hạn).");
      return;
    }
    if (maxMistakes < 1) {
      setSetupError("Số lần cho phép sai tối thiểu là 1.");
      return;
    }
    if (sourceType === "PercentRecent" && (percent < 1 || percent > 100)) {
      setSetupError("Phần trăm phải trong khoảng 1-100.");
      return;
    }
    if (sourceType === "CountRecent" && count < 1) {
      setSetupError("Số từ phải từ 1 trở lên.");
      return;
    }

    setIsPreparing(true);
    try {
      const res = await prepareVocabularyPractice({
        topicIds: Array.from(selectedTopicIds),
        questionField,
        answerField,
        sourceMode: buildSourceMode(),
      });
      setPrepareResult(res);
      if (res.totalEligible === 0) {
        setSetupError("Không có từ nào đủ điều kiện với lựa chọn hiện tại. Hãy chọn lại trường hoặc chủ đề.");
        return;
      }
      if (res.totalEligible < res.totalConsidered) {
        setPhase("confirmPartial");
      } else {
        startGame(res.words);
      }
    } catch (err) {
      setSetupError(getApiErrorMessage(err, "Chuẩn bị dữ liệu luyện tập thất bại"));
    } finally {
      setIsPreparing(false);
    }
  }

  function startGame(words: VocabularyDto[]) {
    setGameWords(shuffle(words));
    setCurrentIndex(0);
    setFinalizedMap({});
    setMistakesMap({});
    setInputValue("");
    setFeedback(null);
    setHintOptions(null);
    setPhase("playing");
  }

  // Đếm giờ mỗi câu — chỉ chạy khi có giới hạn thời gian (0 = vô hạn)
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

  const currentWord = gameWords[currentIndex];
  const currentMistakes = mistakesMap[currentIndex] ?? 0;
  const isCurrentFinalized = finalizedMap[currentIndex] !== undefined;

  // Tìm câu tiếp theo CHƯA chốt (kể cả khi trước đó có nhảy cóc lung tung),
  // đi vòng tròn từ vị trí hiện tại. Trả về null nếu mọi câu đã chốt hết -> kết thúc ván.
  function findNextUnfinishedIndex(fromIndex: number): number | null {
    const total = gameWords.length;
    for (let offset = 1; offset <= total; offset++) {
      const idx = (fromIndex + offset) % total;
      if (idx === fromIndex) continue;
      if (finalizedMap[idx] === undefined) return idx;
    }
    return null;
  }

  // Chốt 1 câu (đúng, hoặc sai đủ số lần, hoặc hết giờ) — reset bộ đếm sai của câu đó,
  // rồi chuyển sang câu chưa chốt tiếp theo hoặc kết thúc ván nếu không còn câu nào.
  function finalizeCurrent(userAnswer: string, isCorrect: boolean) {
    setFinalizedMap((prev) => ({ ...prev, [currentIndex]: { userAnswer, isCorrect } }));
    setMistakesMap((prev) => {
      const next = { ...prev };
      delete next[currentIndex];
      return next;
    });
    setHintOptions(null);
    setInputValue("");

    const nextUnfinished = findNextUnfinishedIndex(currentIndex);
    if (nextUnfinished === null) {
      playSound("finish");
      setPhase("result");
    } else {
      setCurrentIndex(nextUnfinished);
    }
  }

  function handleSubmitAnswer() {
    if (feedback || isCurrentFinalized || !currentWord) return;
    if (inputValue.trim().length === 0) return;

    const isCorrect = checkAnswer(currentWord, answerField, inputValue);
    const correctDisplay = getFieldValue(currentWord, answerField);

    playSound(isCorrect ? "correct" : "wrong");
    setFeedback({ isCorrect, correctDisplay });

    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedback(null);
      if (isCorrect) {
        finalizeCurrent(inputValue, true);
        return;
      }
      const newMistakes = currentMistakes + 1;
      if (newMistakes < maxMistakes) {
        // còn lượt thử -> KHÔNG chốt câu, chỉ tăng bộ đếm và cho gõ lại
        setMistakesMap((prev) => ({ ...prev, [currentIndex]: newMistakes }));
        setInputValue("");
        inputRef.current?.focus();
      } else {
        finalizeCurrent(inputValue, false);
      }
    }, FEEDBACK_DELAY_MS);
  }

  function handleTimeout() {
    if (feedback || isCurrentFinalized || !currentWord) return;
    // Hết giờ = chốt ngay, không có "thử lại" (giống quyết định đã áp dụng ở
    // alphabet/page.tsx — xem PROJECT_STATUS.md mục 3.2, vẫn đang là điểm mở).
    playSound("wrong");
    finalizeCurrent(inputValue, false);
  }

  function handleJumpTo(idx: number) {
    if (!allowJump || idx === currentIndex) return;
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    setFeedback(null);
    setHintOptions(null);
    setInputValue(finalizedMap[idx] ? finalizedMap[idx].userAnswer : "");
    setCurrentIndex(idx);
  }

  function handleShowHint() {
    if (!currentWord || isCurrentFinalized) return;
    setHintOptions(buildHintOptions(currentWord, gameWords, answerField));
  }

  function handlePickHint(value: string) {
    if (feedback || isCurrentFinalized) return;
    setInputValue(value);
  }

  function handleEndEarly() {
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    setFeedback(null);
    setPhase("result");
  }

  function handlePlaySame() {
    startGame(gameWords);
  }

  function handlePlayNew() {
    setPrepareResult(null);
    setSetupError(null);
    setPhase("setup");
  }

  const resultStats = useMemo(() => {
    const entries = Object.values(finalizedMap);
    const correct = entries.filter((e) => e.isCorrect).length;
    return { total: entries.length, correct, wrong: entries.length - correct };
  }, [finalizedMap]);

  // Thuần hiển thị: % đúng + màu tương ứng cho vòng tròn điểm số ở màn Result.
  // Ngưỡng màu giống hệt quy ước đã dùng ở practice-sessions/page.tsx (Module 1).
  const resultPercent = resultStats.total > 0 ? Math.round((resultStats.correct / resultStats.total) * 100) : 0;
  const resultColorClass =
    resultPercent >= 80 ? "text-success" : resultPercent >= 50 ? "text-secondary" : "text-danger";
  const resultRingClass =
    resultPercent >= 80 ? "border-success" : resultPercent >= 50 ? "border-secondary" : "border-danger";

  const progressDone = Object.keys(finalizedMap).length;
  const progressPercent = gameWords.length > 0 ? (progressDone / gameWords.length) * 100 : 0;

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
          {/* ===== Hero — điểm nhấn: watermark kanji, giống phong cách topics/page.tsx ===== */}
          <div className="relative mb-8 overflow-hidden rounded-2xl border border-border bg-background px-6 py-8 shadow-sm sm:px-8">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -right-4 -top-6 select-none text-[9rem] font-black leading-none text-primary/[0.06] sm:text-[11rem]"
            >
              答
            </span>
            <div className="relative">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">
                Module 3
              </p>
              <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-foreground">
                Luyện tập điền đáp án
              </h1>
              <p className="mt-1 text-sm text-foreground/50">
                Chọn chủ đề, chọn chiều câu hỏi và bắt đầu luyện gõ đáp án.
              </p>
            </div>
          </div>

          {/* ===== Chọn chủ đề ===== */}
          <div className="mb-5 rounded-2xl border border-border bg-background p-5 shadow-sm">
            <h2 className="mb-3 font-bold text-foreground">Chọn chủ đề</h2>
            {loadingTopics && <p className="text-sm text-foreground/50">Đang tải danh sách chủ đề...</p>}
            {topicsError && <p className="text-sm text-danger">{topicsError}</p>}
            {!loadingTopics && !topicsError && (
              <div className="flex flex-wrap gap-2">
                {allTopics.map((t) => {
                  const selected = selectedTopicIds.has(t.id);
                  return (
                    <button
                      key={t.id}
                      onClick={() => toggleTopic(t.id)}
                      className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
                        selected
                          ? "border-primary bg-primary text-white shadow-sm"
                          : "border-border bg-background text-foreground/70 hover:border-primary/40 hover:text-primary"
                      }`}
                    >
                      {t.name}
                    </button>
                  );
                })}
                {allTopics.length === 0 && (
                  <p className="text-sm text-foreground/50">Chưa có chủ đề nào.</p>
                )}
              </div>
            )}
          </div>

          {/* ===== Chiều câu hỏi / câu trả lời ===== */}
          <div className="mb-5 grid grid-cols-2 gap-4 rounded-2xl border border-border bg-background p-5 shadow-sm">
            <div>
              <label className="mb-1 block text-xs font-semibold text-foreground/60">
                Câu hỏi (hiện ra)
              </label>
              <select
                value={questionField}
                onChange={(e) => setQuestionField(e.target.value as PracticeField)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                {ALL_FIELDS.map((f) => (
                  <option key={f} value={f}>{FIELD_LABELS[f]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-foreground/60">
                Câu trả lời (gõ đáp án)
              </label>
              <select
                value={answerField}
                onChange={(e) => setAnswerField(e.target.value as PracticeField)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                {ALL_FIELDS.map((f) => (
                  <option key={f} value={f}>{FIELD_LABELS[f]}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ===== Nguồn từ vựng ===== */}
          <div className="mb-5 rounded-2xl border border-border bg-background p-5 shadow-sm">
            <h2 className="mb-3 font-bold text-foreground">Nguồn từ vựng</h2>
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="radio"
                  checked={sourceType === "All"}
                  onChange={() => setSourceType("All")}
                  className="accent-primary"
                />
                Toàn bộ từ trong các chủ đề đã chọn
              </label>
              <label className="flex flex-wrap items-center gap-2 text-sm text-foreground">
                <input
                  type="radio"
                  checked={sourceType === "PercentRecent"}
                  onChange={() => setSourceType("PercentRecent")}
                  className="accent-primary"
                />
                <span>Lấy</span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={percent}
                  disabled={sourceType !== "PercentRecent"}
                  onChange={(e) => setPercent(Number(e.target.value))}
                  className="w-20 rounded-lg border border-border bg-background px-2 py-1 text-sm outline-none focus:border-primary disabled:opacity-40"
                />
                <span>% từ sửa gần nhất</span>
              </label>
              <label className="flex flex-wrap items-center gap-2 text-sm text-foreground">
                <input
                  type="radio"
                  checked={sourceType === "CountRecent"}
                  onChange={() => setSourceType("CountRecent")}
                  className="accent-primary"
                />
                <span>Lấy</span>
                <input
                  type="number"
                  min={1}
                  value={count}
                  disabled={sourceType !== "CountRecent"}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="w-20 rounded-lg border border-border bg-background px-2 py-1 text-sm outline-none focus:border-primary disabled:opacity-40"
                />
                <span>từ sửa gần nhất</span>
              </label>
            </div>
          </div>

          {/* ===== Thời gian / số lần sai ===== */}
          <div className="mb-5 grid grid-cols-2 gap-4 rounded-2xl border border-border bg-background p-5 shadow-sm">
            <div>
              <label className="mb-1 block text-xs font-semibold text-foreground/60">
                Thời gian mỗi câu (giây, 0 = vô hạn, tối thiểu 3 nếu &gt; 0)
              </label>
              <input
                type="number"
                min={0}
                value={timePerQuestionSec}
                onChange={(e) => setTimePerQuestionSec(Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-foreground/60">
                Cho phép sai tối đa (mỗi câu)
              </label>
              <input
                type="number"
                min={1}
                value={maxMistakes}
                onChange={(e) => setMaxMistakes(Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {setupError && (
            <p className="mb-4 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
              {setupError}
            </p>
          )}

          {/* ===== CTA — điểm nhấn: nút gradient full-width ===== */}
          <button
            onClick={handlePrepare}
            disabled={isPreparing}
            className="w-full rounded-xl bg-gradient-to-r from-primary to-secondary px-6 py-3.5 text-base font-bold text-white shadow-sm transition hover:shadow-lg disabled:opacity-50"
          >
            {isPreparing ? "Đang chuẩn bị..." : "Bắt đầu luyện tập"}
          </button>
        </div>
      </div>
    );
  }

  // ============================= PHASE: CONFIRM PARTIAL =============================
  if (phase === "confirmPartial" && prepareResult) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-6">
        <div className="w-full max-w-md rounded-2xl border border-warning bg-background p-6 text-center shadow-sm">
          <p className="mb-6 text-sm text-foreground">
            Chỉ có{" "}
            <strong className="text-warning">{prepareResult.totalEligible}</strong>/
            {prepareResult.totalConsidered} từ đủ điều kiện (đủ cả trường câu hỏi lẫn câu
            trả lời). Bạn có muốn luyện tập với số từ đó không?
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => startGame(prepareResult.words)}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-primary-hover"
            >
              Luyện tập với {prepareResult.totalEligible} từ
            </button>
            <button
              onClick={() => setPhase("setup")}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground/70 transition hover:text-foreground"
            >
              Chọn lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================= PHASE: PLAYING =============================
  if (phase === "playing" && currentWord) {
    return (
      <div className="min-h-screen bg-surface">
        <div className="mx-auto max-w-2xl px-6 py-8">
          {/* ===== Thanh trạng thái + progress bar + nút Kết thúc dạng pill ===== */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-foreground/60">
              Đã chốt <strong className="text-foreground">{progressDone}</strong>/{gameWords.length} — Sai{" "}
              <strong className="text-foreground">{currentMistakes}</strong>/{maxMistakes}
            </span>
            <div className="flex items-center gap-2">
              {timePerQuestionSec > 0 && (
                <span
                  className={`rounded-full px-2.5 py-0.5 text-sm font-bold ${
                    timeLeft <= 5 ? "bg-danger/10 text-danger" : "bg-primary/10 text-primary"
                  }`}
                >
                  {timeLeft}s
                </span>
              )}
              <button
                onClick={handleEndEarly}
                className="flex items-center gap-1 rounded-full border border-danger/30 bg-danger/5 px-3 py-1 text-xs font-bold text-danger transition hover:bg-danger/10"
              >
                <span aria-hidden="true">⏹</span> Kết thúc
              </button>
            </div>
          </div>
          <div className="mb-5 h-2 w-full overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* ===== Grid nhảy cóc câu ===== */}
          {allowJump && (
            <div className="mb-5 flex flex-wrap gap-1.5">
              {gameWords.map((_, idx) => {
                const done = finalizedMap[idx];
                let cls = "border border-border bg-background text-foreground/50";
                if (idx === currentIndex) cls = "bg-primary text-white shadow-sm";
                else if (done)
                  cls = done.isCorrect
                    ? "bg-success/15 text-success"
                    : "bg-danger/15 text-danger";
                return (
                  <button
                    key={idx}
                    onClick={() => handleJumpTo(idx)}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition ${cls}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          )}

          {/* ===== Khối câu hỏi — điểm nhấn chính: nền gradient ĐẶC, chữ trắng ===== */}
          <div className="mb-4 overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-secondary px-6 py-10 text-center shadow-md">
            <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
              {FIELD_LABELS[questionField]}
            </span>
            <div
              className="mt-4 break-words text-5xl font-extrabold text-white"
              style={jpFontStyle(getFieldValue(currentWord, questionField))}
            >
              {getFieldValue(currentWord, questionField)}
            </div>
            <p className="mt-4 text-sm text-white/80">
              Điền: <strong className="text-white">{FIELD_LABELS[answerField]}</strong>
              {answerField === "Meaning" && " (chỉ cần đúng 1 trong các nghĩa)"}
            </p>
          </div>

          {/* ===== Feedback ===== */}
          <div className="mb-4 h-6 text-center">
            {feedback && (
              <span
                className={`text-sm font-bold ${feedback.isCorrect ? "text-success" : "text-danger"}`}
              >
                {feedback.isCorrect
                  ? "Chính xác!"
                  : currentMistakes + 1 < maxMistakes
                  ? "Sai rồi, thử lại!"
                  : `Sai rồi! Đáp án đúng: ${feedback.correctDisplay}`}
              </span>
            )}
          </div>

          {/* ===== Ô nhập + nút hành động — Kiểm tra là nút chính (to hơn), Gợi ý là phụ (secondary) ===== */}
          <div className="mb-4 flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmitAnswer();
              }}
              disabled={!!feedback || isCurrentFinalized}
              placeholder={isCurrentFinalized ? "Câu này đã hoàn thành" : "Nhập đáp án..."}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-surface"
            />
            <button
              onClick={handleSubmitAnswer}
              disabled={!!feedback || isCurrentFinalized}
              className="flex-[2] rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-primary-hover disabled:opacity-50 sm:flex-none"
            >
              Kiểm tra
            </button>
            <button
              onClick={handleShowHint}
              disabled={isCurrentFinalized}
              className="flex items-center gap-1 rounded-lg border border-secondary/40 bg-secondary/5 px-4 py-2.5 text-sm font-semibold text-secondary transition hover:bg-secondary/10 disabled:opacity-50"
            >
              <span aria-hidden="true">💡</span> Gợi ý
            </button>
          </div>

          {hintOptions && hintOptions.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {hintOptions.map((opt, i) => (
                <button
                  key={`${opt}-${i}`}
                  onClick={() => handlePickHint(opt)}
                  style={jpFontStyle(opt)}
                  className="rounded-lg border border-border bg-background py-2 text-sm font-medium text-foreground transition hover:border-secondary hover:bg-secondary/5"
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================= PHASE: RESULT =============================
  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-xl px-6 py-10 text-center">
        <h1 className="mb-6 text-2xl font-extrabold tracking-tight text-foreground">Kết quả</h1>

        {/* ===== Vòng tròn điểm số — điểm nhấn chính: to hơn, viền dày, có nhãn phụ ===== */}
        <div
          className={`mx-auto mb-3 flex h-40 w-40 flex-col items-center justify-center rounded-full border-[6px] bg-background shadow-lg ${resultRingClass}`}
        >
          <span className={`text-4xl font-extrabold ${resultColorClass}`}>
            {resultStats.correct}/{resultStats.total}
          </span>
          <span className="mt-1 text-xs font-bold uppercase tracking-wide text-foreground/40">
            Đúng / Tổng
          </span>
        </div>
        <p className={`mb-8 text-sm font-bold ${resultColorClass}`}>
          {resultPercent}% chính xác
        </p>

        {/* ===== Danh sách review từng câu — 2 cột: câu hỏi (trái) / đáp án (phải) ===== */}
        <div className="mb-6 max-h-96 overflow-y-auto text-left">
          {gameWords.map((w, idx) => {
            const done = finalizedMap[idx];
            if (!done) return null;
            return (
              <div
                key={w.id}
                className={`mb-2 flex items-center gap-3 rounded-xl border px-4 py-3 ${
                  done.isCorrect ? "border-success/30 bg-success/5" : "border-danger/30 bg-danger/5"
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    done.isCorrect ? "bg-success/15 text-success" : "bg-danger/15 text-danger"
                  }`}
                >
                  {done.isCorrect ? "✓" : "✗"}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-xs text-foreground/45">
                    {FIELD_LABELS[questionField]} → {FIELD_LABELS[answerField]}
                  </p>
                  <p
                    className="mt-0.5 truncate font-bold text-foreground"
                    style={jpFontStyle(getFieldValue(w, questionField))}
                  >
                    {getFieldValue(w, questionField)}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p
                    className={`text-sm font-bold ${done.isCorrect ? "text-success" : "text-danger"}`}
                    style={jpFontStyle(done.userAnswer)}
                  >
                    {done.userAnswer || "(bỏ trống)"}
                  </p>
                  {!done.isCorrect && (
                    <p
                      className="mt-0.5 text-xs text-foreground/50"
                      style={jpFontStyle(getFieldValue(w, answerField))}
                    >
                      Đúng: {getFieldValue(w, answerField)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-center gap-3">
          <button
            onClick={handlePlaySame}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-primary-hover"
          >
            Chơi lại ván này
          </button>
          <button
            onClick={handlePlayNew}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground/70 transition hover:text-foreground"
          >
            Chơi ván mới
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VocabularyPracticePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-surface">
          <p className="text-sm text-foreground/50">Đang tải...</p>
        </div>
      }
    >
      <PracticePageInner />
    </Suspense>
  );
}