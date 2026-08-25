// Khớp TopicDto ở Backend (Application/Features/Topics/Dtos/TopicDto.cs)
export interface TopicDto {
  id: string;
  name: string;
  wordCount: number;
  lastModifiedAt: string | null; // null nếu chưa từng sửa từ nào (xem DECISIONS_LOG.md 2026-08-24)
  createdAt: string;
}

export interface CreateTopicRequest {
  name: string;
}

export interface UpdateTopicRequest {
  name: string;
}