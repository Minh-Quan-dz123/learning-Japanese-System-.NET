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