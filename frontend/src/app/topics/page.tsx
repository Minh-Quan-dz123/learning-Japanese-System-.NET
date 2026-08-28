"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { TopicDto } from "@/types/topic";
import { VocabularyDto, PagedResult } from "@/types/vocabulary";
import { getTopics, createTopic, updateTopic, deleteTopic } from "@/lib/topicApi";
import { searchVocabularies } from "@/lib/vocabularyApi";
import { getApiErrorMessage } from "@/lib/apiError";

// Dải màu nhấn luân phiên cho từng thẻ chủ đề — thuần thị giác, không mang ý nghĩa dữ liệu.
const ACCENT_BAR = ["bg-primary", "bg-secondary", "bg-success"];
const ACCENT_BADGE_BG = ["bg-primary/10", "bg-secondary/10", "bg-success/10"];
const ACCENT_BADGE_TEXT = ["text-primary", "text-secondary", "text-success"];

function accentIndex(index: number) {
  return index % ACCENT_BAR.length;
}

export default function TopicsPage() {
  const { user, isLoading } = useAuth();

  const [topics, setTopics] = useState<TopicDto[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [showCreateForm, setShowCreateForm] = useState(false); // MỚI — chỉ điều khiển ẩn/hiện UI
  const [newName, setNewName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  // --- State: tìm kiếm từ vựng trên TOÀN BỘ chủ đề (giữ nguyên) ---
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PagedResult<VocabularyDto> | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading || !user) return;
    loadTopics();
  }, [isLoading, user]);

  async function loadTopics() {
    setLoadingTopics(true);
    setLoadError(null);
    try {
      setTopics(await getTopics());
    } catch (err) {
      setLoadError(getApiErrorMessage(err, "Không tải được danh sách chủ đề"));
    } finally {
      setLoadingTopics(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setIsCreating(true);
    try {
      const created = await createTopic({ name: newName });
      setTopics((prev) => [...prev, created]);
      setNewName("");
      setShowCreateForm(false);
    } catch (err) {
      setCreateError(getApiErrorMessage(err, "Tạo chủ đề thất bại"));
    } finally {
      setIsCreating(false);
    }
  }

  function startEdit(topic: TopicDto) {
    setEditingId(topic.id);
    setEditingName(topic.name);
    setEditError(null);
  }

  async function handleSaveEdit(id: string) {
    setEditError(null);
    try {
      const updated = await updateTopic(id, { name: editingName });
      setTopics((prev) => prev.map((t) => (t.id === id ? updated : t)));
      setEditingId(null);
    } catch (err) {
      setEditError(getApiErrorMessage(err, "Sửa tên thất bại"));
    }
  }

  async function handleConfirmDelete(id: string) {
    try {
      await deleteTopic(id);
      setTopics((prev) => prev.filter((t) => t.id !== id));
      setDeletingId(null);
    } catch (err) {
      alert(getApiErrorMessage(err, "Xóa chủ đề thất bại"));
      setDeletingId(null);
    }
  }

  // --- Tìm kiếm từ vựng toàn bộ (giữ nguyên) ---

  async function runSearch(page: number) {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    setIsSearching(true);
    setSearchError(null);
    try {
      const result = await searchVocabularies(searchQuery, page, 20);
      setSearchResults(result);
    } catch (err) {
      setSearchError(getApiErrorMessage(err, "Tìm kiếm thất bại"));
    } finally {
      setIsSearching(false);
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    runSearch(1);
  }

  function findTopicName(topicId: string): string {
    return topics.find((t) => t.id === topicId)?.name ?? "(không rõ chủ đề)";
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
      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* ===== HERO ===== */}
        <div className="relative mb-8 overflow-hidden rounded-2xl border border-border bg-background px-6 py-8 shadow-sm sm:px-8">
          {/* Watermark kanji — chỉ trang trí, nhất quán với glyph module ở trang chủ */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-4 -top-6 select-none text-[9rem] font-black leading-none text-secondary/[0.06] sm:text-[11rem]"
          >
            語彙
          </span>

          <div className="relative">
            <p className="text-xs font-bold uppercase tracking-wider text-secondary">
              Module 3
            </p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-foreground">
              Chủ đề từ vựng
            </h1>
            <p className="mt-1 text-sm text-foreground/50">
              Quản lý kho từ vựng cá nhân, chia theo từng chủ đề.
            </p>

            {/* Toolbar: tìm kiếm + tạo chủ đề */}
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <form onSubmit={handleSearchSubmit} className="flex flex-1 gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm từ vựng trong tất cả chủ đề..."
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="submit"
                  disabled={isSearching}
                  className="shrink-0 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground/70 transition hover:border-primary hover:text-primary disabled:opacity-50"
                >
                  {isSearching ? "Đang tìm..." : "Tìm"}
                </button>
              </form>
              <button
                onClick={() => setShowCreateForm((v) => !v)}
                className={`shrink-0 rounded-lg px-4 py-2.5 text-sm font-bold shadow-sm transition ${
                  showCreateForm
                    ? "border border-border text-foreground/70 hover:text-foreground"
                    : "bg-primary text-white hover:bg-primary-hover"
                }`}
              >
                {showCreateForm ? "Hủy" : "+ Chủ đề mới"}
              </button>
            </div>

            {/* Form tạo chủ đề — inline, chỉ hiện khi bấm nút trên */}
            {showCreateForm && (
              <form
                onSubmit={handleCreate}
                className="mt-3 flex gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3"
              >
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="VD: Ngữ pháp N5"
                  autoFocus
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  required
                />
                <button
                  type="submit"
                  disabled={isCreating}
                  className="shrink-0 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-primary-hover disabled:opacity-50"
                >
                  {isCreating ? "Đang tạo..." : "Tạo"}
                </button>
              </form>
            )}
            {createError && <p className="mt-2 text-sm text-danger">{createError}</p>}
          </div>
        </div>

        {/* ===== Banner Luyện tập — tách riêng, nổi bật hơn hẳn ===== */}
        <Link
          href="/vocabularies/practice"
          className="group mb-8 flex items-center justify-between overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-secondary px-6 py-5 shadow-sm transition hover:shadow-lg"
        >
          <div className="flex items-center gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 text-xl font-bold text-white">
              力
            </span>
            <div>
              <p className="font-bold text-white">Luyện tập điền đáp án</p>
              <p className="text-sm text-white/80">
                Gõ đáp án, chọn chủ đề &amp; chế độ ôn tập tuỳ ý.
              </p>
            </div>
          </div>
          <span className="text-xl text-white opacity-70 transition group-hover:translate-x-1 group-hover:opacity-100">
            →
          </span>
        </Link>

        {/* ===== Kết quả tìm kiếm (nếu có) ===== */}
        {searchError && (
          <p className="mb-4 text-sm text-danger">{searchError}</p>
        )}
        {searchResults && (
          <div className="mb-8 rounded-2xl border border-secondary/30 bg-background p-5 shadow-sm">
            <p className="mb-3 text-sm text-foreground/50">
              Tìm thấy{" "}
              <span className="font-semibold text-foreground">
                {searchResults.totalCount}
              </span>{" "}
              từ (trang {searchResults.page}/{searchResults.totalPages || 1})
            </p>
            {searchResults.items.length === 0 ? (
              <p className="text-sm text-foreground/50">Không có từ nào khớp.</p>
            ) : (
              <ul className="divide-y divide-border">
                {searchResults.items.map((word) => (
                  <li key={word.id}>
                    <Link
                      href={`/topics/${word.topicId}`}
                      className="-mx-2 flex items-center justify-between rounded-lg px-2 py-2.5 transition hover:bg-surface"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">
                          {word.hiragana && <span>{word.hiragana} · </span>}
                          {word.romaji}
                        </p>
                        <p className="truncate text-sm text-foreground/60">
                          {word.meaning}
                        </p>
                      </div>
                      <span className="ml-3 shrink-0 rounded-full bg-secondary/10 px-2.5 py-1 text-xs font-semibold text-secondary">
                        {findTopicName(word.topicId)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {searchResults.totalPages > 1 && (
              <div className="mt-3 flex gap-4">
                <button
                  onClick={() => runSearch(searchResults.page - 1)}
                  disabled={searchResults.page <= 1 || isSearching}
                  className="text-sm font-medium text-secondary hover:underline disabled:text-foreground/30 disabled:no-underline"
                >
                  ← Trang trước
                </button>
                <button
                  onClick={() => runSearch(searchResults.page + 1)}
                  disabled={searchResults.page >= searchResults.totalPages || isSearching}
                  className="text-sm font-medium text-secondary hover:underline disabled:text-foreground/30 disabled:no-underline"
                >
                  Trang sau →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ===== Lưới thẻ chủ đề ===== */}
        {loadingTopics && (
          <p className="py-12 text-center text-sm text-foreground/50">
            Đang tải danh sách...
          </p>
        )}
        {loadError && (
          <p className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            {loadError}
          </p>
        )}
        {!loadingTopics && !loadError && topics.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-background px-6 py-16 text-center">
            <p className="text-4xl">📔</p>
            <p className="mt-3 text-sm font-medium text-foreground/60">
              Chưa có chủ đề nào.
            </p>
            <p className="mt-1 text-xs text-foreground/40">
              Bấm &quot;+ Chủ đề mới&quot; ở trên để bắt đầu thêm từ vựng.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {topics.map((topic, index) => {
            const accent = accentIndex(index);

            // --- Thẻ đang SỬA TÊN ---
            if (editingId === topic.id) {
              return (
                <div
                  key={topic.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-primary bg-background shadow-sm"
                >
                  <div className="h-1.5 w-full bg-primary" />
                  <div className="p-5">
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      autoFocus
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                    {editError && (
                      <p className="mt-2 text-sm text-danger">{editError}</p>
                    )}
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => handleSaveEdit(topic.id)}
                        className="flex-1 rounded-lg bg-primary py-2 text-sm font-bold text-white transition hover:bg-primary-hover"
                      >
                        Lưu
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="flex-1 rounded-lg border border-border py-2 text-sm font-medium text-foreground/70 transition hover:text-foreground"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            // --- Thẻ đang XÁC NHẬN XÓA ---
            if (deletingId === topic.id) {
              return (
                <div
                  key={topic.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-danger bg-background shadow-sm"
                >
                  <div className="h-1.5 w-full bg-danger" />
                  <div className="p-5">
                    <p className="text-sm font-medium text-foreground">
                      Xóa &quot;{topic.name}&quot; và toàn bộ từ vựng bên trong?
                    </p>
                    <p className="mt-0.5 text-xs text-foreground/50">
                      Thao tác này không thể hoàn tác.
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => handleConfirmDelete(topic.id)}
                        className="flex-1 rounded-lg bg-danger py-2 text-sm font-bold text-white transition hover:bg-danger-hover"
                      >
                        Xác nhận xóa
                      </button>
                      <button
                        onClick={() => setDeletingId(null)}
                        className="flex-1 rounded-lg border border-border py-2 text-sm font-medium text-foreground/70 transition hover:text-foreground"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            // --- Thẻ bình thường ---
            return (
              <div
                key={topic.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className={`h-1.5 w-full ${ACCENT_BAR[accent]}`} />
                <Link href={`/topics/${topic.id}`} className="flex-1 px-5 pb-4 pt-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate font-extrabold text-foreground">
                      {topic.name}
                    </p>
                    <span className="shrink-0 text-foreground/20 transition group-hover:translate-x-0.5 group-hover:text-foreground/50">
                      →
                    </span>
                  </div>
                  <span
                    className={`mt-3 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${ACCENT_BADGE_BG[accent]} ${ACCENT_BADGE_TEXT[accent]}`}
                  >
                    {topic.wordCount} từ
                  </span>
                  <p className="mt-2 text-xs text-foreground/40">
                    {topic.lastModifiedAt
                      ? `Sửa gần nhất ${new Date(topic.lastModifiedAt).toLocaleString("vi-VN")}`
                      : "Chưa có hoạt động"}
                  </p>
                </Link>
                <div className="flex border-t border-border">
                  <button
                    onClick={() => startEdit(topic)}
                    className="flex-1 py-2.5 text-xs font-semibold text-secondary transition hover:bg-secondary/5"
                  >
                    Sửa tên
                  </button>
                  <div className="w-px bg-border" />
                  <button
                    onClick={() => setDeletingId(topic.id)}
                    className="flex-1 py-2.5 text-xs font-semibold text-danger transition hover:bg-danger/5"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}