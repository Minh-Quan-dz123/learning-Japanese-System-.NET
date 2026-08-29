"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  getCharacters,
  createCharacter,
  updateCharacter,
  deleteCharacter,
} from "@/lib/characterApi";
import { getApiErrorMessage, getApiErrorDetails } from "@/lib/apiError";
import type {
  CharacterDto,
  CharacterType,
  VariantGroup,
} from "@/types/character";

// Gộp message + details (nếu có) thành 1 chuỗi dễ đọc, dùng chung helper có sẵn
// trong apiError.ts thay vì tự viết lại logic đọc Error Envelope.
function formatError(err: unknown): string {
  const details = getApiErrorDetails(err);
  if (details && details.length > 0) {
    return details.map((d) => `${d.field}: ${d.message}`).join("; ");
  }
  return getApiErrorMessage(err);
}

// Dò chữ có Hiragana/Katakana/Kanji hay không để gán đúng font hiển thị.
// Font mặc định của app (Nunito) không có glyph tiếng Nhật, nếu không tự gán
// font riêng thì trình duyệt sẽ tự fallback lung tung, hiển thị không đồng bộ.
// Mirror đúng hàm jpFontStyle() đã dùng ở vocabularies/practice/page.tsx (2026-08-28),
// chỉ áp dụng cục bộ trong file này, không đụng layout.tsx/globals.css.
const JP_FONT_FAMILY =
  '"Hiragino Kaku Gothic ProN", "Noto Sans JP", "Yu Gothic", "Meiryo", sans-serif';

function jpFontStyle(text: string): React.CSSProperties | undefined {
  if (!text) return undefined;
  const hasJapanese = /[\u3040-\u30ff\u3400-\u9fff]/.test(text);
  return hasJapanese ? { fontFamily: JP_FONT_FAMILY } : undefined;
}

const VARIANT_GROUPS: VariantGroup[] = [
  "Base",
  "Dakuten",
  "Handakuten",
  "Youon",
  "Sokuon",
];

const EMPTY_FORM = {
  char: "",
  romaji: "",
  variantGroup: "Base" as VariantGroup,
};

// ---------- Helpers cho tính năng "Thêm hàng loạt" ----------

type BulkRowStatus = "valid" | "duplicate" | "invalid";

interface BulkRow {
  lineNumber: number;
  raw: string;
  status: BulkRowStatus;
  char: string;
  romaji: string;
  type: CharacterType | null;
  variantGroup: VariantGroup | null;
  reason?: string;
  selected: boolean;
}

function normalizeType(raw: string): CharacterType | null {
  const v = raw.trim().toLowerCase();
  if (v === "hiragana") return "Hiragana";
  if (v === "katakana") return "Katakana";
  return null;
}

function normalizeVariantGroup(raw: string): VariantGroup | null {
  const v = raw.trim().toLowerCase();
  return VARIANT_GROUPS.find((g) => g.toLowerCase() === v) ?? null;
}

// Parse 1 dòng text dán vào, dùng existingKeys (dữ liệu đã có trong DB) và
// seenKeys (các dòng đã xử lý trước đó trong CÙNG 1 lần dán) để phát hiện trùng.
// Khóa trùng = `${type}::${char}` — vì char giống nhau nhưng khác type (VD あ vs ア)
// không được coi là trùng nhau.
function parseBulkLine(
  raw: string,
  lineNumber: number,
  existingKeys: Set<string>,
  seenKeys: Set<string>
): BulkRow {
  const parts = raw.split("|").map((p) => p.trim());
  const charVal = parts[0] ?? "";
  const romajiVal = parts[1] ?? "";
  const typeRaw = parts[2] ?? "";
  const variantRaw = parts[3] ?? "";

  const base = {
    lineNumber,
    raw,
    char: charVal,
    romaji: romajiVal,
  };

  if (parts.length < 3) {
    return {
      ...base,
      type: null,
      variantGroup: null,
      status: "invalid",
      reason: "Thiếu dữ liệu (cần ít nhất char|romaji|type)",
      selected: false,
    };
  }
  if (!charVal) {
    return {
      ...base,
      type: null,
      variantGroup: null,
      status: "invalid",
      reason: "Thiếu Chữ",
      selected: false,
    };
  }
  if (!romajiVal) {
    return {
      ...base,
      type: null,
      variantGroup: null,
      status: "invalid",
      reason: "Thiếu Romaji",
      selected: false,
    };
  }

  const type = normalizeType(typeRaw);
  if (!type) {
    return {
      ...base,
      type: null,
      variantGroup: null,
      status: "invalid",
      reason: `Loại "${typeRaw}" không hợp lệ (chỉ Hiragana/Katakana)`,
      selected: false,
    };
  }

  let variantGroup: VariantGroup = "Base";
  if (variantRaw) {
    const parsed = normalizeVariantGroup(variantRaw);
    if (!parsed) {
      return {
        ...base,
        type,
        variantGroup: null,
        status: "invalid",
        reason: `Nhóm biến âm "${variantRaw}" không hợp lệ`,
        selected: false,
      };
    }
    variantGroup = parsed;
  }

  const key = `${type}::${charVal}`;
  const isDuplicate = existingKeys.has(key) || seenKeys.has(key);
  seenKeys.add(key);

  return {
    ...base,
    type,
    variantGroup,
    status: isDuplicate ? "duplicate" : "valid",
    reason: isDuplicate
      ? `Đã có chữ "${charVal}" (${type}) trong hệ thống, hoặc trùng với 1 dòng khác vừa dán`
      : undefined,
    selected: true,
  };
}

export default function AdminCharactersPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [activeType, setActiveType] = useState<CharacterType>("Hiragana");
  const [characters, setCharacters] = useState<CharacterDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ---------- State cho modal "Thêm hàng loạt" ----------
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkPreview, setBulkPreview] = useState<BulkRow[] | null>(null);
  const [bulkAnalyzing, setBulkAnalyzing] = useState(false);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkResult, setBulkResult] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);

  // GIẢ ĐỊNH: UserDto (types/auth.ts) có field "role" kiểu string, giá trị "Admin"/"User".
  // Đã được xác nhận đúng qua test runtime trang chủ (2026-08-25, theo DECISIONS_LOG.md),
  // nên rủi ro sai ở đây thấp, không phải giả định mới.
  const isAdmin = user?.role === "Admin";

  const loadCharacters = useCallback(async (type: CharacterType) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCharacters(type);
      setCharacters(data);
    } catch (err) {
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCharacters(activeType);
  }, [activeType, loadCharacters]);

  function openAddForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowForm(true);
  }

  function openEditForm(c: CharacterDto) {
    setEditingId(c.id);
    setForm({ char: c.char, romaji: c.romaji, variantGroup: c.variantGroup });
    setFormError(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!form.char.trim() || !form.romaji.trim()) {
      setFormError("Vui lòng nhập đủ Chữ và Romaji.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        char: form.char.trim(),
        romaji: form.romaji.trim(),
        type: activeType,
        variantGroup: form.variantGroup,
      };

      if (editingId) {
        await updateCharacter(editingId, payload);
      } else {
        await createCharacter(payload);
      }

      closeForm();
      await loadCharacters(activeType);
    } catch (err) {
      setFormError(formatError(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(c: CharacterDto) {
    const confirmed = window.confirm(
      `Xóa chữ "${c.char}" (${c.romaji})?\n\nLưu ý: các lượt luyện tập cũ có dùng chữ này sẽ hiển thị "(admin đã xóa chữ này)" thay vì mất hẳn dữ liệu (theo ON DELETE SET NULL).`
    );
    if (!confirmed) return;

    try {
      await deleteCharacter(c.id);
      await loadCharacters(activeType);
    } catch (err) {
      alert(formatError(err));
    }
  }

  // ---------- Xử lý "Thêm hàng loạt" ----------

  function openBulkModal() {
    setBulkText("");
    setBulkPreview(null);
    setBulkResult(null);
    setShowBulkModal(true);
  }

  function closeBulkModal() {
    setShowBulkModal(false);
    setBulkText("");
    setBulkPreview(null);
    setBulkResult(null);
  }

  async function handleAnalyzeBulk() {
    setBulkAnalyzing(true);
    try {
      // Tải sẵn CẢ 2 danh sách (Hiragana + Katakana) để dò trùng, vì 1 lần dán
      // có thể mix cả 2 loại — không thể chỉ dựa vào tab đang mở.
      const [hira, kata] = await Promise.all([
        getCharacters("Hiragana"),
        getCharacters("Katakana"),
      ]);
      const existingKeys = new Set<string>();
      for (const c of [...hira, ...kata]) {
        existingKeys.add(`${c.type}::${c.char.trim()}`);
      }

      const lines = bulkText.split("\n");
      const seenKeys = new Set<string>();
      const rows: BulkRow[] = [];
      lines.forEach((line, idx) => {
        if (!line.trim()) return; // bỏ qua dòng trắng, không tính là lỗi
        rows.push(parseBulkLine(line, idx + 1, existingKeys, seenKeys));
      });
      setBulkPreview(rows);
    } catch (err) {
      alert(formatError(err));
    } finally {
      setBulkAnalyzing(false);
    }
  }

  function toggleBulkRowSelected(index: number) {
    setBulkPreview((prev) =>
      prev
        ? prev.map((row, i) =>
            i === index ? { ...row, selected: !row.selected } : row
          )
        : prev
    );
  }

  function selectAllBulk(selected: boolean) {
    setBulkPreview((prev) =>
      prev
        ? prev.map((row) =>
            row.status === "invalid" ? row : { ...row, selected }
          )
        : prev
    );
  }

  async function handleSubmitBulk() {
    if (!bulkPreview) return;
    const toCreate = bulkPreview.filter(
      (r) => r.selected && r.status !== "invalid"
    );
    if (toCreate.length === 0) {
      alert("Chưa chọn dòng nào hợp lệ để tạo.");
      return;
    }

    setBulkSubmitting(true);
    let success = 0;
    const errors: string[] = [];

    // Lặp tuần tự, dòng nào lỗi thì bỏ qua và tiếp tục (kiểu Import Excel),
    // không dừng cả batch chỉ vì 1 dòng lỗi.
    for (const row of toCreate) {
      try {
        await createCharacter({
          char: row.char,
          romaji: row.romaji,
          type: row.type as CharacterType,
          variantGroup: row.variantGroup as VariantGroup,
        });
        success++;
      } catch (err) {
        errors.push(`Dòng ${row.lineNumber} ("${row.char}"): ${formatError(err)}`);
      }
    }

    setBulkResult({ success, failed: errors.length, errors });
    setBulkSubmitting(false);
    await loadCharacters(activeType);
  }

  if (authLoading) {
    return (
      <div className="p-6 text-center text-foreground/60">Đang tải...</div>
    );
  }

  const bulkValidCount = bulkPreview?.filter((r) => r.status === "valid").length ?? 0;
  const bulkDuplicateCount = bulkPreview?.filter((r) => r.status === "duplicate").length ?? 0;
  const bulkInvalidCount = bulkPreview?.filter((r) => r.status === "invalid").length ?? 0;
  const bulkSelectedCount =
    bulkPreview?.filter((r) => r.selected && r.status !== "invalid").length ?? 0;

  return (
    <div className="mx-auto max-w-6xl p-6">
      {/* ---------- Hero header ---------- */}
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-border bg-surface p-6">
        <span
          aria-hidden
          className="pointer-events-none absolute -right-4 -top-6 text-[7rem] font-bold text-foreground/5"
          style={jpFontStyle("字")}
        >
          字
        </span>

        <div className="relative flex items-center gap-4">
          <button
            onClick={() => router.push("/")}
            aria-label="Về trang chủ"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border text-foreground/70 transition-colors hover:bg-primary hover:text-white"
          >
            ←
          </button>
          <div>
            <h1 className="text-2xl font-bold">Quản lý bảng chữ cái</h1>
            <p className="text-sm text-foreground/60">
              Thêm / sửa / xóa Hiragana, Katakana — chỉ Admin thao tác được
            </p>
          </div>
        </div>
      </div>

      {!isAdmin && (
        <div className="mb-4 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
          Tài khoản của bạn không có quyền Admin. Bạn có thể xem danh sách,
          nhưng thao tác thêm/sửa/xóa sẽ bị hệ thống từ chối (403).
        </div>
      )}

      {/* ---------- Tabs Hiragana/Katakana kiểu pill ---------- */}
      <div className="mb-4 inline-flex gap-1 rounded-full border border-border bg-surface p-1">
        {(["Hiragana", "Katakana"] as CharacterType[]).map((t) => (
          <button
            key={t}
            onClick={() => setActiveType(t)}
            className={`rounded-full px-5 py-1.5 text-sm font-medium transition-colors ${
              activeType === t
                ? "bg-primary text-white"
                : "text-foreground/60 hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mb-4 flex gap-2">
        <button
          onClick={openAddForm}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-hover"
        >
          + Thêm chữ mới
        </button>
        <button
          onClick={openBulkModal}
          className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-surface"
        >
          📋 Thêm hàng loạt
        </button>
      </div>

      {/* ---------- Form thêm/sửa 1 chữ ---------- */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 rounded-xl border border-border bg-surface p-5 shadow-sm"
        >
          <h2 className="mb-4 font-semibold">
            {editingId ? "Sửa chữ cái" : `Thêm chữ ${activeType} mới`}
          </h2>

          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-[9rem_1fr_1fr]">
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground/60">
                Chữ ({activeType})
              </label>
              <input
                value={form.char}
                onChange={(e) => setForm({ ...form, char: e.target.value })}
                placeholder={activeType === "Hiragana" ? "あ" : "ア"}
                style={jpFontStyle(form.char || (activeType === "Hiragana" ? "あ" : "ア"))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-center text-3xl focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground/60">
                Romaji
              </label>
              <input
                value={form.romaji}
                onChange={(e) => setForm({ ...form, romaji: e.target.value })}
                placeholder="a"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground/60">
                Nhóm biến âm
              </label>
              <select
                value={form.variantGroup}
                onChange={(e) =>
                  setForm({
                    ...form,
                    variantGroup: e.target.value as VariantGroup,
                  })
                }
                className="w-full rounded-lg border border-border bg-background px-3 py-2 focus:border-primary focus:outline-none"
              >
                {VARIANT_GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {formError && (
            <p className="mb-3 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
              {formError}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
            >
              {submitting ? "Đang lưu..." : editingId ? "Cập nhật" : "Tạo mới"}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="rounded-md border border-border px-4 py-2 text-sm hover:bg-background"
            >
              Hủy
            </button>
          </div>
        </form>
      )}

      {/* ---------- Danh sách ---------- */}
      {loading ? (
        <p className="text-center text-foreground/60">
          Đang tải danh sách...
        </p>
      ) : error ? (
        <p className="text-center text-danger">{error}</p>
      ) : characters.length === 0 ? (
        <p className="text-center text-foreground/60">
          Chưa có chữ nào trong bảng {activeType}.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-surface text-left text-xs font-medium uppercase tracking-wide text-foreground/50">
                <th className="px-6 py-3">Chữ</th>
                <th className="px-6 py-3">Romaji</th>
                <th className="px-6 py-3">Nhóm</th>
                <th className="px-6 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {characters.map((c) => (
                <tr
                  key={c.id}
                  className="border-t border-border text-sm transition-colors hover:bg-surface"
                >
                  <td
                    className="px-6 py-3 text-2xl"
                    style={jpFontStyle(c.char)}
                  >
                    {c.char}
                  </td>
                  <td className="px-6 py-3 text-foreground/80">{c.romaji}</td>
                  <td className="px-6 py-3">
                    <span className="rounded-full bg-secondary/10 px-2.5 py-1 text-xs font-medium text-secondary">
                      {c.variantGroup}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button
                      onClick={() => openEditForm(c)}
                      className="mr-4 text-sm font-medium text-primary hover:underline"
                    >
                      Sửa
                    </button>
                    <button
                      onClick={() => handleDelete(c)}
                      className="text-sm font-medium text-danger hover:underline"
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ---------- Modal "Thêm hàng loạt" ---------- */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-border bg-background p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Thêm hàng loạt</h2>
              <button
                onClick={closeBulkModal}
                className="text-foreground/50 hover:text-foreground"
              >
                ✕
              </button>
            </div>

            {/* Bước 1: nhập text */}
            {!bulkPreview && (
              <>
                <p className="mb-2 text-sm text-foreground/60">
                  Mỗi dòng theo định dạng:{" "}
                  <code className="rounded bg-surface px-1.5 py-0.5">
                    char|romaji|type|variantGroup
                  </code>
                </p>
                <p className="mb-3 text-xs text-foreground/50">
                  <code>type</code>: Hiragana / Katakana (bắt buộc, không phân
                  biệt hoa/thường). <code>variantGroup</code>:
                  Base/Dakuten/Handakuten/Youon/Sokuon (bỏ trống = Base).
                </p>
                <textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  rows={10}
                  placeholder={"あ|a|Hiragana|Base\nが|ga|hiragana|Dakuten\nア|a|Katakana"}
                  style={jpFontStyle(bulkText)}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm focus:border-primary focus:outline-none"
                />
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    onClick={closeBulkModal}
                    className="rounded-md border border-border px-4 py-2 text-sm hover:bg-surface"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleAnalyzeBulk}
                    disabled={!bulkText.trim() || bulkAnalyzing}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
                  >
                    {bulkAnalyzing ? "Đang phân tích..." : "Phân tích"}
                  </button>
                </div>
              </>
            )}

            {/* Bước 2: preview + checkbox từng dòng */}
            {bulkPreview && !bulkResult && (
              <div>
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
                    🟢 Hợp lệ: {bulkValidCount}
                  </span>
                  <span className="rounded-full bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning">
                    🟠 Trùng: {bulkDuplicateCount}
                  </span>
                  <span className="rounded-full bg-danger/10 px-2.5 py-1 text-xs font-medium text-danger">
                    🔴 Lỗi: {bulkInvalidCount}
                  </span>
                  <span className="ml-auto flex gap-3 text-xs">
                    <button
                      type="button"
                      onClick={() => selectAllBulk(true)}
                      className="text-primary hover:underline"
                    >
                      Chọn tất cả
                    </button>
                    <button
                      type="button"
                      onClick={() => selectAllBulk(false)}
                      className="text-foreground/50 hover:underline"
                    >
                      Bỏ chọn tất cả
                    </button>
                  </span>
                </div>

                <div className="mb-4 max-h-80 overflow-y-auto rounded-lg border border-border">
                  <table className="w-full border-collapse text-sm">
                    <thead className="sticky top-0">
                      <tr className="bg-surface text-left text-xs text-foreground/50">
                        <th className="px-3 py-2">Chọn</th>
                        <th className="px-3 py-2">Dòng</th>
                        <th className="px-3 py-2">Chữ</th>
                        <th className="px-3 py-2">Romaji</th>
                        <th className="px-3 py-2">Loại</th>
                        <th className="px-3 py-2">Nhóm</th>
                        <th className="px-3 py-2">Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkPreview.map((row, i) => (
                        <tr
                          key={i}
                          className={`border-t border-border ${
                            row.status === "invalid"
                              ? "bg-danger/5"
                              : row.status === "duplicate"
                              ? "bg-warning/5"
                              : ""
                          }`}
                        >
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={row.selected}
                              disabled={row.status === "invalid"}
                              onChange={() => toggleBulkRowSelected(i)}
                            />
                          </td>
                          <td className="px-3 py-2 text-foreground/50">
                            {row.lineNumber}
                          </td>
                          <td
                            className="px-3 py-2 text-lg"
                            style={jpFontStyle(row.char)}
                          >
                            {row.char || "—"}
                          </td>
                          <td className="px-3 py-2">{row.romaji || "—"}</td>
                          <td className="px-3 py-2">{row.type ?? "—"}</td>
                          <td className="px-3 py-2">
                            {row.variantGroup ?? "—"}
                          </td>
                          <td className="px-3 py-2 text-xs">
                            {row.status === "invalid" && (
                              <span className="text-danger">{row.reason}</span>
                            )}
                            {row.status === "duplicate" && (
                              <span className="text-warning">{row.reason}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between">
                  <button
                    onClick={() => setBulkPreview(null)}
                    className="rounded-md border border-border px-4 py-2 text-sm hover:bg-surface"
                  >
                    ← Sửa lại text
                  </button>
                  <button
                    onClick={handleSubmitBulk}
                    disabled={bulkSubmitting || bulkSelectedCount === 0}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
                  >
                    {bulkSubmitting
                      ? "Đang tạo..."
                      : `Tạo ${bulkSelectedCount} chữ đã chọn`}
                  </button>
                </div>
              </div>
            )}

            {/* Bước 3: kết quả */}
            {bulkResult && (
              <div>
                <p className="mb-3 text-sm">
                  Đã tạo thành công{" "}
                  <span className="font-semibold text-success">
                    {bulkResult.success}
                  </span>{" "}
                  chữ
                  {bulkResult.failed > 0 && (
                    <>
                      {" "}
                      —{" "}
                      <span className="font-semibold text-danger">
                        {bulkResult.failed}
                      </span>{" "}
                      dòng lỗi khi tạo
                    </>
                  )}
                  .
                </p>
                {bulkResult.errors.length > 0 && (
                  <ul className="mb-4 max-h-40 list-disc space-y-1 overflow-y-auto rounded-lg border border-danger/30 bg-danger/5 p-3 pl-6 text-sm text-danger">
                    {bulkResult.errors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                )}
                <div className="flex justify-end">
                  <button
                    onClick={closeBulkModal}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}