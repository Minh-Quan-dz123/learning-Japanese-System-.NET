"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { TopicDto } from "@/types/topic";
import { VocabularyDto, CreateVocabularyRequest } from "@/types/vocabulary";
import { getTopics } from "@/lib/topicApi";
import {
  getVocabulariesByTopic,
  checkDuplicate,
  createVocabulary,
  updateVocabulary,
  deleteVocabulary,
} from "@/lib/vocabularyApi";
import { getApiErrorMessage, getApiErrorDetails } from "@/lib/apiError";

const emptyForm: CreateVocabularyRequest = {
  topicId: "",
  hiragana: "",
  katakana: "",
  kanji: "",
  romaji: "",
  meaning: "",
  note: "",
};

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

  const [form, setForm] = useState<CreateVocabularyRequest>({ ...emptyForm, topicId });
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [duplicatePrompt, setDuplicatePrompt] = useState<{ existingId: string; existingSummary: string } | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CreateVocabularyRequest>({ ...emptyForm, topicId });
  const [editError, setEditError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  // --- State mới cho tính năng di chuyển nhiều từ cùng lúc ---
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [moveTargetTopicId, setMoveTargetTopicId] = useState<string>("");
  const [isMoving, setIsMoving] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);

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

  function updateFormField(field: keyof CreateVocabularyRequest, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
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
      const created = await createVocabulary({ ...form, topicId });
      setWords((prev) => [created, ...prev]);
      setForm({ ...emptyForm, topicId });
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

  // --- Các hàm mới cho tính năng di chuyển nhiều từ cùng lúc ---

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

    // Quyết định A: dừng ngay khi gặp lỗi đầu tiên, giữ lại các từ đã chuyển
    // thành công trước đó (không rollback), không cố chuyển tiếp phần còn lại.
    for (const id of idsToMove) {
      const word = words.find((w) => w.id === id);
      if (!word) continue; // phòng trường hợp dữ liệu đã đổi giữa chừng

      try {
        // PUT là replace toàn bộ (api_design.md mục 4.2) — phải gửi đủ field,
        // không chỉ gửi mỗi topicId.
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

    // Các từ chuyển thành công không còn thuộc topic đang xem nữa — loại khỏi danh sách hiện tại
    if (movedIds.length > 0) {
      setWords((prev) => prev.filter((w) => !movedIds.includes(w.id)));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        movedIds.forEach((id) => next.delete(id));
        return next;
      });
    }

    if (movedIds.length === idsToMove.length) {
      // Chuyển hết toàn bộ thành công, không còn lỗi
      setMoveTargetTopicId("");
    }

    setIsMoving(false);
  }

  if (isLoading) return <p className="p-6">Đang tải...</p>;
  if (!user) {
    return (
      <p className="p-6">
        Bạn chưa đăng nhập. <Link href="/login" className="text-blue-600 underline">Đăng nhập</Link>
      </p>
    );
  }

  const otherTopics = allTopics.filter((t) => t.id !== topicId);

  return (
    <div className="max-w-3xl mx-auto p-6">
      <Link href="/topics" className="text-sm text-blue-600 underline">&larr; Danh sách chủ đề</Link>
      <div className="flex justify-between items-center mt-2 mb-4">
        <h1 className="text-2xl font-bold">{topic?.name ?? "Chủ đề"}</h1>
        <Link
          href={`/vocabularies/practice?topicId=${topicId}`}
          className="bg-green-600 text-white px-4 py-2 rounded text-sm"
        >
          Luyện tập chủ đề này
        </Link>
      </div>

      <form onSubmit={handleAddWord} className="border rounded p-4 mb-6 space-y-2">
        <h2 className="font-semibold mb-2">Thêm từ mới</h2>
        <div className="grid grid-cols-2 gap-2">
          <input placeholder="Hiragana" value={form.hiragana ?? ""} onChange={(e) => updateFormField("hiragana", e.target.value)} className="border rounded px-2 py-1" />
          <input placeholder="Katakana" value={form.katakana ?? ""} onChange={(e) => updateFormField("katakana", e.target.value)} className="border rounded px-2 py-1" />
          <input placeholder="Kanji" value={form.kanji ?? ""} onChange={(e) => updateFormField("kanji", e.target.value)} className="border rounded px-2 py-1" />
          <div>
            <input placeholder="Romaji (bắt buộc)" value={form.romaji} onChange={(e) => updateFormField("romaji", e.target.value)} className="border rounded px-2 py-1 w-full" required />
            {fieldErrors.romaji && <p className="text-red-600 text-xs">{fieldErrors.romaji}</p>}
          </div>
          <div className="col-span-2">
            <input placeholder="Ý nghĩa (bắt buộc, nhiều nghĩa cách nhau bởi ; hoặc /)" value={form.meaning} onChange={(e) => updateFormField("meaning", e.target.value)} className="border rounded px-2 py-1 w-full" required />
            {fieldErrors.meaning && <p className="text-red-600 text-xs">{fieldErrors.meaning}</p>}
          </div>
          <input placeholder="Ghi chú" value={form.note ?? ""} onChange={(e) => updateFormField("note", e.target.value)} className="border rounded px-2 py-1 col-span-2" />
        </div>
        {formError && <p className="text-red-600 text-sm">{formError}</p>}
        <button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50">
          {isSubmitting ? "Đang kiểm tra..." : "Thêm từ"}
        </button>
      </form>

      {duplicatePrompt && (
        <div className="border border-yellow-500 bg-yellow-50 rounded p-4 mb-6">
          <p className="mb-2">Từ này trùng với từ đã có: <strong>{duplicatePrompt.existingSummary}</strong></p>
          <div className="flex gap-3">
            <button onClick={handleOverwriteDuplicate} className="bg-red-600 text-white px-3 py-1 rounded">Đè lên từ cũ</button>
            <button onClick={handleKeepOldWord} className="bg-gray-200 px-3 py-1 rounded">Giữ từ cũ</button>
          </div>
        </div>
      )}

      <form onSubmit={handleSearchSubmit} className="flex gap-2 mb-4">
        <input placeholder="Tìm trong chủ đề này..." value={search} onChange={(e) => setSearch(e.target.value)} className="border rounded px-3 py-2 flex-1" />
        <button type="submit" className="bg-gray-200 px-4 py-2 rounded">Tìm</button>
      </form>

      {/* Thanh di chuyển nhiều từ — chỉ hiện khi có ít nhất 1 từ đang được tick chọn */}
      {selectedIds.size > 0 && (
        <div className="border border-blue-400 bg-blue-50 rounded p-4 mb-4 flex flex-wrap items-center gap-3">
          <span className="text-sm">Đã chọn {selectedIds.size} từ</span>
          <select
            value={moveTargetTopicId}
            onChange={(e) => setMoveTargetTopicId(e.target.value)}
            className="border rounded px-2 py-1"
          >
            <option value="">-- Chọn chủ đề đích --</option>
            {otherTopics.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <button
            onClick={handleMoveSelected}
            disabled={!moveTargetTopicId || isMoving}
            className="bg-blue-600 text-white px-3 py-1 rounded disabled:opacity-50"
          >
            {isMoving ? "Đang chuyển..." : "Di chuyển"}
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="text-gray-500 text-sm">
            Bỏ chọn hết
          </button>
          {moveError && <p className="text-red-600 text-sm w-full">{moveError}</p>}
        </div>
      )}

      {loadingWords && <p>Đang tải...</p>}
      {loadError && <p className="text-red-600">{loadError}</p>}
      {!loadingWords && !loadError && words.length === 0 && <p className="text-gray-500">Chưa có từ nào.</p>}

      <ul className="divide-y">
        {words.map((word) => (
          <li key={word.id} className="py-3">
            {editingId === word.id ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input value={editForm.hiragana ?? ""} onChange={(e) => setEditForm((p) => ({ ...p, hiragana: e.target.value }))} placeholder="Hiragana" className="border rounded px-2 py-1" />
                  <input value={editForm.romaji} onChange={(e) => setEditForm((p) => ({ ...p, romaji: e.target.value }))} placeholder="Romaji" className="border rounded px-2 py-1" />
                  <input value={editForm.meaning} onChange={(e) => setEditForm((p) => ({ ...p, meaning: e.target.value }))} placeholder="Ý nghĩa" className="border rounded px-2 py-1 col-span-2" />
                  <input value={editForm.note ?? ""} onChange={(e) => setEditForm((p) => ({ ...p, note: e.target.value }))} placeholder="Ghi chú" className="border rounded px-2 py-1 col-span-2" />
                </div>
                {editError && <p className="text-red-600 text-sm">{editError}</p>}
                <div className="flex gap-3">
                  <button onClick={() => handleSaveEdit(word.id)} className="text-blue-600">Lưu</button>
                  <button onClick={() => setEditingId(null)} className="text-gray-500">Hủy</button>
                </div>
              </div>
            ) : deletingId === word.id ? (
              <div className="flex gap-3 items-center flex-wrap">
                <span>Xóa từ &quot;{word.romaji}&quot;?</span>
                <button onClick={() => handleConfirmDelete(word.id)} className="text-red-600 font-semibold">Xác nhận xóa</button>
                <button onClick={() => setDeletingId(null)} className="text-gray-500">Hủy</button>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(word.id)}
                    onChange={() => toggleSelect(word.id)}
                    className="w-4 h-4"
                  />
                  <div>
                    <p className="font-medium">
                      {word.hiragana && <span>{word.hiragana} · </span>}
                      {word.romaji}
                    </p>
                    <p className="text-sm text-gray-600">{word.meaning}</p>
                    {word.note && <p className="text-xs text-gray-400">{word.note}</p>}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => startEdit(word)} className="text-blue-600 text-sm">Sửa</button>
                  <button onClick={() => setDeletingId(word.id)} className="text-red-600 text-sm">Xóa</button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}