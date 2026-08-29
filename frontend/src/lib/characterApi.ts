import apiClient from "./axios";
import {
  CharacterDto,
  CharacterType,
  CharacterStatDto,
  CreateCharacterRequest,
  UpdateCharacterRequest,
} from "@/types/character";

export async function getCharacters(type?: CharacterType): Promise<CharacterDto[]> {
  const res = await apiClient.get<CharacterDto[]>("/api/characters", {
    params: type ? { type } : undefined,
  });
  return res.data;
}

// Thống kê tỉ lệ sai của CHÍNH user đang đăng nhập (route /me — không truyền userId
// qua query, backend tự lấy từ JWT, đúng nguyên tắc IDOR ở ARCHITECTURE.md mục 4.1).
export async function getMyCharacterStats(): Promise<CharacterStatDto[]> {
  const res = await apiClient.get<CharacterStatDto[]>("/api/characters/stats/me");
  return res.data;
}

// ==== THÊM MỚI cho Admin quản lý bảng chữ cái ====

// POST /api/characters — chỉ Admin gọi được, Backend tự trả 403 nếu không phải Admin
export async function createCharacter(
  data: CreateCharacterRequest
): Promise<CharacterDto> {
  const res = await apiClient.post<CharacterDto>("/api/characters", data);
  return res.data;
}

// PUT /api/characters/{id}
export async function updateCharacter(
  id: string,
  data: UpdateCharacterRequest
): Promise<CharacterDto> {
  const res = await apiClient.put<CharacterDto>(`/api/characters/${id}`, data);
  return res.data;
}

// DELETE /api/characters/{id}
export async function deleteCharacter(id: string): Promise<void> {
  await apiClient.delete(`/api/characters/${id}`);
}