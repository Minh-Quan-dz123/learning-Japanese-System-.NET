// Khớp với response mẫu ở api_design.md mục 2 "GET /api/characters?type=hiragana"
// Lưu ý: id thật là uuid (string) — DB dùng Guid theo erd.md mục 3.3,
// ví dụ trong tài liệu ghi "id: 1" chỉ là số minh họa, không phải type thật.
export type CharacterType = "Hiragana" | "Katakana";

export type VariantGroup = "Base" | "Dakuten" | "Handakuten" | "Youon" | "Sokuon";

export interface CharacterDto {
  id: string;
  char: string;
  romaji: string;
  type: CharacterType;
  variantGroup: VariantGroup;
}

// ⚠️ GIẢ ĐỊNH — chưa xác nhận qua code C# thật (thiếu file CharacterMiniDto.cs).
// Suy luận từ PROJECT_STATUS.md: "tự tra cứu Character hàng loạt ... để hiển thị
// Char/Romaji khi review". Cần dán CharacterMiniDto.cs để xác nhận lại trước khi
// code màn hình review (chưa ảnh hưởng bước hiện tại: màn hình thiết lập + chơi).
export interface CharacterMiniDto {
  id: string;
  char: string;
  romaji: string;
}

export interface CharacterStatDto {
  characterId: string;
  char: string;
  romaji: string;
  totalAnswered: number;
  wrongCount: number;
  wrongRate: number; // double từ C# — vẫn cần xác nhận là tỉ lệ 0..1 hay phần trăm 0..100 lúc test runtime
}

// thêm mới cho admin làm CRUD
export interface CreateCharacterRequest {
  char: string;
  romaji: string;
  type: CharacterType;
  variantGroup: VariantGroup;
}

export interface UpdateCharacterRequest {
  char: string;
  romaji: string;
  type: CharacterType;
  variantGroup: VariantGroup;
}