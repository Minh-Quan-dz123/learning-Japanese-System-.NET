# ===== Stage 1: Build =====
# SDK image có đủ công cụ build (compiler, NuGet...) — giống việc cài JDK đầy đủ để build, khác với JRE chỉ để chạy
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy riêng từng file .csproj trước (chưa copy code) để tận dụng Docker layer cache:
# nếu code (.cs) đổi nhưng .csproj không đổi, bước "restore" bên dưới không phải chạy lại từ đầu — giống việc
# tách riêng bước "npm install" (dựa vào package.json) khỏi bước "copy code" trong 1 Dockerfile Node.js.
COPY JapaneseLearning.Domain/*.csproj JapaneseLearning.Domain/
COPY JapaneseLearning.Application/*.csproj JapaneseLearning.Application/
COPY JapaneseLearning.Infrastructure/*.csproj JapaneseLearning.Infrastructure/
COPY JapaneseLearning.Api/*.csproj JapaneseLearning.Api/

RUN dotnet restore JapaneseLearning.Api/JapaneseLearning.Api.csproj

# Giờ mới copy toàn bộ code thật
COPY . .

# Build + publish ra thư mục /app/publish (bản Release, đã tối ưu, không kèm debug symbol thừa)
RUN dotnet publish JapaneseLearning.Api/JapaneseLearning.Api.csproj -c Release -o /app/publish --no-restore

# ===== Stage 2: Runtime =====
# aspnet image (không phải sdk) — chỉ đủ để CHẠY app, không có compiler → image nhẹ hơn nhiều,
# giống việc deploy production chỉ cần JRE, không cần cả bộ JDK.
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

# Render set PORT lúc chạy container — dùng shell form (không phải dạng mảng ["..."]) để $PORT được thay giá trị thật
CMD ASPNETCORE_URLS=http://0.0.0.0:${PORT:-10000} dotnet JapaneseLearning.Api.dll