"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { CharacterDto, CharacterType, VariantGroup } from "@/types/character";
import { Direction, SubmitAnswerDto, PracticeSessionResultDto } from "@/types/practiceSession";
import { getCharacters } from "@/lib/characterApi";
import { submitPracticeSession } from "@/lib/practiceSessionApi";
import { getApiErrorMessage } from "@/lib/apiError";

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

// Phát 1 file mp3 trong public/sounds/ — không await, lỗi (VD trình duyệt chặn
// autoplay lúc chưa có tương tác) chỉ log ngầm, không làm hỏng luồng chơi.
function playSound(name: "correct" | "wrong" | "finish") {
  try {
    const audio = new Audio(`/sounds/${name}.mp3`);
    void audio.play().catch(() => {});
  } catch {
    // môi trường không hỗ trợ Audio (VD SSR) — bỏ qua
  }
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
        <h1 className="text-2xl font-bold mb-4">Luyện tập Bảng chữ cái</h1>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Hướng chơi</label>
          <select
            value={direction}
            onChange={(e) => handleDirectionChange(e.target.value as Direction)}
            className="border rounded px-3 py-2"
          >
            {Object.entries(DIRECTION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 mb-3">
          <button
            onClick={() => selectGroup((v) => v === "Base")}
            className="bg-gray-200 px-3 py-1 rounded text-sm"
          >
            Chọn chữ thường
          </button>
          <button
            onClick={() => selectGroup((v) => v !== "Base")}
            className="bg-gray-200 px-3 py-1 rounded text-sm"
          >
            Chọn tất cả biến âm
          </button>
          <button
            onClick={() => selectGroup(() => true)}
            className="bg-gray-200 px-3 py-1 rounded text-sm"
          >
            Chọn toàn bộ
          </button>
          <button
            onClick={() => setSelectedCharIds(new Set())}
            className="bg-gray-200 px-3 py-1 rounded text-sm"
          >
            Bỏ chọn hết
          </button>
        </div>

        {loadingChars && <p>Đang tải bảng chữ cái...</p>}
        {charError && <p className="text-red-600">{charError}</p>}

        {!loadingChars && !charError && (
          <div className="grid grid-cols-6 gap-2 mb-4">
            {allCharacters.map((c) => (
              <button
                key={c.id}
                onClick={() => toggleChar(c.id)}
                className={`border rounded py-2 text-center ${
                  selectedCharIds.has(c.id) ? "bg-blue-500 text-white" : "bg-white"
                }`}
              >
                <div className="text-lg">{c.char}</div>
                <div className="text-xs">{c.romaji}</div>
              </button>
            ))}
          </div>
        )}

        <p className="text-sm text-gray-600 mb-4">Đã chọn {selectedCharIds.size} chữ</p>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Thời gian mỗi câu (giây, 0 = vô hạn)</label>
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
          onClick={handleStartQuiz}
          className="bg-blue-600 text-white px-6 py-2 rounded font-medium"
        >
          Bắt đầu
        </button>
      </div>
    );
  }

  // ============================= PHASE: PLAYING =============================
  if (phase === "playing") {
    const currentQuestion = questions[currentIndex];
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm text-gray-600">
            Câu {currentIndex + 1}/{questions.length} — Sai {questionMistakes}/{maxMistakes}
          </span>
          {timePerQuestionSec > 0 && (
            <span className="text-sm font-medium">{timeLeft}s</span>
          )}
          <button onClick={handleEndEarly} className="text-red-600 text-sm">
            Kết thúc
          </button>
        </div>

        <div className="text-center text-6xl font-bold mb-2">
          {getQuestionText(currentQuestion, direction)}
        </div>

        {/* Feedback đúng/sai ngay sau khi bấm, trước khi chuyển bước tiếp theo */}
        <div className="text-center h-6 mb-6">
          {feedback && (
            <span className={feedback.isCorrect ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
              {feedback.isCorrect
                ? "Chính xác!"
                : questionMistakes + 1 < maxMistakes
                ? "Sai rồi, thử lại!"
                : "Sai rồi!"}
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {currentOptions.map((c) => {
            const isSelected = feedback?.selectedId === c.id;
            const isCorrectAnswer = c.id === currentQuestion.id;
            // Trong lúc hiện feedback: tô xanh đáp án đúng, tô đỏ đáp án vừa chọn sai
            let extraClass = "hover:bg-blue-50";
            if (feedback) {
              if (isCorrectAnswer && feedback.isCorrect) extraClass = "bg-green-500 text-white";
              else if (isSelected && !feedback.isCorrect) extraClass = "bg-red-500 text-white";
            }
            return (
              <button
                key={c.id}
                onClick={() => handleSelectOption(c.id)}
                disabled={isSubmitting || feedback !== null}
                className={`border rounded py-3 text-lg disabled:opacity-90 ${extraClass}`}
              >
                {getOptionText(c, direction)}
              </button>
            );
          })}
        </div>

        {isSubmitting && <p className="text-center mt-4 text-gray-500">Đang nộp bài...</p>}
        {submitError && <p className="text-center mt-4 text-red-600">{submitError}</p>}
      </div>
    );
  }

  // ============================= PHASE: RESULT =============================
  return (
    <div className="max-w-xl mx-auto p-6 text-center">
      <h1 className="text-2xl font-bold mb-4">Kết quả</h1>
      {result && (
        <p className="text-4xl font-bold mb-6">
          {result.score}/{result.totalQuestions}
        </p>
      )}
      <div className="flex gap-3 justify-center">
        <button onClick={handlePlaySame} className="bg-blue-600 text-white px-4 py-2 rounded">
          Chơi lại ván này
        </button>
        <button onClick={handlePlayNew} className="bg-gray-200 px-4 py-2 rounded">
          Chơi ván mới
        </button>
      </div>
      <div className="flex gap-4 justify-center mt-4 text-sm">
        {result && (
          <Link href={`/practice-sessions/${result.id}`} className="text-blue-600 underline">
            Review bài làm
          </Link>
        )}
        <Link href="/practice-sessions" className="text-blue-600 underline">
          Lịch sử luyện tập
        </Link>
        <Link href="/practice-sessions/stats" className="text-blue-600 underline">
          Thống kê tỉ lệ sai
        </Link>
      </div>
    </div>
  );
}