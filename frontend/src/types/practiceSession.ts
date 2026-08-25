import { CharacterMiniDto } from "./character";

// api_design.md mục 2: moduleType hiện tại chỉ có 1 giá trị.
export type ModuleType = "AlphabetQuiz";

// 4 hướng theo README.md — hiragana/katakana <-> romaji.
// ⚠️ Tên chuỗi chính xác lấy từ ví dụ ở api_design.md ("HiraganaToRomaji"...),
// nên xác nhận qua Swagger enum thật (backend dùng `direction: string`, không
// phải enum C# — có thể có validate riêng ở Service, chưa xem qua code).
export type Direction =
  | "HiraganaToRomaji"
  | "RomajiToHiragana"
  | "KatakanaToRomaji"
  | "RomajiToKatakana";

// --- Request khi nộp bài (POST /api/practice-sessions) ---

export interface SubmitAnswerDto {
  characterId: string;
  selectedCharacterId: string | null;
}

export interface SubmitPracticeSessionRequest {
  moduleType: ModuleType;
  direction: Direction;
  timePerQuestionSec: number;
  maxMistakes: number;
  answers: SubmitAnswerDto[];
}

// --- Response khi nộp bài — backend đã tự chấm điểm ---

export interface AnswerResultDto {
  characterId: string;
  selectedCharacterId: string | null;
  isCorrect: boolean;
}

export interface PracticeSessionResultDto {
  id: string;
  score: number;
  totalQuestions: number;
  createdAt: string;
  results: AnswerResultDto[];
}

// --- GET /api/practice-sessions/me — danh sách lịch sử (rút gọn) ---

export interface PracticeSessionSummaryDto {
  id: string;
  moduleType: ModuleType;
  direction: Direction;
  score: number;
  totalQuestions: number;
  createdAt: string;
}

// --- GET /api/practice-sessions/{id} — chi tiết để review từng câu ---

export interface PracticeAnswerDetailDto {
  answerOrder: number;
  // null khi Admin đã xóa chữ cái này khỏi hệ thống (ON DELETE SET NULL, erd.md mục 3.5)
  character: CharacterMiniDto | null;
  selectedCharacter: CharacterMiniDto | null;
  isCorrect: boolean;
}

export interface PracticeSessionDetailDto {
  id: string;
  moduleType: ModuleType;
  direction: Direction;
  timePerQuestionSec: number;
  maxMistakes: number;
  score: number;
  totalQuestions: number;
  createdAt: string;
  answers: PracticeAnswerDetailDto[];
}