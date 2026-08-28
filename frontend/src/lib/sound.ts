// Phát 1 file mp3 trong public/sounds/ — không await, lỗi (VD trình duyệt chặn
// autoplay lúc chưa có tương tác) chỉ log ngầm, không làm hỏng luồng chơi.
//
// Dùng chung cho Module 1 (alphabet/page.tsx) và Module 3
// (vocabularies/practice/page.tsx) — tách ra từ 2 bản định nghĩa trùng lặp
// (xem DECISIONS_LOG.md / PROJECT_STATUS.md mục 3.4).
export function playSound(name: "correct" | "wrong" | "finish") {
  try {
    const audio = new Audio(`/sounds/${name}.mp3`);
    void audio.play().catch(() => {});
  } catch {
    // môi trường không hỗ trợ Audio (VD SSR) — bỏ qua
  }
}