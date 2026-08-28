import apiClient from "./axios";
import {
  VocabularyDto,
  CreateVocabularyRequest,
  UpdateVocabularyRequest,
  CheckDuplicateRequest,
  CheckDuplicateResponse,
  PagedResult,
  PracticePrepareRequest,
  PracticePrepareResponse,
} from "@/types/vocabulary";

export async function getVocabulariesByTopic(
  topicId: string,
  search = "",
  page = 1,
  pageSize = 20
): Promise<PagedResult<VocabularyDto>> {
  const res = await apiClient.get<PagedResult<VocabularyDto>>(
    `/api/topics/${topicId}/vocabularies`,
    { params: { search: search || undefined, page, pageSize } }
  );
  return res.data;
}

/**
 * Lấy TOÀN BỘ từ vựng của 1 chủ đề, tự lặp qua hết các trang.
 * Khác với getVocabulariesByTopic() (chỉ lấy đúng 1 trang, dùng cho hiển thị UI) —
 * hàm này dùng riêng cho Export Excel, nơi bắt buộc phải có đủ dữ liệu,
 * không được thiếu nếu chủ đề có nhiều hơn 1 trang.
 */
export async function getAllVocabulariesByTopic(topicId: string): Promise<VocabularyDto[]> {
  const pageSize = 100;
  let page = 1;
  const all: VocabularyDto[] = [];

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const result = await getVocabulariesByTopic(topicId, "", page, pageSize);
    all.push(...result.items);
    if (page >= result.totalPages || result.items.length === 0) break;
    page++;
  }

  return all;
}

/**
 * Tìm kiếm từ vựng trên TOÀN BỘ chủ đề của user đang đăng nhập (api_design.md mục 4.2).
 * ⚠️ Giả định response trả về PagedResult<VocabularyDto> — khớp pattern các API
 * phân trang khác trong dự án, nhưng CHƯA có mẫu response cụ thể trong api_design.md
 * để đối chiếu 100%. Rủi ro thấp: nếu sai shape, TypeScript báo lỗi biên dịch ngay,
 * không phải lỗi runtime âm thầm — cần xác nhận lại khi test runtime.
 */
export async function searchVocabularies(
  q: string,
  page = 1,
  pageSize = 20
): Promise<PagedResult<VocabularyDto>> {
  const res = await apiClient.get<PagedResult<VocabularyDto>>("/api/vocabularies/search", {
    params: { q, page, pageSize },
  });
  return res.data;
}

export async function checkDuplicate(data: CheckDuplicateRequest): Promise<CheckDuplicateResponse> {
  const res = await apiClient.post<CheckDuplicateResponse>("/api/vocabularies/check-duplicate", data);
  return res.data;
}

export async function createVocabulary(data: CreateVocabularyRequest): Promise<VocabularyDto> {
  const res = await apiClient.post<VocabularyDto>("/api/vocabularies", data);
  return res.data;
}

export async function updateVocabulary(id: string, data: UpdateVocabularyRequest): Promise<VocabularyDto> {
  const res = await apiClient.put<VocabularyDto>(`/api/vocabularies/${id}`, data);
  return res.data;
}

export async function deleteVocabulary(id: string): Promise<void> {
  await apiClient.delete(`/api/vocabularies/${id}`);
}

// Chế độ luyện tập điền đáp án — chỉ gọi ĐÚNG 1 LẦN lúc bắt đầu ván (api_design.md
// mục 4.3), không gọi lại API nào khác trong lúc chơi.
export async function prepareVocabularyPractice(
  data: PracticePrepareRequest
): Promise<PracticePrepareResponse> {
  const res = await apiClient.post<PracticePrepareResponse>(
    "/api/vocabularies/practice/prepare",
    data
  );
  return res.data;
}