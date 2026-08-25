import apiClient from "./axios";
import { TopicDto, CreateTopicRequest, UpdateTopicRequest } from "@/types/topic";

export async function getTopics(): Promise<TopicDto[]> {
  const res = await apiClient.get<TopicDto[]>("/api/topics");
  return res.data;
}

export async function createTopic(data: CreateTopicRequest): Promise<TopicDto> {
  const res = await apiClient.post<TopicDto>("/api/topics", data);
  return res.data;
}

export async function updateTopic(id: string, data: UpdateTopicRequest): Promise<TopicDto> {
  const res = await apiClient.put<TopicDto>(`/api/topics/${id}`, data);
  return res.data;
}

export async function deleteTopic(id: string): Promise<void> {
  await apiClient.delete(`/api/topics/${id}`);
}