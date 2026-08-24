using Microsoft.EntityFrameworkCore;
using JapaneseLearning.Domain.Entities;

namespace JapaneseLearning.Infrastructure.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<User> Users => Set<User>();
        public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
        public DbSet<Character> Characters => Set<Character>();
        public DbSet<PracticeSession> PracticeSessions => Set<PracticeSession>();
        public DbSet<PracticeAnswer> PracticeAnswers => Set<PracticeAnswer>();
        public DbSet<Topic> Topics => Set<Topic>();
        public DbSet<Vocabulary> Vocabularies => Set<Vocabulary>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // ---- Users → RefreshTokens (1-n, Cascade) ----
            modelBuilder.Entity<RefreshToken>()
                .HasOne<User>()
                .WithMany()
                .HasForeignKey(rt => rt.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // ---- Users → Topics (1-n, Cascade) ----
            modelBuilder.Entity<Topic>()
                .HasOne<User>()
                .WithMany()
                .HasForeignKey(t => t.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // ---- Topics → Vocabularies (1-n, Cascade — đã chốt trong erd.md) ----
            modelBuilder.Entity<Vocabulary>()
                .HasOne<Topic>()
                .WithMany()
                .HasForeignKey(v => v.TopicId)
                .OnDelete(DeleteBehavior.Cascade);

            // ---- Users → PracticeSessions (1-n, Cascade) ----
            modelBuilder.Entity<PracticeSession>()
                .HasOne<User>()
                .WithMany()
                .HasForeignKey(ps => ps.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // ---- PracticeSessions → PracticeAnswers (1-n, Cascade) ----
            modelBuilder.Entity<PracticeAnswer>()
                .HasOne<PracticeSession>()
                .WithMany()
                .HasForeignKey(pa => pa.SessionId)
                .OnDelete(DeleteBehavior.Cascade);

            // ---- Characters → PracticeAnswers qua CharacterId (1-n, SetNull — đã chốt trong erd.md) ----
            modelBuilder.Entity<PracticeAnswer>()
                .HasOne<Character>()
                .WithMany()
                .HasForeignKey(pa => pa.CharacterId)
                .OnDelete(DeleteBehavior.SetNull);

            // ---- Characters → PracticeAnswers qua SelectedCharacterId (1-n, SetNull) ----
            // Dùng chung bảng Characters nhưng khác cột FK — EF cho phép nhiều quan hệ
            // riêng biệt tới cùng 1 bảng miễn là HasForeignKey trỏ đúng cột khác nhau.
            modelBuilder.Entity<PracticeAnswer>()
                .HasOne<Character>()
                .WithMany()
                .HasForeignKey(pa => pa.SelectedCharacterId)
                .OnDelete(DeleteBehavior.SetNull);
        }
    }
}

// DbContext — kế thừa từ class DbContext của EF Core, giống extends trong Java hoặc : public DbContext trong C++ (C# dùng dấu : cho cả kế thừa class lẫn implement interface, không tách riêng extends/implements như Java).
// Constructor nhận DbContextOptions<AppDbContext> options — đây là nơi EF Core "tiêm" (inject) thông tin cấu hình (connection string, loại DB dùng...) vào lúc khởi tạo. Việc thật sự cấu hình "dùng PostgreSQL, connection string là gì" sẽ làm ở Program.cs bên Api (bước D), không làm trong file này — giữ đúng nguyên tắc tách biệt.
// DbSet<User> Users => Set<User>(); — đây là cú pháp "expression-bodied property" của C# (dấu => thay cho { get { return ...; } }). Mỗi dòng này khai báo "bảng Users tương ứng với entity User". EF Core sẽ tự suy ra tên bảng SQL là Users (số nhiều) trừ khi mày cấu hình khác đi sau này.
//.HasOne<Character>().WithMany() — nghĩa là "1 Character có nhiều PracticeAnswer trỏ tới nó, nhưng Character không cần giữ List<PracticeAnswer> ngược lại" — giống 1 quan hệ 1 chiều, chỉ bên con (PracticeAnswer) biết cha là ai, cha không cần biết có bao nhiêu con (tránh vòng lặp tham chiếu không cần thiết, đỡ phải sửa thêm Character.cs).
// .OnDelete(DeleteBehavior.SetNull) — sinh ra đúng câu SQL ON DELETE SET NULL trong Postgres.
// Vì CharacterId/SelectedCharacterId đều là Guid? (nullable) sẵn trong entity, EF Core tự hiểu cột đó cho phép NULL — khớp yêu cầu bắt buộc của SetNull (cột phải nullable mới dùng được).