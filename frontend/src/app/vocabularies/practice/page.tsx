"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Trùng logic với alphabet/page.tsx — chưa tách ra file dùng chung, xem ghi chú cuối câu trả lời.
function playSound(name: "correct" | "wrong" | "finish") {
  try {
    const audio = new Audio(`/sounds/${name}.mp3`);
    void audio.play().catch(() => {});
  } catch {
    // môi trường không hỗ trợ Audio (VD SSR) — bỏ qua
  }
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

export default function VocabularyPracticePage() {
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

  if (isLoading) return <p className="p-6">Đang tải...</p>;
  if (!user) {
    return (
      <p className="p-6">
        Bạn chưa đăng nhập. <Link href="/login" className="text-blue-600 underline">Đăng nhập</Link>
      </p>
    );
  }

  // ============================= PHASE: SETUP =============================
  if (phase === "setup") {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Luyện tập điền đáp án</h1>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Chọn chủ đề</label>
          {loadingTopics && <p>Đang tải danh sách chủ đề...</p>}
          {topicsError && <p className="text-red-600">{topicsError}</p>}
          {!loadingTopics && !topicsError && (
            <div className="flex flex-wrap gap-2">
              {allTopics.map((t) => (
                <button
                  key={t.id}
                  onClick={() => toggleTopic(t.id)}
                  className={`border rounded px-3 py-1 text-sm ${
                    selectedTopicIds.has(t.id) ? "bg-blue-500 text-white" : "bg-white"
                  }`}
                >
                  {t.name}
                </button>
              ))}
              {allTopics.length === 0 && <p className="text-sm text-gray-500">Chưa có chủ đề nào.</p>}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Câu hỏi (hiện ra)</label>
            <select
              value={questionField}
              onChange={(e) => setQuestionField(e.target.value as PracticeField)}
              className="border rounded px-3 py-2 w-full"
            >
              {ALL_FIELDS.map((f) => (
                <option key={f} value={f}>{FIELD_LABELS[f]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Câu trả lời (gõ đáp án)</label>
            <select
              value={answerField}
              onChange={(e) => setAnswerField(e.target.value as PracticeField)}
              className="border rounded px-3 py-2 w-full"
            >
              {ALL_FIELDS.map((f) => (
                <option key={f} value={f}>{FIELD_LABELS[f]}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Nguồn từ vựng</label>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2">
              <input type="radio" checked={sourceType === "All"} onChange={() => setSourceType("All")} />
              Toàn bộ từ trong các chủ đề đã chọn
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={sourceType === "PercentRecent"}
                onChange={() => setSourceType("PercentRecent")}
              />
              <span>Lấy</span>
              <input
                type="number"
                min={1}
                max={100}
                value={percent}
                disabled={sourceType !== "PercentRecent"}
                onChange={(e) => setPercent(Number(e.target.value))}
                className="border rounded px-2 py-1 w-20"
              />
              <span>% từ sửa gần nhất</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={sourceType === "CountRecent"}
                onChange={() => setSourceType("CountRecent")}
              />
              <span>Lấy</span>
              <input
                type="number"
                min={1}
                value={count}
                disabled={sourceType !== "CountRecent"}
                onChange={(e) => setCount(Number(e.target.value))}
                className="border rounded px-2 py-1 w-20"
              />
              <span>từ sửa gần nhất</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Thời gian mỗi câu (giây, 0 = vô hạn, tối thiểu 3 nếu &gt; 0)</label>
            <input
              type="number"
              min={0}
              value={timePerQuestionSec}
              onChange={(e) => setTimePerQuestionSec(Number(e.target.value))}
              className="border rounded px-3 py-2 w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Cho phép sai tối đa (mỗi câu)</label>
            <input
              type="number"
              min={1}
              value={maxMistakes}
              onChange={(e) => setMaxMistakes(Number(e.target.value))}
              className="border rounded px-3 py-2 w-full"
            />
          </div>
        </div>

        {setupError && <p className="text-red-600 mb-3">{setupError}</p>}

        <button
          onClick={handlePrepare}
          disabled={isPreparing}
          className="bg-blue-600 text-white px-6 py-2 rounded font-medium disabled:opacity-50"
        >
          {isPreparing ? "Đang chuẩn bị..." : "Bắt đầu"}
        </button>
      </div>
    );
  }

  // ============================= PHASE: CONFIRM PARTIAL =============================
  if (phase === "confirmPartial" && prepareResult) {
    return (
      <div className="max-w-md mx-auto p-6 text-center">
        <p className="mb-6">
          Chỉ có <strong>{prepareResult.totalEligible}</strong>/{prepareResult.totalConsidered} từ đủ điều kiện
          (đủ cả trường câu hỏi lẫn câu trả lời). Bạn có muốn luyện tập với số từ đó không?
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => startGame(prepareResult.words)}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Luyện tập với {prepareResult.totalEligible} từ
          </button>
          <button onClick={() => setPhase("setup")} className="bg-gray-200 px-4 py-2 rounded">
            Chọn lại
          </button>
        </div>
      </div>
    );
  }

  // ============================= PHASE: PLAYING =============================
  if (phase === "playing" && currentWord) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
          <span className="text-sm text-gray-600">
            Đã chốt {Object.keys(finalizedMap).length}/{gameWords.length} — Sai {currentMistakes}/{maxMistakes}
          </span>
          {timePerQuestionSec > 0 && <span className="text-sm font-medium">{timeLeft}s</span>}
          <button onClick={handleEndEarly} className="text-red-600 text-sm">
            Kết thúc
          </button>
        </div>

        {allowJump && (
          <div className="flex flex-wrap gap-1 mb-4">
            {gameWords.map((_, idx) => {
              const done = finalizedMap[idx];
              let cls = "bg-gray-100";
              if (idx === currentIndex) cls = "bg-blue-500 text-white";
              else if (done) cls = done.isCorrect ? "bg-green-200" : "bg-red-200";
              return (
                <button
                  key={idx}
                  onClick={() => handleJumpTo(idx)}
                  className={`w-8 h-8 text-xs rounded ${cls}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        )}

        <div className="text-center text-4xl font-bold mb-2 break-words">
          {getFieldValue(currentWord, questionField)}
        </div>
        <p className="text-center text-sm text-gray-500 mb-6">
          Điền: {FIELD_LABELS[answerField]}
          {answerField === "Meaning" && " (chỉ cần đúng 1 trong các nghĩa)"}
        </p>

        <div className="text-center h-6 mb-4">
          {feedback && (
            <span className={feedback.isCorrect ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
              {feedback.isCorrect
                ? "Chính xác!"
                : currentMistakes + 1 < maxMistakes
                ? "Sai rồi, thử lại!"
                : `Sai rồi! Đáp án đúng: ${feedback.correctDisplay}`}
            </span>
          )}
        </div>

        <div className="flex gap-2 mb-4">
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
            className="border rounded px-3 py-2 flex-1 disabled:bg-gray-100"
          />
          <button
            onClick={handleSubmitAnswer}
            disabled={!!feedback || isCurrentFinalized}
            className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            Kiểm tra
          </button>
          <button
            onClick={handleShowHint}
            disabled={isCurrentFinalized}
            className="bg-gray-200 px-4 py-2 rounded disabled:opacity-50"
          >
            Gợi ý
          </button>
        </div>

        {hintOptions && hintOptions.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            {hintOptions.map((opt, i) => (
              <button
                key={`${opt}-${i}`}
                onClick={() => handlePickHint(opt)}
                className="border rounded py-2 text-sm hover:bg-blue-50"
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ============================= PHASE: RESULT =============================
  return (
    <div className="max-w-xl mx-auto p-6 text-center">
      <h1 className="text-2xl font-bold mb-4">Kết quả</h1>
      <p className="text-4xl font-bold mb-6">
        {resultStats.correct}/{resultStats.total}
      </p>

      <div className="text-left mb-6 max-h-96 overflow-y-auto">
        {gameWords.map((w, idx) => {
          const done = finalizedMap[idx];
          if (!done) return null;
          return (
            <div
              key={w.id}
              className={`border rounded px-3 py-2 mb-2 ${done.isCorrect ? "border-green-300" : "border-red-300"}`}
            >
              <div className="text-sm text-gray-500">
                {getFieldValue(w, questionField)} → {FIELD_LABELS[answerField]}
              </div>
              <div className="text-sm">
                Bạn trả lời: <strong>{done.userAnswer || "(bỏ trống)"}</strong>{" "}
                {done.isCorrect ? "✅" : `❌ (đúng: ${getFieldValue(w, answerField)})`}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-3 justify-center">
        <button onClick={handlePlaySame} className="bg-blue-600 text-white px-4 py-2 rounded">
          Chơi lại ván này
        </button>
        <button onClick={handlePlayNew} className="bg-gray-200 px-4 py-2 rounded">
          Chơi ván mới
        </button>
      </div>
    </div>
  );
}