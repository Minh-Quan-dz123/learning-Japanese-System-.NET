"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { TopicDto } from "@/types/topic";
import { getTopics, createTopic, updateTopic, deleteTopic } from "@/lib/topicApi";
import { getApiErrorMessage } from "@/lib/apiError";

export default function TopicsPage() {
  const { user, isLoading } = useAuth();

  const [topics, setTopics] = useState<TopicDto[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading || !user) return;
    loadTopics();
  }, [isLoading, user]);

  async function loadTopics() {
    setLoadingTopics(true);
    setLoadError(null);
    try {
      setTopics(await getTopics());
    } catch (err) {
      setLoadError(getApiErrorMessage(err, "Không tải được danh sách chủ đề"));
    } finally {
      setLoadingTopics(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setIsCreating(true);
    try {
      const created = await createTopic({ name: newName });
      setTopics((prev) => [...prev, created]);
      setNewName("");
    } catch (err) {
      setCreateError(getApiErrorMessage(err, "Tạo chủ đề thất bại"));
    } finally {
      setIsCreating(false);
    }
  }

  function startEdit(topic: TopicDto) {
    setEditingId(topic.id);
    setEditingName(topic.name);
    setEditError(null);
  }

  async function handleSaveEdit(id: string) {
    setEditError(null);
    try {
      const updated = await updateTopic(id, { name: editingName });
      setTopics((prev) => prev.map((t) => (t.id === id ? updated : t)));
      setEditingId(null);
    } catch (err) {
      setEditError(getApiErrorMessage(err, "Sửa tên thất bại"));
    }
  }

  async function handleConfirmDelete(id: string) {
    try {
      await deleteTopic(id);
      setTopics((prev) => prev.filter((t) => t.id !== id));
      setDeletingId(null);
    } catch (err) {
      alert(getApiErrorMessage(err, "Xóa chủ đề thất bại"));
      setDeletingId(null);
    }
  }

  if (isLoading) return <p className="p-6">Đang tải...</p>;
  if (!user) {
    return (
      <p className="p-6">
        Bạn chưa đăng nhập. <Link href="/login" className="text-blue-600 underline">Đăng nhập</Link>
      </p>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Chủ đề từ vựng</h1>
        <Link href="/vocabularies/practice" className="bg-green-600 text-white px-4 py-2 rounded text-sm">
          Luyện tập điền đáp án
        </Link>
      </div>

      <form onSubmit={handleCreate} className="flex gap-2 mb-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Tên chủ đề mới"
          className="border rounded px-3 py-2 flex-1"
          required
        />
        <button type="submit" disabled={isCreating} className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50">
          {isCreating ? "Đang tạo..." : "Tạo"}
        </button>
      </form>
      {createError && <p className="text-red-600 text-sm mb-4">{createError}</p>}

      {loadingTopics && <p>Đang tải danh sách...</p>}
      {loadError && <p className="text-red-600">{loadError}</p>}
      {!loadingTopics && !loadError && topics.length === 0 && (
        <p className="text-gray-500">Chưa có chủ đề nào.</p>
      )}

      <ul className="divide-y">
        {topics.map((topic) => (
          <li key={topic.id} className="py-3">
            {editingId === topic.id ? (
              <div className="flex gap-2 items-center flex-wrap">
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="border rounded px-2 py-1 flex-1"
                />
                <button onClick={() => handleSaveEdit(topic.id)} className="text-blue-600">Lưu</button>
                <button onClick={() => setEditingId(null)} className="text-gray-500">Hủy</button>
                {editError && <p className="text-red-600 text-sm w-full">{editError}</p>}
              </div>
            ) : deletingId === topic.id ? (
              <div className="flex gap-2 items-center flex-wrap">
                <span>Xóa &quot;{topic.name}&quot; và toàn bộ từ vựng bên trong?</span>
                <button onClick={() => handleConfirmDelete(topic.id)} className="text-red-600 font-semibold">
                  Xác nhận xóa
                </button>
                <button onClick={() => setDeletingId(null)} className="text-gray-500">Hủy</button>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <Link href={`/topics/${topic.id}`} className="flex-1">
                  <p className="font-medium">{topic.name}</p>
                  <p className="text-sm text-gray-500">
                    {topic.wordCount} từ
                    {topic.lastModifiedAt && ` · sửa gần nhất ${new Date(topic.lastModifiedAt).toLocaleString("vi-VN")}`}
                  </p>
                </Link>
                <div className="flex gap-3">
                  <button onClick={() => startEdit(topic)} className="text-blue-600 text-sm">Sửa tên</button>
                  <button onClick={() => setDeletingId(topic.id)} className="text-red-600 text-sm">Xóa</button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}