namespace JapaneseLearning.Domain.Entities
{
    public class User
    {
        // required Guid Id - bắt buộc phải gán khi tạo object, kiểu UUID
        public required Guid Id { get; set; }

        public required string Username { get; set; }

        public required string PasswordHash { get; set; }

        public required UserRole Role { get; set; }

        public required DateTime CreatedAt { get; set; }
    }

    public enum UserRole
    {
        Admin, // = 0
        User // 1
    }
}