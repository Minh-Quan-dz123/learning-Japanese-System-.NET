đã cài 3 package : 
- dotnet add package Microsoft.EntityFrameworkCore -v 8.0.10 
- dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL -v 8.0.10 
- dotnet add package Microsoft.EntityFrameworkCore.Design -v 8.0.10

- Microsoft.EntityFrameworkCore — thư viện lõi của EF Core.
- Npgsql.EntityFrameworkCore.PostgreSQL — driver riêng cho PostgreSQL (EF Core lõi không biết PostgreSQL là gì, cần driver riêng — giống JDBC driver riêng cho từng loại DB bên Java).
- Microsoft.EntityFrameworkCore.Design — công cụ hỗ trợ chạy lệnh tạo migration (nói ở bước D).