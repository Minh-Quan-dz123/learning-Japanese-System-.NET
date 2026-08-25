import apiClient from "./axios";
import { PagedResult } from "@/types/vocabulary"; // dùng lại type generic đã có sẵn
import {
  SubmitPracticeSessionRequest,
  PracticeSessionResultDto,
  PracticeSessionSummaryDto,
  PracticeSessionDetailDto,
} from "@/types/practiceSession";

// Backend tự chấm điểm (không tin isCorrect từ FE) — FE chỉ gửi lựa chọn thô.
export async function submitPracticeSession(
  data: SubmitPracticeSessionRequest
): Promise<PracticeSessionResultDto> {
  const res = await apiClient.post<PracticeSessionResultDto>("/api/practice-sessions", data);
  return res.data;
}

export async function getMyPracticeSessions(
  page = 1,
  pageSize = 20
): Promise<PagedResult<PracticeSessionSummaryDto>> {
  const res = await apiClient.get<PagedResult<PracticeSessionSummaryDto>>(
    "/api/practice-sessions/me",
    { params: { page, pageSize } }
  );
  return res.data;
}

export async function getPracticeSessionDetail(id: string): Promise<PracticeSessionDetailDto> {
  const res = await apiClient.get<PracticeSessionDetailDto>(`/api/practice-sessions/${id}`);
  return res.data;
}