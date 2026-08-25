export interface VocabularyDto {
  id: string;
  topicId: string;
  hiragana: string | null;
  katakana: string | null;
  kanji: string | null;
  romaji: string;
  meaning: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVocabularyRequest {
  topicId: string;
  hiragana?: string | null;
  katakana?: string | null;
  kanji?: string | null;
  romaji: string;
  meaning: string;
  note?: string | null;
}

export interface UpdateVocabularyRequest {
  topicId?: string;
  hiragana?: string | null;
  katakana?: string | null;
  kanji?: string | null;
  romaji: string;
  meaning: string;
  note?: string | null;
}

export interface CheckDuplicateRequest {
  romaji: string;
  meaning: string;
}

export interface CheckDuplicateResponse {
  exists: boolean;
  existing?: {
    id: string;
    topicId: string;
    hiragana: string | null;
    romaji: string;
    meaning: string;
    matchedMeaning: string;
  };
}

// ⚠️ GIẢ ĐỊNH — chưa xác nhận đúng shape thật từ Backend, xem ghi chú đầu câu trả lời
export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
export interface VocabularyDto {
  id: string;
  topicId: string;
  hiragana: string | null;
  katakana: string | null;
  kanji: string | null;
  romaji: string;
  meaning: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVocabularyRequest {
  topicId: string;
  hiragana?: string | null;
  katakana?: string | null;
  kanji?: string | null;
  romaji: string;
  meaning: string;
  note?: string | null;
}

export interface UpdateVocabularyRequest {
  topicId?: string;
  hiragana?: string | null;
  katakana?: string | null;
  kanji?: string | null;
  romaji: string;
  meaning: string;
  note?: string | null;
}

export interface CheckDuplicateRequest {
  romaji: string;
  meaning: string;
}

export interface CheckDuplicateResponse {
  exists: boolean;
  existing?: {
    id: string;
    topicId: string;
    hiragana: string | null;
    romaji: string;
    meaning: string;
    matchedMeaning: string;
  };
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// --- Chế độ luyện tập điền đáp án (POST /api/vocabularies/practice/prepare) ---
// Khớp shape đã chốt ở DECISIONS_LOG.md (2026-08-25) — sourceMode LUÔN là object,
// không phải "string hoặc object" như bản api_design.md gốc.

export type PracticeField = "Hiragana" | "Katakana" | "Kanji" | "Romaji" | "Meaning";

export type PracticeSourceMode =
  | { type: "All" }
  | { type: "PercentRecent"; percent: number }
  | { type: "CountRecent"; count: number };

export interface PracticePrepareRequest {
  topicIds: string[];
  questionField: PracticeField;
  answerField: PracticeField;
  sourceMode: PracticeSourceMode;
}

export interface PracticePrepareResponse {
  totalConsidered: number;
  totalEligible: number;
  // Backend đã lọc sẵn — words chỉ chứa các từ ĐỦ điều kiện (có cả questionField
  // lẫn answerField), dùng thẳng VocabularyDto (10 field), không phải DTO rút gọn.
  words: VocabularyDto[];
}