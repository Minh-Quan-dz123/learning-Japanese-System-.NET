"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { TopicDto } from "@/types/topic";
import { VocabularyDto, CreateVocabularyRequest } from "@/types/vocabulary";
import { getTopics } from "@/lib/topicApi";
import {
  getVocabulariesByTopic,
  getAllVocabulariesByTopic,
  checkDuplicate,
  createVocabulary,
  updateVocabulary,
  deleteVocabulary,
} from "@/lib/vocabularyApi";
import { getApiErrorMessage, getApiErrorDetails } from "@/lib/apiError";
import { splitMeanings } from "@/lib/meaningParser";
import {
  parseTextRows,
  parseExcelFile,
  isRowValid,
  exportVocabulariesToExcel,
  RawVocabRow,
} from "@/lib/excelVocabulary";

const emptyForm: CreateVocabularyRequest = {
  topicId: "",
  hiragana: "",
  katakana: "",
  kanji: "",
  romaji: "",
  meaning: "",
  note: "",
};

// Cùng bộ màu luân phiên đã dùng ở topics/page.tsx — dùng cho avatar tròn mỗi dòng từ vựng,
// để 2 trang trong cùng module nhìn nhất quán.
const ACCENT_BADGE_BG = ["bg-primary/10", "bg-secondary/10", "bg-success/10"];
const ACCENT_BADGE_TEXT = ["text-primary", "text-secondary", "text-success"];
function accentIndex(index: number) {
  return index % ACCENT_BADGE_BG.length;
}

// Các kiểu sắp xếp cho danh sách từ vựng — CHỈ áp dụng ở Frontend (client-side),
// không gọi lại API, không ảnh hưởng thứ tự lưu trong state `words` gốc.
// Mặc định "updatedDesc" khớp với thứ tự Backend đã trả sẵn (sửa gần nhất lên đầu),
// nên lúc mới load trang không cần sort lại gì cả.
type SortOption = "updatedDesc" | "updatedAsc" | "romajiAsc" | "romajiDesc";

const SORT_LABELS: Record<SortOption, string> = {
  updatedDesc: "Sửa gần đây nhất",
  updatedAsc: "Sửa lâu nhất",
  romajiAsc: "Romaji A → Z",
  romajiDesc: "Romaji Z → A",
};

// Dò xem có từ nào trong `words` (đã tải sẵn của chủ đề đang xem) bị trùng ROMAJI
// nhưng NGHĨA lại khác hẳn không. Đây CHỈ là cảnh báo phụ ở Frontend, không chặn tạo,
// KHÔNG thay đổi logic check-duplicate chính ở Backend (romaji giống + có nghĩa chung
// mới coi là "trùng thật"). Lý do đầy đủ xem DECISIONS_LOG.md mục 2026-08-28.
function findRomajiMismatch(
  romaji: string,
  meaning: string,
  words: VocabularyDto[]
): VocabularyDto | null {
  const targetRomaji = romaji.trim().toLowerCase();
  const targetMeanings = splitMeanings(meaning).map((m) => m.toLowerCase());

  for (const w of words) {
    if (w.romaji.trim().toLowerCase() !== targetRomaji) continue;
    const existingMeanings = splitMeanings(w.meaning).map((m) => m.toLowerCase());
    const hasOverlap = existingMeanings.some((m) => targetMeanings.includes(m));
    if (!hasOverlap) {
      // romaji giống nhưng không nghĩa nào chung -> có thể gõ nhầm romaji, đáng cảnh báo
      return w;
    }
  }
  return null;
}

// Input dùng chung cho form thêm/sửa từ — có label nhỏ phía trên thay vì chỉ placeholder.
function FieldInput({
  label,
  required,
  error,
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-semibold text-foreground/60">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      <input
        {...props}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

export default function TopicDetailPage() {
  const { id: topicId } = useParams<{ id: string }>();
  const { user, isLoading } = useAuth();

  const [topic, setTopic] = useState<TopicDto | null>(null);
  // Danh sách TOÀN BỘ chủ đề của user — dùng để hiện dropdown "chuyển tới đâu"
  const [allTopics, setAllTopics] = useState<TopicDto[]>([]);
  const [words, setWords] = useState<VocabularyDto[]>([]);
  const [loadingWords, setLoadingWords] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Tiêu chí sắp xếp danh sách đang hiển thị — thuần UI, không đụng state `words` gốc.
  const [sortOption, setSortOption] = useState<SortOption>("updatedDesc");

  const [form, setForm] = useState<CreateVocabularyRequest>({ ...emptyForm, topicId });
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Đóng/mở khung "Thêm từ mới" — mặc định MỞ (giữ đúng hành vi hiện tại lúc mới vào trang)
  const [showAddForm, setShowAddForm] = useState(true);

  const [duplicatePrompt, setDuplicatePrompt] = useState<{ existingId: string; existingSummary: string } | null>(null);

  // Cảnh báo phụ (không chặn): romaji trùng 1 từ đã có nhưng nghĩa khác hẳn.
  // Lưu sẵn `pendingRequest` để bấm "Vẫn tạo" là gọi API luôn, không cần gõ lại form.
  const [romajiWarning, setRomajiWarning] = useState<{
    matchedWord: VocabularyDto;
    pendingRequest: CreateVocabularyRequest;
  } | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CreateVocabularyRequest>({ ...emptyForm, topicId });
  const [editError, setEditError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  // --- State cho tính năng di chuyển nhiều từ cùng lúc ---
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [moveTargetTopicId, setMoveTargetTopicId] = useState<string>("");
  const [isMoving, setIsMoving] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);

  // --- State: Export Excel ---
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // --- State: Import Excel ---
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState("");
  const [isProcessingImport, setIsProcessingImport] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [importSummary, setImportSummary] = useState<{
    total: number;
    success: number;
    overwritten: number;
    skippedDuplicate: number;
    skippedRomajiWarning: number;
    invalid: number;
  } | null>(null);
  // Hiện thông tin dòng đang trùng để hỏi user "đè lên/giữ nguyên" — dùng chung
  // cơ chế Promise + resolver để "tạm dừng" vòng lặp xử lý cho tới khi user bấm nút.
  const [importDuplicateSummary, setImportDuplicateSummary] = useState<string | null>(null);
  const duplicateResolverRef = useRef<((action: "overwrite" | "skip") => void) | null>(null);

  // Cảnh báo phụ khi import (romaji trùng, nghĩa khác) — dùng resolver RIÊNG,
  // tách biệt với resolver của "trùng thật" ở trên vì đây là 2 loại quyết định khác nhau.
  const [importRomajiWarningSummary, setImportRomajiWarningSummary] = useState<string | null>(null);
  const romajiWarningResolverRef = useRef<((action: "create" | "skip") => void) | null>(null);

  // Tên file Excel vừa chọn — CHỈ để hiển thị trên nút bấm (thuần UI), không ảnh hưởng logic import.
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading || !user) return;
    loadTopics();
    loadWords();
  }, [isLoading, user, topicId]);

  async function loadTopics() {
    try {
      const topics = await getTopics();
      setAllTopics(topics);
      setTopic(topics.find((t) => t.id === topicId) ?? null);
    } catch {
      // không chặn trang nếu lấy danh sách chủ đề lỗi — vẫn cho xem danh sách từ
    }
  }

  async function loadWords(searchTerm = search) {
    setLoadingWords(true);
    setLoadError(null);
    try {
      const result = await getVocabulariesByTopic(topicId, searchTerm);
      setWords(result.items);
    } catch (err) {
      setLoadError(getApiErrorMessage(err, "Không tải được danh sách từ vựng"));
    } finally {
      setLoadingWords(false);
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    loadWords(search);
  }

  // Mảng CHỈ dùng để hiển thị — sort lại từ `words` gốc theo `sortOption`,
  // không sửa/ghi đè `words` (tránh làm hỏng các chỗ khác đang dựa vào thứ tự gốc
  // của `words`, ví dụ setWords((prev) => [created, ...prev]) lúc thêm từ mới).
  const sortedWords = useMemo(() => {
    const copy = [...words];
    switch (sortOption) {
      case "updatedDesc":
        return copy.sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      case "updatedAsc":
        return copy.sort(
          (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
        );
      case "romajiAsc":
        return copy.sort((a, b) => a.romaji.localeCompare(b.romaji));
      case "romajiDesc":
        return copy.sort((a, b) => b.romaji.localeCompare(a.romaji));
      default:
        return copy;
    }
  }, [words, sortOption]);

  function updateFormField(field: keyof CreateVocabularyRequest, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // Gom "gọi API tạo + cập nhật state" ra 1 hàm dùng chung — cả nhánh tạo bình thường
  // lẫn nhánh "bấm Vẫn tạo sau khi thấy cảnh báo romaji" đều gọi hàm này, tránh lặp code.
  async function doCreateVocabulary(request: CreateVocabularyRequest) {
    const created = await createVocabulary(request);
    setWords((prev) => [created, ...prev]);
    setForm({ ...emptyForm, topicId });
  }

  async function handleAddWord(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setIsSubmitting(true);
    try {
      const dupResult = await checkDuplicate({ romaji: form.romaji, meaning: form.meaning });
      if (dupResult.exists && dupResult.existing) {
        setDuplicatePrompt({
          existingId: dupResult.existing.id,
          existingSummary: `${dupResult.existing.hiragana ?? ""} (${dupResult.existing.romaji}) — nghĩa trùng: "${dupResult.existing.matchedMeaning}"`,
        });
        setIsSubmitting(false);
        return;
      }

      // Không trùng theo tiêu chí chính (check-duplicate) — nhưng vẫn dò thêm 1 lớp
      // cảnh báo phụ: romaji giống 1 từ đã có trong chủ đề này nhưng nghĩa khác hẳn
      // (dễ là do gõ nhầm romaji). Chỉ nhắc, không chặn.
      const mismatch = findRomajiMismatch(form.romaji, form.meaning, words);
      if (mismatch) {
        setRomajiWarning({ matchedWord: mismatch, pendingRequest: { ...form, topicId } });
        setIsSubmitting(false);
        return;
      }

      await doCreateVocabulary({ ...form, topicId });
    } catch (err) {
      setFormError(getApiErrorMessage(err, "Thêm từ thất bại"));
      const details = getApiErrorDetails(err);
      if (details) {
        const mapped: Record<string, string> = {};
        details.forEach((d) => (mapped[d.field] = d.message));
        setFieldErrors(mapped);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirmRomajiWarning() {
    if (!romajiWarning) return;
    setIsSubmitting(true);
    try {
      await doCreateVocabulary(romajiWarning.pendingRequest);
      setRomajiWarning(null);
    } catch (err) {
      setFormError(getApiErrorMessage(err, "Thêm từ thất bại"));
      setRomajiWarning(null);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCancelRomajiWarning() {
    setRomajiWarning(null);
  }

  async function handleOverwriteDuplicate() {
    if (!duplicatePrompt) return;
    try {
      const updated = await updateVocabulary(duplicatePrompt.existingId, { ...form, topicId });
      setWords((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
      setForm({ ...emptyForm, topicId });
      setDuplicatePrompt(null);
    } catch (err) {
      setFormError(getApiErrorMessage(err, "Ghi đè từ cũ thất bại"));
      setDuplicatePrompt(null);
    }
  }

  function handleKeepOldWord() {
    // Giữ từ cũ = hủy thao tác, không gọi API nào — đúng luồng api_design.md mục 4.2
    setDuplicatePrompt(null);
  }

  function startEdit(word: VocabularyDto) {
    setEditingId(word.id);
    setEditForm({
      topicId: word.topicId,
      hiragana: word.hiragana ?? "",
      katakana: word.katakana ?? "",
      kanji: word.kanji ?? "",
      romaji: word.romaji,
      meaning: word.meaning,
      note: word.note ?? "",
    });
    setEditError(null);
  }

  async function handleSaveEdit(id: string) {
    setEditError(null);
    try {
      const updated = await updateVocabulary(id, editForm);
      setWords((prev) => prev.map((w) => (w.id === id ? updated : w)));
      setEditingId(null);
    } catch (err) {
      setEditError(getApiErrorMessage(err, "Sửa từ thất bại"));
    }
  }

  async function handleConfirmDelete(id: string) {
    try {
      await deleteVocabulary(id);
      setWords((prev) => prev.filter((w) => w.id !== id));
      setDeletingId(null);
    } catch (err) {
      alert(getApiErrorMessage(err, "Xóa từ thất bại"));
      setDeletingId(null);
    }
  }

  // --- Các hàm cho tính năng di chuyển nhiều từ cùng lúc ---

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleMoveSelected() {
    if (selectedIds.size === 0 || !moveTargetTopicId) return;
    setIsMoving(true);
    setMoveError(null);

    const idsToMove = Array.from(selectedIds);
    const movedIds: string[] = [];

    for (const id of idsToMove) {
      const word = words.find((w) => w.id === id);
      if (!word) continue;

      try {
        await updateVocabulary(id, {
          topicId: moveTargetTopicId,
          hiragana: word.hiragana ?? "",
          katakana: word.katakana ?? "",
          kanji: word.kanji ?? "",
          romaji: word.romaji,
          meaning: word.meaning,
          note: word.note ?? "",
        });
        movedIds.push(id);
      } catch (err) {
        setMoveError(
          `Đã chuyển ${movedIds.length}/${idsToMove.length} từ thì gặp lỗi: ` +
            getApiErrorMessage(err, "Di chuyển thất bại")
        );
        break;
      }
    }

    if (movedIds.length > 0) {
      setWords((prev) => prev.filter((w) => !movedIds.includes(w.id)));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        movedIds.forEach((id) => next.delete(id));
        return next;
      });
    }

    if (movedIds.length === idsToMove.length) {
      setMoveTargetTopicId("");
    }

    setIsMoving(false);
  }

  // --- Phát âm ---
  // Ưu tiên Hiragana → Katakana → Kanji (chữ Nhật thật, đọc đúng với lang="ja-JP").
  // KHÔNG đọc Romaji vì đó là chữ Latin, trình duyệt sẽ đọc sai âm tiếng Nhật thật.
  function speakWord(word: VocabularyDto) {
    const text = word.hiragana || word.katakana || word.kanji;
    if (!text) return;
    window.speechSynthesis.cancel(); // dừng câu đang đọc dở (nếu có) trước khi đọc câu mới
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ja-JP";
    window.speechSynthesis.speak(utterance);
  }

  // --- Export Excel ---
  async function handleExport() {
    setIsExporting(true);
    setExportError(null);
    try {
      // Lấy HẾT từ vựng (không chỉ trang đang xem) — tránh thiếu dữ liệu khi >20 từ
      const allWords = await getAllVocabulariesByTopic(topicId);
      exportVocabulariesToExcel(topic?.name ?? "chu-de", allWords);
    } catch (err) {
      setExportError(getApiErrorMessage(err, "Xuất Excel thất bại"));
    } finally {
      setIsExporting(false);
    }
  }

  // --- Import Excel ---

  function waitForDuplicateDecision(): Promise<"overwrite" | "skip"> {
    return new Promise((resolve) => {
      duplicateResolverRef.current = resolve;
    });
  }

  function resolveImportDuplicate(action: "overwrite" | "skip") {
    setImportDuplicateSummary(null);
    duplicateResolverRef.current?.(action);
    duplicateResolverRef.current = null;
  }

  // Cặp hàm tương tự ở trên, nhưng dành riêng cho cảnh báo romaji-khác-nghĩa lúc import.
  function waitForRomajiWarningDecision(): Promise<"create" | "skip"> {
    return new Promise((resolve) => {
      romajiWarningResolverRef.current = resolve;
    });
  }

  function resolveImportRomajiWarning(action: "create" | "skip") {
    setImportRomajiWarningSummary(null);
    romajiWarningResolverRef.current?.(action);
    romajiWarningResolverRef.current = null;
  }

  async function processImportRows(rows: RawVocabRow[]) {
    setIsProcessingImport(true);
    setImportSummary(null);

    let success = 0;
    let overwritten = 0;
    let skippedDuplicate = 0;
    let skippedRomajiWarning = 0;
    let invalid = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      setImportProgress({ current: i + 1, total: rows.length });

      if (!isRowValid(row)) {
        invalid++;
        continue;
      }

      try {
        const dup = await checkDuplicate({ romaji: row.romaji, meaning: row.meaning });

        if (dup.exists && dup.existing) {
          // Tạm dừng vòng lặp, chờ user bấm "Đè lên từ cũ" / "Giữ từ cũ"
          setImportDuplicateSummary(
            `${dup.existing.hiragana ?? ""} (${dup.existing.romaji}) — nghĩa trùng: "${dup.existing.matchedMeaning}"`
          );
          const decision = await waitForDuplicateDecision();

          if (decision === "overwrite") {
            await updateVocabulary(dup.existing.id, {
              topicId,
              hiragana: row.hiragana || null,
              katakana: row.katakana || null,
              kanji: row.kanji || null,
              romaji: row.romaji,
              meaning: row.meaning,
              note: row.note || null,
            });
            overwritten++;
          } else {
            skippedDuplicate++;
          }
        } else {
          // Không trùng thật — nhưng vẫn dò cảnh báo phụ: romaji giống 1 từ đã tải sẵn
          // của chủ đề này nhưng nghĩa khác hẳn (giống hệt nhánh thêm tay ở trên).
          const mismatch = findRomajiMismatch(row.romaji, row.meaning, words);
          if (mismatch) {
            setImportRomajiWarningSummary(
              `${mismatch.hiragana ?? ""} (${mismatch.romaji}) — nghĩa: "${mismatch.meaning}"`
            );
            const decision = await waitForRomajiWarningDecision();
            if (decision === "skip") {
              skippedRomajiWarning++;
              continue; // bỏ qua dòng này, sang dòng tiếp theo
            }
            // decision === "create" -> rơi xuống dưới, tạo bình thường
          }

          await createVocabulary({
            topicId,
            hiragana: row.hiragana || null,
            katakana: row.katakana || null,
            kanji: row.kanji || null,
            romaji: row.romaji,
            meaning: row.meaning,
            note: row.note || null,
          });
          success++;
        }
      } catch {
        // Lỗi bất ngờ từ API (VD mất mạng giữa chừng) — không làm gãy cả luồng,
        // tính dòng này vào nhóm lỗi và tiếp tục các dòng sau (đã chốt với user).
        invalid++;
      }
    }

    setImportProgress(null);
    setImportSummary({ total: rows.length, success, overwritten, skippedDuplicate, skippedRomajiWarning, invalid });
    setIsProcessingImport(false);

    // Tải lại từ server để đảm bảo danh sách hiển thị đúng dữ liệu thật —
    // đơn giản và an toàn hơn tự lắp ráp state tay (dễ sai với trường hợp overwrite).
    await loadWords();
  }

  async function handleImportFromText() {
    const rows = parseTextRows(importText);
    if (rows.length === 0) return;
    await processImportRows(rows);
  }

  async function handleImportFromFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFileName(file.name);
    try {
      const rows = await parseExcelFile(file);
      if (rows.length === 0) return;
      await processImportRows(rows);
    } catch {
      alert("Không đọc được file Excel. Kiểm tra lại định dạng file.");
    } finally {
      e.target.value = ""; // cho phép chọn lại đúng file này lần sau nếu cần
    }
  }

  function closeImportModal() {
    setShowImportModal(false);
    setImportText("");
    setImportSummary(null);
    setImportProgress(null);
    setSelectedFileName(null);
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

  const otherTopics = allTopics.filter((t) => t.id !== topicId);

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-3xl px-6 py-10">
        {/* ===== Nút quay lại — điểm nhấn: icon tròn, hover tô đầy màu primary ===== */}
        <Link
          href="/topics"
          className="group inline-flex items-center gap-2 text-sm font-semibold text-foreground/60 transition hover:text-primary"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-base transition group-hover:border-primary group-hover:bg-primary group-hover:text-white">
            ←
          </span>
          Danh sách chủ đề
        </Link>

        {/* ===== Header ===== */}
        <div className="mt-4 mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            {topic?.name ?? "Chủ đề"}
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground/70 transition hover:border-primary hover:text-primary"
            >
              Import Excel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground/70 transition hover:border-primary hover:text-primary disabled:opacity-50"
            >
              {isExporting ? "Đang xuất..." : "Export Excel"}
            </button>
          </div>
        </div>
        {exportError && <p className="mb-4 text-sm text-danger">{exportError}</p>}

        {/* ===== Banner luyện tập chủ đề này ===== */}
        <Link
          href={`/vocabularies/practice?topicId=${topicId}`}
          className="group mb-8 flex items-center justify-between overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-secondary px-6 py-4 shadow-sm transition hover:shadow-lg"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 text-lg font-bold text-white">
              力
            </span>
            <p className="font-bold text-white">Luyện tập chủ đề này</p>
          </div>
          <span className="text-lg text-white opacity-70 transition group-hover:translate-x-1 group-hover:opacity-100">
            →
          </span>
        </Link>

        {/* ===== Form thêm từ mới — có thể đóng/mở ===== */}
        <div className="mb-6 rounded-2xl border border-border bg-background shadow-sm">
          <button
            type="button"
            onClick={() => setShowAddForm((v) => !v)}
            className="flex w-full items-center justify-between px-5 py-4 text-left"
          >
            <h2 className="font-bold text-foreground">Thêm từ mới</h2>
            <span
              className={`text-sm text-foreground/40 transition-transform ${
                showAddForm ? "rotate-180" : ""
              }`}
            >
              ▼
            </span>
          </button>

          {showAddForm && (
            <form onSubmit={handleAddWord} className="border-t border-border p-5 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <FieldInput
                  label="Hiragana"
                  value={form.hiragana ?? ""}
                  onChange={(e) => updateFormField("hiragana", e.target.value)}
                />
                <FieldInput
                  label="Katakana"
                  value={form.katakana ?? ""}
                  onChange={(e) => updateFormField("katakana", e.target.value)}
                />
                <FieldInput
                  label="Kanji"
                  value={form.kanji ?? ""}
                  onChange={(e) => updateFormField("kanji", e.target.value)}
                />
                <FieldInput
                  label="Romaji"
                  required
                  value={form.romaji}
                  onChange={(e) => updateFormField("romaji", e.target.value)}
                  error={fieldErrors.romaji}
                />
                <FieldInput
                  label="Ý nghĩa (nhiều nghĩa cách nhau bởi ; hoặc /)"
                  required
                  className="col-span-2"
                  value={form.meaning}
                  onChange={(e) => updateFormField("meaning", e.target.value)}
                  error={fieldErrors.meaning}
                />
                <FieldInput
                  label="Ghi chú"
                  className="col-span-2"
                  value={form.note ?? ""}
                  onChange={(e) => updateFormField("note", e.target.value)}
                />
              </div>
              {formError && <p className="mt-3 text-sm text-danger">{formError}</p>}
              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-4 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-primary-hover disabled:opacity-50"
              >
                {isSubmitting ? "Đang kiểm tra..." : "Thêm từ"}
              </button>
            </form>
          )}
        </div>

        {/* Khối trùng thật — chặn, hỏi đè/giữ */}
        {duplicatePrompt && (
          <div className="mb-6 rounded-xl border border-caution bg-caution/10 p-4">
            <p className="mb-3 text-sm text-foreground">
              Từ này trùng với từ đã có:{" "}
              <strong>{duplicatePrompt.existingSummary}</strong>
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleOverwriteDuplicate}
                className="rounded-lg bg-danger px-4 py-2 text-sm font-bold text-white transition hover:bg-danger-hover"
              >
                Đè lên từ cũ
              </button>
              <button
                onClick={handleKeepOldWord}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground/70 transition hover:text-foreground"
              >
                Giữ từ cũ
              </button>
            </div>
          </div>
        )}

        {/* Cảnh báo phụ (không chặn): romaji trùng, nghĩa khác hẳn */}
        {romajiWarning && (
          <div className="mb-6 rounded-xl border border-warning bg-warning/10 p-4">
            <p className="mb-3 text-sm text-foreground">
              Lưu ý: đã có từ khác cùng romaji{" "}
              <strong>&quot;{romajiWarning.matchedWord.romaji}&quot;</strong> (nghĩa: &quot;
              {romajiWarning.matchedWord.meaning}&quot;) trong chủ đề này. Bạn có chắc muốn tạo
              thêm từ này không?
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleConfirmRomajiWarning}
                disabled={isSubmitting}
                className="rounded-lg bg-warning px-4 py-2 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                Vẫn tạo
              </button>
              <button
                onClick={handleCancelRomajiWarning}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground/70 transition hover:text-foreground"
              >
                Hủy
              </button>
            </div>
          </div>
        )}

        {/* ===== Tìm kiếm trong chủ đề ===== */}
        <form onSubmit={handleSearchSubmit} className="mb-4 flex gap-2">
          <input
            placeholder="Tìm trong chủ đề này..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="submit"
            className="shrink-0 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground/70 transition hover:border-primary hover:text-primary"
          >
            Tìm
          </button>
        </form>

        {/* ===== Sắp xếp danh sách (mới thêm) — thuần Frontend, không gọi lại API ===== */}
        <div className="mb-4 flex items-center justify-end gap-2">
          <label htmlFor="sort-select" className="text-xs font-medium text-foreground/50">
            Sắp xếp:
          </label>
          <select
            id="sort-select"
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as SortOption)}
            className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
          >
            {(Object.keys(SORT_LABELS) as SortOption[]).map((option) => (
              <option key={option} value={option}>
                {SORT_LABELS[option]}
              </option>
            ))}
          </select>
        </div>

        {/* ===== Toolbar di chuyển nhiều từ ===== */}
        {selectedIds.size > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-secondary/40 bg-secondary/5 p-4">
            <span className="text-sm font-medium text-foreground">
              Đã chọn {selectedIds.size} từ
            </span>
            <select
              value={moveTargetTopicId}
              onChange={(e) => setMoveTargetTopicId(e.target.value)}
              className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
            >
              <option value="">-- Chọn chủ đề đích --</option>
              {otherTopics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleMoveSelected}
              disabled={!moveTargetTopicId || isMoving}
              className="rounded-lg bg-secondary px-3 py-1.5 text-sm font-bold text-white transition hover:bg-secondary-hover disabled:opacity-50"
            >
              {isMoving ? "Đang chuyển..." : "Di chuyển"}
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-sm font-medium text-foreground/50 hover:text-foreground"
            >
              Bỏ chọn hết
            </button>
            {moveError && <p className="w-full text-sm text-danger">{moveError}</p>}
          </div>
        )}

        {/* ===== Danh sách từ vựng — compact, avatar màu luân phiên, cả dòng bấm để Sửa ===== */}
        {loadingWords && (
          <p className="py-10 text-center text-sm text-foreground/50">Đang tải...</p>
        )}
        {loadError && <p className="text-sm text-danger">{loadError}</p>}
        {!loadingWords && !loadError && words.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-background px-6 py-12 text-center">
            <p className="text-sm text-foreground/50">Chưa có từ nào.</p>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          {sortedWords.map((word, index) => {
            const accent = accentIndex(index);
            const avatarChar = (word.hiragana || word.katakana || word.kanji || word.romaji)
              .charAt(0)
              .toUpperCase();

            // --- Dòng đang SỬA — dải màu primary bên trái, dùng chung FieldInput ---
            if (editingId === word.id) {
              return (
                <div
                  key={word.id}
                  className="flex overflow-hidden rounded-xl border border-primary bg-primary/5 shadow-sm"
                >
                  <div className="w-1.5 shrink-0 bg-primary" />
                  <div className="flex-1 p-4">
                    <div className="grid grid-cols-2 gap-2">
                      <FieldInput
                        label="Hiragana"
                        value={editForm.hiragana ?? ""}
                        onChange={(e) => setEditForm((p) => ({ ...p, hiragana: e.target.value }))}
                      />
                      <FieldInput
                        label="Romaji"
                        value={editForm.romaji}
                        onChange={(e) => setEditForm((p) => ({ ...p, romaji: e.target.value }))}
                      />
                      <FieldInput
                        label="Ý nghĩa"
                        className="col-span-2"
                        value={editForm.meaning}
                        onChange={(e) => setEditForm((p) => ({ ...p, meaning: e.target.value }))}
                      />
                      <FieldInput
                        label="Ghi chú"
                        className="col-span-2"
                        value={editForm.note ?? ""}
                        onChange={(e) => setEditForm((p) => ({ ...p, note: e.target.value }))}
                      />
                    </div>
                    {editError && <p className="mt-2 text-sm text-danger">{editError}</p>}
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => handleSaveEdit(word.id)}
                        className="rounded-lg bg-primary px-4 py-1.5 text-sm font-bold text-white transition hover:bg-primary-hover"
                      >
                        Lưu
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="rounded-lg border border-border px-4 py-1.5 text-sm font-medium text-foreground/70 transition hover:text-foreground"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            // --- Dòng đang XÁC NHẬN XÓA — dải màu danger bên trái ---
            if (deletingId === word.id) {
              return (
                <div
                  key={word.id}
                  className="flex items-center overflow-hidden rounded-xl border border-danger bg-danger/5 shadow-sm"
                >
                  <div className="w-1.5 self-stretch bg-danger" />
                  <div className="flex flex-wrap items-center gap-3 p-3">
                    <span className="text-sm text-foreground">
                      Xóa từ &quot;{word.romaji}&quot;?
                    </span>
                    <button
                      onClick={() => handleConfirmDelete(word.id)}
                      className="rounded-lg bg-danger px-3 py-1 text-sm font-bold text-white transition hover:bg-danger-hover"
                    >
                      Xác nhận
                    </button>
                    <button
                      onClick={() => setDeletingId(null)}
                      className="text-sm font-medium text-foreground/50 hover:text-foreground"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              );
            }

            // --- Dòng bình thường — compact, bấm cả dòng để Sửa ---
            return (
              <div
                key={word.id}
                onClick={() => startEdit(word)}
                className="group flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-background px-3 py-2 shadow-sm transition hover:-translate-y-px hover:border-primary/40 hover:shadow-md"
              >
                {/* STT — số thứ tự theo danh sách đang hiển thị (đã sort), không cần offset trang vì trang này không phân trang thật */}
                <span className="w-5 shrink-0 text-right text-xs font-medium text-foreground/35">
                  {index + 1}
                </span>
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${ACCENT_BADGE_BG[accent]} ${ACCENT_BADGE_TEXT[accent]}`}
                >
                  {avatarChar}
                </span>
                <input
                  type="checkbox"
                  checked={selectedIds.has(word.id)}
                  onChange={() => toggleSelect(word.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="h-4 w-4 shrink-0 accent-primary"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {word.hiragana && <span>{word.hiragana} · </span>}
                    {word.romaji}
                    {word.note && (
                      <span className="ml-2 truncate text-xs font-normal text-foreground/40">
                        {word.note}
                      </span>
                    )}
                  </p>
                  {/* Ý nghĩa — làm nổi bật hơn trước (đậm + rõ hơn, thay vì mờ nhạt như cũ) */}
                  <p className="truncate text-sm font-semibold text-foreground/80">
                    {word.meaning}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {(word.hiragana || word.katakana || word.kanji) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        speakWord(word);
                      }}
                      title="Phát âm"
                      className="text-base leading-none text-foreground/40 transition hover:text-secondary"
                    >
                      🔊
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingId(word.id);
                    }}
                    title="Xóa"
                    className="text-base leading-none text-foreground/30 transition hover:text-danger"
                  >
                    ✕
                  </button>
                  <span className="text-foreground/20 opacity-0 transition group-hover:opacity-100">
                    →
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ===== Modal Import Excel ===== */}
        {showImportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-background p-6 shadow-lg">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground">Import từ vựng</h2>
                <button
                  onClick={closeImportModal}
                  className="text-foreground/40 transition hover:text-foreground"
                >
                  ✕
                </button>
              </div>

              {!isProcessingImport && !importSummary && !importDuplicateSummary && !importRomajiWarningSummary && (
                <>
                  <div className="mb-5">
                    <label className="mb-1 block text-sm font-semibold text-foreground">
                      Dán danh sách (mỗi dòng 1 từ, cách nhau bởi dấu |)
                    </label>
                    <textarea
                      value={importText}
                      onChange={(e) => setImportText(e.target.value)}
                      placeholder={"hiragana|katakana|kanji|romaji|ý nghĩa|ghi chú\nたべる||食べる|taberu|ăn;dùng bữa|"}
                      rows={6}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                      onClick={handleImportFromText}
                      disabled={!importText.trim()}
                      className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-primary-hover disabled:opacity-50"
                    >
                      Import từ danh sách đã dán
                    </button>
                  </div>

                  {/* ===== Điểm nhấn: khối "drop-zone" viền đứt nét cho chọn file Excel ===== */}
                  <div className="border-t border-border pt-4">
                    <label className="mb-1 block text-sm font-semibold text-foreground">
                      Hoặc chọn file Excel (.xlsx) — dòng đầu tiên coi là tiêu đề, sẽ bị bỏ qua
                    </label>
                    <label className="mt-1 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-secondary/40 bg-secondary/5 px-4 py-4 text-sm font-semibold text-secondary transition hover:border-secondary hover:bg-secondary/10">
                      <span className="text-lg leading-none">📁</span>
                      <span>
                        {selectedFileName ? selectedFileName : "Bấm để chọn file .xlsx"}
                      </span>
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleImportFromFile}
                        className="hidden"
                      />
                    </label>
                  </div>
                </>
              )}

              {isProcessingImport && importProgress && !importDuplicateSummary && !importRomajiWarningSummary && (
                <p className="text-sm text-foreground/60">
                  Đang xử lý dòng {importProgress.current}/{importProgress.total}...
                </p>
              )}

              {importDuplicateSummary && (
                <div className="rounded-xl border border-caution bg-caution/10 p-4">
                  <p className="mb-3 text-sm text-foreground">
                    Từ này trùng với từ đã có: <strong>{importDuplicateSummary}</strong>
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => resolveImportDuplicate("overwrite")}
                      className="rounded-lg bg-danger px-3 py-1.5 text-sm font-bold text-white transition hover:bg-danger-hover"
                    >
                      Đè lên từ cũ
                    </button>
                    <button
                      onClick={() => resolveImportDuplicate("skip")}
                      className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground/70 transition hover:text-foreground"
                    >
                      Giữ từ cũ
                    </button>
                  </div>
                </div>
              )}

              {/* Cảnh báo phụ lúc import: romaji trùng, nghĩa khác — không phải trùng thật */}
              {importRomajiWarningSummary && (
                <div className="rounded-xl border border-warning bg-warning/10 p-4">
                  <p className="mb-3 text-sm text-foreground">
                    Lưu ý: đã có từ khác cùng romaji, nghĩa khác:{" "}
                    <strong>{importRomajiWarningSummary}</strong>
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => resolveImportRomajiWarning("create")}
                      className="rounded-lg bg-warning px-3 py-1.5 text-sm font-bold text-white transition hover:opacity-90"
                    >
                      Vẫn tạo
                    </button>
                    <button
                      onClick={() => resolveImportRomajiWarning("skip")}
                      className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground/70 transition hover:text-foreground"
                    >
                      Bỏ qua dòng này
                    </button>
                  </div>
                </div>
              )}

              {importSummary && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-foreground">
                    Đã xử lý xong {importSummary.total} dòng:
                  </p>
                  <ul className="list-inside list-disc text-sm text-foreground/70">
                    <li>Thêm mới: {importSummary.success}</li>
                    <li>Ghi đè từ cũ: {importSummary.overwritten}</li>
                    <li>Giữ nguyên (bỏ qua trùng): {importSummary.skippedDuplicate}</li>
                    <li>Bỏ qua (cảnh báo romaji khác nghĩa): {importSummary.skippedRomajiWarning}</li>
                    <li>Lỗi / thiếu dữ liệu bắt buộc: {importSummary.invalid}</li>
                  </ul>
                  <button
                    onClick={closeImportModal}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-primary-hover"
                  >
                    Đóng
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}