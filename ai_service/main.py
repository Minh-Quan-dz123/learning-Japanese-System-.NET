"""
AI Service - nhận diện chữ viết tay (hiragana/katakana).

File này hiện chỉ là khung sườn (giống 1 file main.cpp chỉ có hàm main() in "Hello World"
để chắc chắn build/run pipeline hoạt động, trước khi viết logic thật).

Endpoint thật (/recognize) sẽ được Backend (ASP.NET) gọi qua HTTP nội bộ trong docker network,
theo hợp đồng mô tả ở api_design.md mục 3 (POST /api/writing/recognize) -- lưu ý FE không gọi
thẳng vào đây, luôn đi qua Backend trước (xem ARCHITECTURE.md mục 6).
"""

from fastapi import FastAPI

app = FastAPI(title="Japanese Learning - AI Service")


@app.get("/health")
def health_check():
    """Dùng để Docker Compose / CI kiểm tra service đã sống chưa."""
    return {"status": "ok"}


# TODO: thêm POST /recognize khi có quyết định dùng model/thư viện nhận diện nào.
