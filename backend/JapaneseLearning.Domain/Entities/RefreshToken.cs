namespace JapaneseLearning.Domain.Entities
{
    public class RefreshToken
    {
        public required Guid Id { get; set; }

        public required Guid UserId { get; set; }

        public required string TokenHash { get; set; }

        public required DateTime ExpiresAt { get; set; }

        public DateTime? RevokedAt { get; set; }
    }
// UserId — chỉ lưu Guid (id thô), chưa link object User đầy đủ, đủ dùng ở tầng Domain lúc này.
// RevokedAt là DateTime? (có dấu ?) và không có required — vì nullable nghĩa là được phép để trống lúc tạo object, ngược với ý nghĩa của required.
}