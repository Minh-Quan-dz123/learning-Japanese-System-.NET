# Backend — ASP.NET 8 Web API (Clean Architecture)

Khung project (`.csproj`) đã được tạo sẵn ở `src/Domain`, `src/Application`, `src/Infrastructure`, `src/Api`.
File `.sln` (solution — giống 1 "workspace" gom nhiều project lại để build cùng lúc trong Visual Studio/Rider)
**chưa được tạo** vì cần lệnh `dotnet` thật để sinh đúng định dạng.

## Việc cần làm trên máy mày (có `dotnet` SDK + mạng)

Chạy tuần tự từ thư mục `backend/`:

```bash
# 1. Tạo file solution rỗng
dotnet new sln -n JapaneseLearning

# 2. Gom cả 4 project vào solution (dấu ** quét mọi thư mục con)
dotnet sln add src/**/*.csproj

# 3. Kiểm tra đã build được chưa (Api project hiện chưa có Program.cs
#    nên bước này sẽ báo lỗi thiếu entry point — là bình thường ở giai đoạn khung sườn)
dotnet build
```

## Tại sao tách 4 project thay vì 1 project duy nhất?

Giống việc thay vì viết 1 file `.cpp` khổng lồ chứa hết mọi thứ, mày tách thành nhiều
`.h`/`.cpp` theo module rồi biên dịch riêng — ở đây .NET gọi mỗi "module" là 1 **project** (`.csproj`),
nhiều project gộp lại thành 1 **solution** (`.sln`).

Chiều phụ thuộc (project nào được `ProjectReference` tới project nào) đi 1 chiều:

```
Api → Application, Infrastructure
Infrastructure → Application
Application → Domain
Domain → (không phụ thuộc gì)
```

Domain không biết PostgreSQL/HTTP là gì; Application không biết PostgreSQL là gì (chỉ định nghĩa
`interface`, giống 1 `abstract class`/`interface` Java); Infrastructure mới thực sự `implement`
các interface đó bằng Entity Framework Core. Nhờ vậy sau này đổi PostgreSQL sang DB khác,
chỉ sửa Infrastructure — Domain/Application không cần đụng vào.

## Việc còn thiếu (sẽ làm ở các bước sau, không tự ý làm khi chưa hỏi)

- [ ] `Program.cs` trong `Api` (entry point + cấu hình DI, middleware, JWT)
- [ ] `appsettings.json` (connection string Postgres, JWT secret...)
- [ ] Entity trong `Domain` theo `erd.md` (User, Topic, Vocabulary, Character, PracticeSession, PracticeAnswer, RefreshToken)
- [ ] `DbContext` trong `Infrastructure` (Entity Framework Core)
- [ ] Controllers trong `Api` theo `api_design.md`
- [ ] Cài package: `Microsoft.EntityFrameworkCore`, `Npgsql.EntityFrameworkCore.PostgreSQL`, JWT libraries
