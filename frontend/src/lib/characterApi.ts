import apiClient from "./axios";
import { CharacterDto, CharacterType, CharacterStatDto } from "@/types/character";

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